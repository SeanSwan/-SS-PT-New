// backend/routes/clientProgressRoutes.mjs
import express from 'express';
import { Op } from 'sequelize';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';
import { getClientPainEntry, getClientProgress, getGoal, getUser, getWorkoutSession } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';

function sendInternalError(res, message) {
  return res.status(500).json({
    success: false,
    message,
    error: INTERNAL_ERROR,
  });
}

function sendBadRequest(res, message) {
  return res.status(400).json({
    success: false,
    message,
  });
}

function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

// ─────────────────────────────────────────────────────────────
// Workout history helpers (exported for unit tests)
// ─────────────────────────────────────────────────────────────

export const parseWorkoutHistoryTimeframe = (timeframe) => {
  switch (String(timeframe || '').toLowerCase()) {
    case '1month': return 30;
    case '3months': return 90;
    case '6months': return 180;
    case '1year': return 365;
    case 'all': return null;
    default: return 90;
  }
};

export const toWorkoutHistoryEntry = (session) => {
  const raw = session?.toJSON ? session.toJSON() : session;
  const dateValue = raw?.date ? new Date(raw.date) : null;
  const isoDate = dateValue && !Number.isNaN(dateValue.getTime())
    ? dateValue.toISOString().split('T')[0]
    : null;
  return {
    date: isoDate,
    type: raw?.title || 'Workout',
    duration: Number.isFinite(raw?.duration) ? raw.duration : 0,
    intensity: Number.isFinite(raw?.intensity) ? raw.intensity : 0,
    notes: raw?.notes || undefined,
  };
};

const COMPARISON_TYPES = new Set(['average', 'clients', 'historical', 'goals']);
const COMPARISON_LEVEL_FIELDS = [
  { name: 'Overall Level', field: 'overallLevel' },
  { name: 'Core Level', field: 'coreLevel' },
  { name: 'Balance Level', field: 'balanceLevel' },
  { name: 'Stability Level', field: 'stabilityLevel' },
  { name: 'Flexibility Level', field: 'flexibilityLevel' },
];

const parseComparisonType = (value) => {
  const normalized = String(value || 'average').toLowerCase();
  return COMPARISON_TYPES.has(normalized) ? normalized : 'average';
};

const toPercentScore = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed / 10)));
};

const mean = (values) => {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length === 0) return 0;
  return Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length);
};

const percentileFor = (clientScore, scores) => {
  const clean = scores.filter((value) => Number.isFinite(value));
  if (clean.length === 0) return null;
  const atOrBelow = clean.filter((value) => value <= clientScore).length;
  return Math.max(1, Math.min(99, Math.round((atOrBelow / clean.length) * 100)));
};

export const buildComparisonAnalytics = ({
  clientProgress,
  cohortProgress,
  comparisonType,
  timeframe
}) => {
  const type = parseComparisonType(comparisonType);
  const cohort = Array.isArray(cohortProgress) ? cohortProgress : [];

  if (type === 'historical' || type === 'goals') {
    return {
      comparisonType: type,
      title: type === 'historical' ? 'Personal History' : 'Target Goals',
      subtitle: type === 'historical'
        ? 'Historical comparison requires stored progress snapshots; none are available yet.'
        : 'Goal comparison requires client goal targets; none were returned for this client yet.',
      metrics: [],
      insights: [],
      timeframe: String(timeframe || '3months'),
    };
  }

  if (!clientProgress || cohort.length === 0) {
    return {
      comparisonType: type,
      title: type === 'clients' ? 'Client Cohort Comparison' : 'Average Performance',
      subtitle: 'No benchmark cohort is available yet. Add more real client progress records before comparing.',
      metrics: [],
      insights: [],
      timeframe: String(timeframe || '3months'),
    };
  }

  const metrics = COMPARISON_LEVEL_FIELDS.map(({ name, field }) => {
    const client = toPercentScore(clientProgress[field]);
    const cohortScores = cohort.map((row) => toPercentScore(row[field]));
    const comparison = mean(cohortScores);
    const delta = client - comparison;

    return {
      name,
      client,
      comparison,
      percentile: percentileFor(client, [...cohortScores, client]),
      trend: delta > 0 ? 'above' : delta < 0 ? 'below' : 'equal',
      improvement: `${delta >= 0 ? '+' : ''}${delta}%`,
    };
  });

  const strongest = [...metrics].sort((a, b) => (b.client - b.comparison) - (a.client - a.comparison))[0];
  const weakest = [...metrics].sort((a, b) => (a.client - a.comparison) - (b.client - b.comparison))[0];
  const insights = [];

  if (strongest && strongest.client > strongest.comparison) {
    insights.push({
      type: 'success',
      title: `${strongest.name} is ahead of cohort`,
      description: `${strongest.client}% vs ${strongest.comparison}% cohort average.`,
      recommendation: 'Keep the current progression pattern and use it as a confidence signal.',
    });
  }

  if (weakest && weakest.client < weakest.comparison) {
    insights.push({
      type: 'warning',
      title: `${weakest.name} is behind cohort`,
      description: `${weakest.client}% vs ${weakest.comparison}% cohort average.`,
      recommendation: 'Review recent workout logs and bias the next plan toward this category.',
    });
  }

  return {
    comparisonType: type,
    title: type === 'clients' ? 'Client Cohort Comparison' : 'Average Performance',
    subtitle: `Compared against ${cohort.length} other real client progress record${cohort.length === 1 ? '' : 's'}.`,
    metrics,
    insights,
    timeframe: String(timeframe || '3months'),
  };
};

const toGoalNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toGoalIso = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const normalizeGoalStatus = (goal) => {
  const rawStatus = String(goal?.status || 'active');
  if (rawStatus === 'completed') return 'completed';
  if (rawStatus === 'paused') return 'paused';
  if (rawStatus !== 'active') return 'paused';
  const deadline = goal?.deadline ? new Date(goal.deadline) : null;
  return deadline && !Number.isNaN(deadline.getTime()) && deadline < new Date() ? 'overdue' : 'active';
};

const normalizeGoalPriority = (value) => {
  const priority = String(value || 'medium');
  if (priority === 'critical') return 'high';
  return ['high', 'medium', 'low'].includes(priority) ? priority : 'medium';
};

const normalizeGoalType = (goal) => {
  if (['strength', 'cardio', 'flexibility', 'fitness'].includes(goal?.category)) return 'performance';
  if (['habit', 'streak', 'sleep', 'nutrition'].includes(goal?.category)) return 'behavioral';
  return 'measurable';
};

const normalizeMilestones = (goal) => {
  const milestones = Array.isArray(goal?.milestones) ? goal.milestones : [];
  return milestones.map((milestone, index) => ({
    id: String(milestone.id || `${goal.id}-milestone-${index + 1}`),
    title: String(milestone.title || `Milestone ${index + 1}`),
    target: toGoalNumber(milestone.target ?? milestone.percentage),
    current: toGoalNumber(milestone.current ?? goal.currentValue),
    completed: Boolean(milestone.completed ?? milestone.achieved),
    date: toGoalIso(milestone.date ?? milestone.achievedAt),
    estimatedDate: toGoalIso(milestone.estimatedDate),
  }));
};

const normalizeProgressHistory = (goal) => {
  const history = Array.isArray(goal?.progressHistory) ? goal.progressHistory : [];
  return history.map((point) => ({
    date: toGoalIso(point.date) || toGoalIso(goal.updatedAt) || new Date().toISOString(),
    value: toGoalNumber(point.value ?? point.currentValue),
  }));
};

const buildGoalInsight = (goal, status) => {
  const progress = Math.max(0, Math.min(100, Math.round(toGoalNumber(goal.progressPercentage))));
  const recommendation = status === 'completed'
    ? 'Goal is completed. Set the next measurable target from the latest workout data.'
    : status === 'overdue'
      ? 'Goal is past its target date. Review recent logs and reset the target or plan.'
      : 'Use recent workout logs to update this goal after the next session.';

  return {
    trend: status === 'completed' ? 'achieved' : status === 'overdue' ? 'stalled' : progress > 0 ? 'positive' : 'stalled',
    predictedCompletion: toGoalIso(goal.estimatedCompletionDate ?? goal.deadline),
    likelihood: Math.max(0, Math.min(100, toGoalNumber(goal.confidenceLevel) * 10)),
    weeklyRate: toGoalNumber(goal.averageProgressPerWeek),
    recommendation,
  };
};

export const buildGoalTrackingData = ({ goals }) => {
  const rows = Array.isArray(goals) ? goals.map((goal) => (goal?.toJSON ? goal.toJSON() : goal)) : [];
  const mappedGoals = rows.map((goal) => {
    const status = normalizeGoalStatus(goal);
    const progress = Math.max(0, Math.min(100, Math.round(toGoalNumber(goal.progressPercentage))));
    return {
      id: String(goal.id),
      title: String(goal.title || 'Untitled Goal'),
      category: String(goal.category || 'fitness'),
      type: normalizeGoalType(goal),
      status,
      priority: normalizeGoalPriority(goal.priority),
      progress,
      startDate: toGoalIso(goal.startDate) || new Date().toISOString(),
      targetDate: toGoalIso(goal.deadline) || new Date().toISOString(),
      completedDate: toGoalIso(goal.completedAt),
      currentValue: toGoalNumber(goal.currentValue),
      targetValue: toGoalNumber(goal.targetValue),
      unit: String(goal.unit || 'units'),
      milestones: normalizeMilestones(goal),
      progressHistory: normalizeProgressHistory(goal),
      insights: buildGoalInsight(goal, status),
    };
  });

  const activeGoals = mappedGoals.filter((goal) => goal.status === 'active').length;
  const completedGoals = mappedGoals.filter((goal) => goal.status === 'completed').length;
  const overdueGoals = mappedGoals.filter((goal) => goal.status === 'overdue').length;
  const averageProgress = mappedGoals.length
    ? Math.round(mappedGoals.reduce((sum, goal) => sum + goal.progress, 0) / mappedGoals.length)
    : 0;
  const latestCompleted = mappedGoals
    .filter((goal) => goal.status === 'completed')
    .sort((a, b) => new Date(b.completedDate || b.targetDate).getTime() - new Date(a.completedDate || a.targetDate).getTime())[0];

  return {
    summary: {
      totalGoals: mappedGoals.length,
      activeGoals,
      completedGoals,
      overdueGoals,
      averageProgress,
      onTrackGoals: activeGoals,
    },
    goals: mappedGoals,
    achievements: latestCompleted ? [{
      id: 'completed-goal-recorded',
      title: 'Completed Goal Recorded',
      description: `${latestCompleted.title} is marked complete in this client's goal history.`,
      earned: true,
      date: latestCompleted.completedDate || latestCompleted.targetDate,
      icon: 'trophy',
    }] : [],
  };
};

const GOAL_CATEGORIES = new Set([
  'fitness',
  'strength',
  'cardio',
  'flexibility',
  'nutrition',
  'weight',
  'body_composition',
  'mindfulness',
  'sleep',
  'social',
  'habit',
  'streak',
  'custom',
]);
const GOAL_PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);
const GOAL_STATUSES = new Set(['draft', 'active', 'completed', 'paused', 'cancelled', 'failed']);

const trimmedString = (value, fallback = '', maxLength = 1000) => {
  const normalized = String(value ?? fallback).trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
};

const parseGoalDeadline = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('A valid target date is required');
  }
  if (date <= new Date()) {
    throw new Error('Target date must be in the future');
  }
  return date;
};

const goalPercent = (currentValue, targetValue) => {
  const current = toGoalNumber(currentValue);
  const target = toGoalNumber(targetValue);
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
};

const normalizeGoalCategory = (value) => {
  const category = String(value || 'fitness');
  return GOAL_CATEGORIES.has(category) ? category : 'fitness';
};

const normalizeGoalWritePriority = (value) => {
  const priority = String(value || 'medium');
  return GOAL_PRIORITIES.has(priority) ? priority : 'medium';
};

const normalizeGoalWriteStatus = (value, fallback = 'active') => {
  const status = String(value || fallback);
  return GOAL_STATUSES.has(status) ? status : fallback;
};

export const normalizeGoalCreatePayload = (body = {}) => {
  const title = trimmedString(body.title, '', 100);
  if (title.length < 3) throw new Error('Goal title must be at least 3 characters');

  const targetValue = toGoalNumber(body.targetValue);
  if (targetValue <= 0) throw new Error('Target value must be greater than zero');

  const currentValue = Math.max(0, toGoalNumber(body.currentValue));
  const unit = trimmedString(body.unit, 'units', 50);
  if (!unit) throw new Error('Goal unit is required');

  const deadline = parseGoalDeadline(body.deadline ?? body.targetDate);
  const progressPercentage = goalPercent(currentValue, targetValue);
  const now = new Date();
  const status = normalizeGoalWriteStatus(
    body.status,
    progressPercentage >= 100 ? 'completed' : 'active'
  );

  return {
    title,
    description: trimmedString(body.description, '', 1000) || null,
    targetValue,
    currentValue,
    unit,
    category: normalizeGoalCategory(body.category),
    priority: normalizeGoalWritePriority(body.priority),
    status,
    deadline,
    progressPercentage,
    progressHistory: currentValue > 0 ? [{
      date: now.toISOString(),
      value: currentValue,
      change: currentValue,
      percentage: progressPercentage,
      notes: trimmedString(body.notes, '', 500) || null,
    }] : [],
    completedAt: status === 'completed' ? now : null,
    lastProgressUpdate: currentValue > 0 ? now : null,
  };
};

export const normalizeGoalUpdatePayload = (body = {}, existingGoal = {}) => {
  const existing = existingGoal?.toJSON ? existingGoal.toJSON() : existingGoal;
  const updates = {};

  if (body.title !== undefined) {
    const title = trimmedString(body.title, '', 100);
    if (title.length < 3) throw new Error('Goal title must be at least 3 characters');
    updates.title = title;
  }

  if (body.description !== undefined) {
    updates.description = trimmedString(body.description, '', 1000) || null;
  }

  if (body.unit !== undefined) {
    const unit = trimmedString(body.unit, '', 50);
    if (!unit) throw new Error('Goal unit is required');
    updates.unit = unit;
  }

  if (body.category !== undefined) updates.category = normalizeGoalCategory(body.category);
  if (body.priority !== undefined) updates.priority = normalizeGoalWritePriority(body.priority);
  if (body.deadline !== undefined || body.targetDate !== undefined) {
    updates.deadline = parseGoalDeadline(body.deadline ?? body.targetDate);
  }

  const nextTarget = body.targetValue !== undefined ? toGoalNumber(body.targetValue) : toGoalNumber(existing.targetValue);
  const nextCurrent = body.currentValue !== undefined ? Math.max(0, toGoalNumber(body.currentValue)) : toGoalNumber(existing.currentValue);
  if (body.targetValue !== undefined) {
    if (nextTarget <= 0) throw new Error('Target value must be greater than zero');
    updates.targetValue = nextTarget;
  }
  if (body.currentValue !== undefined) updates.currentValue = nextCurrent;

  if (body.currentValue !== undefined || body.targetValue !== undefined) {
    const progressPercentage = goalPercent(nextCurrent, nextTarget);
    const previousCurrent = toGoalNumber(existing.currentValue);
    const now = new Date();
    updates.progressPercentage = progressPercentage;
    updates.lastProgressUpdate = now;
    updates.progressHistory = [
      ...(Array.isArray(existing.progressHistory) ? existing.progressHistory : []),
      {
        date: now.toISOString(),
        value: nextCurrent,
        change: nextCurrent - previousCurrent,
        percentage: progressPercentage,
        notes: trimmedString(body.notes, '', 500) || null,
      },
    ];
    if (progressPercentage >= 100 && ['active', 'paused'].includes(existing.status)) {
      updates.status = 'completed';
      updates.completedAt = now;
    }
  }

  if (body.status !== undefined) {
    const status = normalizeGoalWriteStatus(body.status, existing.status || 'active');
    updates.status = status;
    updates.completedAt = status === 'completed' ? (existing.completedAt || new Date()) : null;
  }

  return updates;
};

const clampRiskScore = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
};

const riskFromScore = (score) => {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

const findingStatusFromScore = (score) => {
  if (score >= 70) return 'caution';
  if (score >= 40) return 'attention';
  return 'good';
};

const formatBodyRegion = (value) => String(value || 'body region')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const splitMovementList = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .slice(0, 4);

const buildEmptyCorrectiveProtocol = () => ({
  inhibit: [],
  lengthen: [],
  activate: [],
  integrate: [],
});

const recentSessionLoad = (sessions, since, until = new Date()) => sessions
  .filter((session) => {
    const date = new Date(session.date ?? session.completedAt ?? session.updatedAt);
    return !Number.isNaN(date.getTime()) && date >= since && date < until;
  })
  .reduce((total, session) => {
    const duration = Number(session.duration);
    const intensity = Number(session.intensity ?? session.avgRPE ?? 1);
    return total + Math.max(0, Number.isFinite(duration) ? duration : 0)
      * Math.max(1, Number.isFinite(intensity) ? intensity : 1);
  }, 0);

export const buildInjuryRiskAssessment = ({
  clientProgress,
  painEntries,
  recentSessions,
}) => {
  const progress = clientProgress?.toJSON ? clientProgress.toJSON() : clientProgress;
  const painRows = Array.isArray(painEntries)
    ? painEntries.map((entry) => (entry?.toJSON ? entry.toJSON() : entry))
    : [];
  const sessionRows = Array.isArray(recentSessions)
    ? recentSessions.map((session) => (session?.toJSON ? session.toJSON() : session))
    : [];
  const categories = [];
  const criticalAlerts = [];

  if (painRows.length > 0) {
    const maxPainScore = Math.max(...painRows.map((entry) => clampRiskScore(toGoalNumber(entry.painLevel) * 10)));
    categories.push({
      id: 'active-pain',
      name: 'Active Pain Reports',
      risk: riskFromScore(maxPainScore),
      score: maxPainScore,
      icon: 'alert-triangle',
      findings: painRows.slice(0, 8).map((entry) => {
        const painScore = clampRiskScore(toGoalNumber(entry.painLevel) * 10);
        const movements = splitMovementList(entry.aggravatingMovements);
        return {
          pattern: `${formatBodyRegion(entry.bodyRegion)} pain`,
          status: findingStatusFromScore(painScore),
          notes: `${entry.side || 'center'} ${entry.painType || 'reported'} pain at ${toGoalNumber(entry.painLevel)}/10.`,
          recommendation: entry.aiNotes
            || (movements.length
              ? `Modify or avoid: ${movements.join(', ')}.`
              : 'Review this active pain entry before loading the affected region.'),
        };
      }),
    });

    painRows
      .filter((entry) => toGoalNumber(entry.painLevel) >= 7)
      .slice(0, 3)
      .forEach((entry) => {
        criticalAlerts.push({
          severity: 'high',
          title: 'Active high pain entry',
          description: `${formatBodyRegion(entry.bodyRegion)} is logged at ${toGoalNumber(entry.painLevel)}/10.`,
          action: 'Modify or defer loaded work for that region until reviewed by the trainer.',
          timeframe: 'Before next session',
        });
      });
  }

  if (progress) {
    const progressFields = [
      { label: 'Balance', field: 'balanceLevel' },
      { label: 'Stability', field: 'stabilityLevel' },
      { label: 'Flexibility', field: 'flexibilityLevel' },
      { label: 'Injury Prevention', field: 'injuryPreventionLevel' },
      { label: 'Injury Recovery', field: 'injuryRecoveryLevel' },
    ];
    const capacityScores = progressFields.map(({ field }) => toPercentScore(progress[field]));
    const averageCapacity = mean(capacityScores);
    const capacityRisk = clampRiskScore(100 - averageCapacity);

    categories.push({
      id: 'movement-capacity',
      name: 'Movement Capacity',
      risk: riskFromScore(capacityRisk),
      score: capacityRisk,
      icon: 'activity',
      findings: progressFields.map(({ label, field }) => {
        const levelScore = toPercentScore(progress[field]);
        return {
          pattern: `${label} progression`,
          status: levelScore >= 70 ? 'good' : levelScore >= 40 ? 'attention' : 'caution',
          notes: `${levelScore}% progression signal from saved client progress.`,
          recommendation: levelScore >= 70
            ? `Maintain ${label.toLowerCase()} exposure while progressing load.`
            : `Bias the next plan toward ${label.toLowerCase()} before adding complexity.`,
        };
      }),
    });
  }

  if (sessionRows.length > 0) {
    const intensityValues = sessionRows
      .map((session) => Number(session.intensity ?? session.avgRPE))
      .filter((value) => Number.isFinite(value));
    const durationValues = sessionRows
      .map((session) => Number(session.duration))
      .filter((value) => Number.isFinite(value));
    const averageIntensity = intensityValues.length ? mean(intensityValues) : 0;
    const averageDuration = durationValues.length ? mean(durationValues) : 0;
    const recoveryScore = clampRiskScore(Math.max(averageIntensity * 10, averageDuration > 75 ? 55 : 20));

    categories.push({
      id: 'recovery-load',
      name: 'Recent Recovery Load',
      risk: riskFromScore(recoveryScore),
      score: recoveryScore,
      icon: 'clock',
      findings: [
        {
          pattern: 'Completed workout history',
          status: 'good',
          notes: `${sessionRows.length} completed session${sessionRows.length === 1 ? '' : 's'} found in recent history.`,
          recommendation: 'Keep logging completed sessions so risk decisions stay evidence-based.',
        },
        {
          pattern: 'Average intensity',
          status: averageIntensity >= 8 ? 'caution' : averageIntensity >= 6 ? 'attention' : 'good',
          notes: intensityValues.length
            ? `${averageIntensity}/10 average intensity across rated sessions.`
            : 'No intensity ratings were saved on the recent completed sessions.',
          recommendation: intensityValues.length
            ? 'Use this intensity trend when deciding whether to deload or progress.'
            : 'Record intensity/RPE after workouts to improve risk assessment.',
        },
        {
          pattern: 'Average duration',
          status: averageDuration > 75 ? 'attention' : 'good',
          notes: `${averageDuration} minute average workout duration.`,
          recommendation: averageDuration > 75
            ? 'Watch fatigue when long sessions stack with pain entries.'
            : 'Duration does not currently flag a high training-load concern.',
        },
      ],
    });

    if (averageIntensity >= 8) {
      criticalAlerts.push({
        severity: 'medium',
        title: 'High recent intensity',
        description: `${averageIntensity}/10 average intensity across rated sessions.`,
        action: 'Review pain entries and recovery before increasing load.',
        timeframe: 'Next session',
      });
    }

    const now = new Date();
    const currentWindowStart = new Date(now);
    currentWindowStart.setDate(currentWindowStart.getDate() - 14);
    const previousWindowStart = new Date(currentWindowStart);
    previousWindowStart.setDate(previousWindowStart.getDate() - 14);
    const currentLoad = recentSessionLoad(sessionRows, currentWindowStart, now);
    const previousLoad = recentSessionLoad(sessionRows, previousWindowStart, currentWindowStart);
    const loadIncrease = previousLoad > 0 ? ((currentLoad - previousLoad) / previousLoad) * 100 : 0;
    const loadScore = clampRiskScore(loadIncrease > 25 ? 70 : currentLoad > 0 ? 30 : 0);

    categories.push({
      id: 'training-progression',
      name: 'Training Progression',
      risk: riskFromScore(loadScore),
      score: loadScore,
      icon: 'trending-up',
      findings: [
        {
          pattern: '14-day training load',
          status: loadScore >= 70 ? 'caution' : loadScore >= 40 ? 'attention' : 'good',
          notes: previousLoad > 0
            ? `${Math.round(loadIncrease)}% load change compared with the prior 14 days.`
            : 'Not enough prior-window load exists for a trend comparison.',
          recommendation: loadScore >= 70
            ? 'Hold progression until the next logged session confirms tolerance.'
            : 'Progression does not currently exceed the configured risk threshold.',
        },
      ],
    });
  }

  const riskScore = categories.length
    ? clampRiskScore((mean(categories.map((category) => category.score)) + Math.max(...categories.map((category) => category.score))) / 2)
    : 0;
  const overallRisk = riskFromScore(riskScore);
  const weakestCapacity = progress ? ['balanceLevel', 'stabilityLevel', 'flexibilityLevel', 'injuryPreventionLevel', 'injuryRecoveryLevel']
    .map((field) => ({ field, score: toPercentScore(progress[field]) }))
    .sort((a, b) => a.score - b.score)[0] : null;
  const recommendations = categories.length ? [
    {
      category: 'Immediate',
      items: painRows.length
        ? ['Review active pain entries before loading affected regions.', 'Record pain-free movement modifications in the next workout log.']
        : ['Confirm current pain status before the next progression decision.'],
    },
    {
      category: 'Next Sessions',
      items: weakestCapacity
        ? [`Prioritize ${formatBodyRegion(weakestCapacity.field.replace('Level', ''))} work before adding complexity.`]
        : ['Keep workout duration and intensity recorded for risk tracking.'],
    },
    {
      category: 'Monitoring',
      items: ['Update intensity/RPE and pain notes after each trainer-led session.'],
    },
  ] : [];
  const correctiveProtocol = painRows.length ? {
    inhibit: painRows.slice(0, 4).map((entry) => ({
      muscle: formatBodyRegion(entry.bodyRegion),
      exercise: 'Trainer-approved tissue prep',
      duration: 'Record dosage in session notes',
      frequency: 'Before loaded work',
    })),
    lengthen: painRows.slice(0, 4).map((entry) => ({
      muscle: formatBodyRegion(entry.bodyRegion),
      exercise: 'Pain-free mobility drill',
      duration: 'Record range and tolerance',
      frequency: 'Warm-up block',
    })),
    activate: painRows.slice(0, 4).map((entry) => ({
      muscle: formatBodyRegion(entry.bodyRegion),
      exercise: 'Low-load activation pattern',
      reps: 'Record reps and response',
      frequency: 'Pre-workout',
    })),
    integrate: painRows.slice(0, 4).map((entry) => ({
      muscle: formatBodyRegion(entry.bodyRegion),
      exercise: 'Controlled movement re-introduction',
      reps: 'Pain-free sets only',
      frequency: 'Trainer discretion',
    })),
  } : buildEmptyCorrectiveProtocol();

  return {
    overallRisk,
    riskScore,
    lastAssessment: new Date().toISOString(),
    categories,
    criticalAlerts,
    recommendations,
    correctiveProtocol,
  };
};

/**
 * @route GET /api/client-progress
 * @desc Get client progress for the authenticated user
 * @access Private (clients only)
 */
router.get('/', 
  protect,
  authorize(['client', 'admin']),
  async (req, res) => {
    try {
      const ClientProgress = getClientProgress();
      
      // Find or create progress record for the current user
      const [clientProgress, created] = await ClientProgress.findOrCreate({
        where: { userId: req.user.id },
        defaults: {
          userId: req.user.id,
          overallLevel: 0,
          experiencePoints: 0
          // All other fields have default values in the model
        }
      });
      
      // If a new record was created, this is the user's first time accessing progress
      if (created) {
        console.log(`Created new progress record for user ${req.user.id}`);
      }
      
      return res.status(200).json({
        success: true,
        progress: clientProgress
      });
    } catch (error) {
      console.error('Error fetching client progress:', error);
      return sendInternalError(res, 'Server error fetching progress data');
    }
});

/**
 * @route PUT /api/client-progress
 * @desc Update client progress (for clients completing workouts)
 * @access Private (clients only)
 */
router.put('/',
  protect,
  authorize(['client', 'admin']),
  async (req, res) => {
    try {
      const ClientProgress = getClientProgress();
      
      const { 
        experiencePoints,
        levelUpdates,
        achievementsUnlocked,
        workoutMetrics
      } = req.body;
      
      const clientProgress = await ClientProgress.findOne({
        where: { userId: req.user.id }
      });
      
      if (!clientProgress) {
        return res.status(404).json({
          success: false,
          message: 'Client progress record not found'
        });
      }
      
      // Update experience points if provided
      if (experiencePoints) {
        clientProgress.experiencePoints += experiencePoints;
        
        // Check if client should level up (simple algorithm)
        const xpNeeded = 100 + (clientProgress.overallLevel * 25);
        if (clientProgress.experiencePoints >= xpNeeded) {
          clientProgress.overallLevel += 1;
          clientProgress.experiencePoints -= xpNeeded;
        }
      }
      
      // Update individual level categories if provided
      if (levelUpdates && typeof levelUpdates === 'object') {
        Object.entries(levelUpdates).forEach(([category, points]) => {
          // Format: {category}Level and {category}ExperiencePoints
          const levelField = `${category}Level`;
          const pointsField = `${category}ExperiencePoints`;
          
          // Only process valid fields that exist in the model
          if (clientProgress[levelField] !== undefined && clientProgress[pointsField] !== undefined) {
            clientProgress[pointsField] += points;
            
            // Check for level up in this category
            const categoryXpNeeded = 50 + (clientProgress[levelField] * 15);
            if (clientProgress[pointsField] >= categoryXpNeeded) {
              clientProgress[levelField] += 1;
              clientProgress[pointsField] -= categoryXpNeeded;
            }
          }
        });
      }
      
      // Update achievements if provided
      if (achievementsUnlocked && Array.isArray(achievementsUnlocked) && achievementsUnlocked.length > 0) {
        const currentAchievements = clientProgress.achievements || [];
        const currentAchievementDates = clientProgress.achievementDates || {};
        
        // Add only new achievements
        const newAchievements = achievementsUnlocked.filter(a => !currentAchievements.includes(a));
        
        if (newAchievements.length > 0) {
          // Update the achievements array with new unique achievements
          const updatedAchievements = [...new Set([...currentAchievements, ...newAchievements])];
          clientProgress.achievements = updatedAchievements;
          
          // Record unlock dates for new achievements
          const updatedDates = { ...currentAchievementDates };
          newAchievements.forEach(achievement => {
            updatedDates[achievement] = new Date().toISOString();
          });
          clientProgress.achievementDates = updatedDates;
        }
      }
      
      // Update workout metrics if provided
      if (workoutMetrics && typeof workoutMetrics === 'object') {
        if (workoutMetrics.workoutsCompleted) {
          clientProgress.workoutsCompleted = (clientProgress.workoutsCompleted || 0) + workoutMetrics.workoutsCompleted;
        }
        
        if (workoutMetrics.totalExercisesPerformed) {
          clientProgress.totalExercisesPerformed = (clientProgress.totalExercisesPerformed || 0) + workoutMetrics.totalExercisesPerformed;
        }
        
        if (workoutMetrics.totalMinutes) {
          clientProgress.totalMinutes = (clientProgress.totalMinutes || 0) + workoutMetrics.totalMinutes;
        }
        
        // Handle streak days logic
        if (workoutMetrics.updatedStreakDays !== undefined) {
          clientProgress.streakDays = workoutMetrics.updatedStreakDays;
        }
      }
      
      // Save all updates
      await clientProgress.save();
      
      return res.status(200).json({
        success: true,
        message: 'Progress updated successfully',
        progress: clientProgress
      });
      
    } catch (error) {
      console.error('Error updating client progress:', error);
      return sendInternalError(res, 'Server error updating progress data');
    }
});

/**
 * @route GET /api/client-progress/leaderboard
 * @desc Get client progress leaderboard (top clients by overall level)
 * @access Private
 */
router.get('/leaderboard',
  protect,
  async (req, res) => {
    try {
      const ClientProgress = getClientProgress();
      const User = getUser();
      
      const leaderboard = await ClientProgress.findAll({
        attributes: ['overallLevel', 'userId'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
          }
        ],
        order: [
          ['overallLevel', 'DESC']
        ],
        limit: 10
      });
      
      return res.status(200).json({
        success: true,
        leaderboard
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return sendInternalError(res, 'Server error fetching leaderboard');
    }
});

/**
 * @route GET /api/client-progress/:clientId/workout-history
 * @desc Real workout history for the client dashboard (replaces silent mock fallback)
 * @access Private — client reading own data; assigned trainer/admin reading client
 *
 * Response: bare WorkoutHistoryEntry[] (matches the caller contract in
 * frontend/src/services/enhanced-progress-analytics-service.ts getWorkoutHistory).
 * Returns [] when no sessions exist so the UI renders honest empty state.
 */
router.get('/:clientId/workout-history',
  protect,
  authorize(['client', 'trainer', 'admin']),
  verifyClientAccessByUserId({ paramName: 'clientId' }),
  async (req, res) => {
    try {
      const { clientId } = req.params;
      const numericClientId = parsePositiveInteger(clientId);
      if (!numericClientId) {
        return res.status(400).json({ success: false, message: 'Invalid clientId' });
      }

      const WorkoutSession = getWorkoutSession();
      if (!WorkoutSession) {
        logger.warn('[workout-history] WorkoutSession model unavailable');
        return res.status(200).json([]);
      }

      const days = parseWorkoutHistoryTimeframe(req.query.timeframe);
      const where = { userId: numericClientId, status: 'completed' };
      if (days) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        where.date = { [Op.gte]: since };
      }

      const sessions = await WorkoutSession.findAll({
        where,
        order: [['date', 'DESC']],
        limit: 200,
        attributes: ['id', 'title', 'date', 'duration', 'intensity', 'notes'],
      });

      return res.status(200).json(sessions.map(toWorkoutHistoryEntry));
    } catch (error) {
      logger.error('Error fetching client workout history:', error);
      return sendInternalError(res, 'Server error fetching workout history');
    }
  });

/**
 * @route GET /api/client-progress/:clientId/comparison
 * @desc Real cohort comparison analytics based on ClientProgress rows
 * @access Private — client reading own data; assigned trainer/admin reading client
 */
router.get('/:clientId/comparison',
  protect,
  authorize(['client', 'trainer', 'admin']),
  verifyClientAccessByUserId({ paramName: 'clientId' }),
  async (req, res) => {
    try {
      const numericClientId = parsePositiveInteger(req.params.clientId);
      if (!numericClientId) {
        return res.status(400).json({ success: false, message: 'Invalid clientId' });
      }

      const ClientProgress = getClientProgress();
      const fields = ['userId', ...COMPARISON_LEVEL_FIELDS.map(({ field }) => field)];
      const clientProgress = await ClientProgress.findOne({
        where: { userId: numericClientId },
        attributes: fields,
      });

      const cohortProgress = await ClientProgress.findAll({
        where: { userId: { [Op.ne]: numericClientId } },
        attributes: fields,
        limit: 500,
      });

      const analytics = buildComparisonAnalytics({
        clientProgress,
        cohortProgress,
        comparisonType: req.query.type,
        timeframe: req.query.timeframe,
      });

      return res.status(200).json(analytics);
    } catch (error) {
      logger.error('Error fetching client comparison analytics:', error);
      return sendInternalError(res, 'Server error fetching comparison analytics');
    }
  });

/**
 * @route GET /api/client-progress/:clientId/goals
 * @desc Real goal tracking data based on Goal rows
 * @access Private — client reading own data; assigned trainer/admin reading client
 */
router.get('/:clientId/goals',
  protect,
  authorize(['client', 'trainer', 'admin']),
  verifyClientAccessByUserId({ paramName: 'clientId' }),
  async (req, res) => {
    try {
      const numericClientId = parsePositiveInteger(req.params.clientId);
      if (!numericClientId) {
        return res.status(400).json({ success: false, message: 'Invalid clientId' });
      }

      const Goal = getGoal();
      const goals = Goal ? await Goal.findAll({
        where: {
          userId: numericClientId,
          status: { [Op.in]: ['draft', 'active', 'completed', 'paused', 'cancelled', 'failed'] },
        },
        order: [['updatedAt', 'DESC']],
        limit: 100,
      }) : [];

      return res.status(200).json(buildGoalTrackingData({ goals }));
    } catch (error) {
      logger.error('Error fetching client goal tracking:', error);
      return sendInternalError(res, 'Server error fetching goal tracking');
    }
  });

/**
 * @route POST /api/client-progress/:clientId/goals
 * @desc Create a real goal row for the selected client
 * @access Private - client reading own data; assigned trainer/admin reading client
 */
router.post('/:clientId/goals',
  protect,
  authorize(['client', 'trainer', 'admin']),
  verifyClientAccessByUserId({ paramName: 'clientId' }),
  async (req, res) => {
    try {
      const numericClientId = parsePositiveInteger(req.params.clientId);
      if (!numericClientId) {
        return res.status(400).json({ success: false, message: 'Invalid clientId' });
      }

      const Goal = getGoal();
      const fields = normalizeGoalCreatePayload(req.body);
      const goal = await Goal.create({
        userId: numericClientId,
        ...fields,
      });

      return res.status(201).json({
        success: true,
        goal: buildGoalTrackingData({ goals: [goal] }).goals[0],
      });
    } catch (error) {
      if (error instanceof Error && !error.name?.includes('Sequelize')) {
        return sendBadRequest(res, error.message);
      }
      logger.error('Error creating client goal:', error);
      return sendInternalError(res, 'Server error creating goal');
    }
  });

/**
 * @route PUT /api/client-progress/:clientId/goals/:goalId
 * @desc Update a real goal row for the selected client
 * @access Private - client reading own data; assigned trainer/admin reading client
 */
router.put('/:clientId/goals/:goalId',
  protect,
  authorize(['client', 'trainer', 'admin']),
  verifyClientAccessByUserId({ paramName: 'clientId' }),
  async (req, res) => {
    try {
      const numericClientId = parsePositiveInteger(req.params.clientId);
      if (!numericClientId) {
        return res.status(400).json({ success: false, message: 'Invalid clientId' });
      }

      const Goal = getGoal();
      const goal = await Goal.findOne({
        where: { userId: numericClientId, id: req.params.goalId },
      });
      if (!goal) {
        return res.status(404).json({ success: false, message: 'Goal not found' });
      }

      const updates = normalizeGoalUpdatePayload(req.body, goal);
      goal.set(updates);
      await goal.save();

      return res.status(200).json({
        success: true,
        goal: buildGoalTrackingData({ goals: [goal] }).goals[0],
      });
    } catch (error) {
      if (error instanceof Error && !error.name?.includes('Sequelize')) {
        return sendBadRequest(res, error.message);
      }
      logger.error('Error updating client goal:', error);
      return sendInternalError(res, 'Server error updating goal');
    }
  });

/**
 * @route GET /api/client-progress/:clientId/risk-assessment
 * @desc Real injury risk assessment based on ClientProgress, pain entries, and workout sessions
 * @access Private - client reading own data; assigned trainer/admin reading client
 */
router.get('/:clientId/risk-assessment',
  protect,
  authorize(['client', 'trainer', 'admin']),
  verifyClientAccessByUserId({ paramName: 'clientId' }),
  async (req, res) => {
    try {
      const numericClientId = parsePositiveInteger(req.params.clientId);
      if (!numericClientId) {
        return res.status(400).json({ success: false, message: 'Invalid clientId' });
      }

      const ClientProgress = getClientProgress();
      const ClientPainEntry = getClientPainEntry();
      const WorkoutSession = getWorkoutSession();

      const [clientProgress, painEntries, recentSessions] = await Promise.all([
        ClientProgress.findOne({
          where: { userId: numericClientId },
          attributes: [
            'userId',
            'balanceLevel',
            'stabilityLevel',
            'flexibilityLevel',
            'injuryPreventionLevel',
            'injuryRecoveryLevel',
          ],
        }),
        ClientPainEntry ? ClientPainEntry.findAll({
          where: { userId: numericClientId, isActive: true },
          order: [['updatedAt', 'DESC']],
          limit: 50,
        }) : [],
        WorkoutSession ? WorkoutSession.findAll({
          where: { userId: numericClientId, status: 'completed' },
          order: [['date', 'DESC']],
          limit: 40,
          attributes: ['id', 'title', 'date', 'duration', 'intensity', 'avgRPE', 'completedAt', 'updatedAt'],
        }) : [],
      ]);

      return res.status(200).json(buildInjuryRiskAssessment({
        clientProgress,
        painEntries,
        recentSessions,
      }));
    } catch (error) {
      logger.error('Error fetching client injury risk assessment:', error);
      return sendInternalError(res, 'Server error fetching injury risk assessment');
    }
  });

/**
 * @route GET /api/client-progress/:userId
 * @desc Get client progress for a specific user (trainer accessing client data)
 * @access Private (trainers and admins only)
 */
router.get('/:userId',
  protect,
  authorize(['trainer', 'admin']),
  verifyClientAccessByUserId({ paramName: 'userId' }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      const ClientProgress = getClientProgress();
      const User = getUser();
      
      // Verify the client exists and is actually a client
      const client = await User.findOne({
        where: {
          id: userId,
          role: 'client'
        },
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }
      
      // Get the client's progress
      const clientProgress = await ClientProgress.findOne({
        where: { userId }
      });
      
      if (!clientProgress) {
        return res.status(404).json({
          success: false,
          message: 'Client progress record not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        client,
        progress: clientProgress
      });
      
    } catch (error) {
      console.error('Error fetching client progress:', error);
      return sendInternalError(res, 'Server error fetching progress data');
    }
});

/**
 * @route PUT /api/client-progress/:userId
 * @desc Update client progress for a specific user (trainer updating client data)
 * @access Private (trainers and admins only)
 */
router.put('/:userId',
  protect,
  authorize(['trainer', 'admin']),
  verifyClientAccessByUserId({ paramName: 'userId' }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      const ClientProgress = getClientProgress();
      const User = getUser();
      
      // Verify the client exists and is actually a client
      const client = await User.findOne({
        where: {
          id: userId,
          role: 'client'
        }
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }
      
      // Get the client's progress
      const clientProgress = await ClientProgress.findOne({
        where: { userId }
      });
      
      if (!clientProgress) {
        return res.status(404).json({
          success: false,
          message: 'Client progress record not found'
        });
      }
      
      // Update fields based on request body (trainer/admin can update any field)
      Object.keys(updates).forEach(key => {
        // Only update valid fields that exist in the model
        if (clientProgress[key] !== undefined) {
          clientProgress[key] = updates[key];
        }
      });
      
      // Save all updates
      await clientProgress.save();
      
      return res.status(200).json({
        success: true,
        message: 'Progress updated successfully by trainer/admin',
        progress: clientProgress
      });
      
    } catch (error) {
      console.error('Error updating client progress:', error);
      return sendInternalError(res, 'Server error updating progress data');
    }
});

export default router;
