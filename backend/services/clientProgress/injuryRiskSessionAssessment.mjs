// backend/services/clientProgress/injuryRiskSessionAssessment.mjs

import {
  clampScore,
  mean,
  toPositiveMetric,
} from './progressScoring.mjs';

const riskFromScore = (score) => {
  if (score >= 70) return 'high';
  return score >= 40 ? 'medium' : 'low';
};

const sessionEffortRating = (session) => (
  toPositiveMetric(session?.intensity) ?? toPositiveMetric(session?.avgRPE)
);

const SESSION_DATE_FIELDS = ['date', 'completedAt', 'updatedAt'];

const sessionDateValue = (session) => SESSION_DATE_FIELDS
  .map((field) => session[field])
  .find(Boolean);

const sessionTimestamp = (session) => {
  const time = new Date(sessionDateValue(session)).getTime();
  return Number.isNaN(time) ? null : time;
};

const sessionDateInWindow = (session, since, until) => {
  const time = sessionTimestamp(session);
  if (time === null) return false;
  if (time < since.getTime()) return false;
  return time < until.getTime();
};

const sessionLoadContribution = (session) => {
  const duration = Number(session.duration);
  const intensity = sessionEffortRating(session);
  return intensity === null
    ? 0
    : Math.max(0, Number.isFinite(duration) ? duration : 0) * intensity;
};

const recentSessionLoad = (sessions, since, until = new Date()) => sessions
  .filter((session) => sessionDateInWindow(session, since, until))
  .reduce((total, session) => total + sessionLoadContribution(session), 0);

const averageIntensityStatus = (averageIntensity) => {
  if (averageIntensity === null) return 'good';
  if (averageIntensity >= 8) return 'caution';
  return averageIntensity >= 6 ? 'attention' : 'good';
};

const averageIntensityNotes = (intensityValues, averageIntensity) => (
  intensityValues.length
    ? `${averageIntensity}/10 average intensity across rated sessions.`
    : 'No intensity ratings were saved on the recent completed sessions.'
);

const averageIntensityRecommendation = (intensityValues) => (
  intensityValues.length
    ? 'Use this intensity trend when deciding whether to deload or progress.'
    : 'Record intensity/RPE after workouts to improve risk assessment.'
);

const averageDurationStatus = (averageDuration) => (averageDuration > 75 ? 'attention' : 'good');

const averageDurationRecommendation = (averageDuration) => (
  averageDuration > 75
    ? 'Watch fatigue when long sessions stack with pain entries.'
    : 'Duration does not currently flag a high training-load concern.'
);

const completedWorkoutFinding = (sessionRows) => ({
  pattern: 'Completed workout history',
  status: 'good',
  notes: `${sessionRows.length} completed session${sessionRows.length === 1 ? '' : 's'} found in recent history.`,
  recommendation: 'Keep logging completed sessions so risk decisions stay evidence-based.',
});

const averageIntensityFinding = (intensityValues, averageIntensity) => ({
  pattern: 'Average intensity',
  status: averageIntensityStatus(averageIntensity),
  notes: averageIntensityNotes(intensityValues, averageIntensity),
  recommendation: averageIntensityRecommendation(intensityValues),
});

const averageDurationFinding = (averageDuration) => ({
  pattern: 'Average duration',
  status: averageDurationStatus(averageDuration),
  notes: `${averageDuration} minute average workout duration.`,
  recommendation: averageDurationRecommendation(averageDuration),
});

const recoveryScoreFor = (averageIntensity, averageDuration) => (
  clampScore(Math.max((averageIntensity ?? 0) * 10, averageDuration > 75 ? 55 : 20))
);

const recoveryLoadCategory = (sessionRows) => {
  const intensityValues = sessionRows.map(sessionEffortRating).filter((value) => value !== null);
  const durationValues = sessionRows.map((session) => Number(session.duration)).filter((value) => Number.isFinite(value));
  const averageIntensity = intensityValues.length ? mean(intensityValues) : null;
  const averageDuration = durationValues.length ? mean(durationValues) : 0;
  const recoveryScore = recoveryScoreFor(averageIntensity, averageDuration);

  return {
    category: {
      id: 'recovery-load',
      name: 'Recent Recovery Load',
      risk: riskFromScore(recoveryScore),
      score: recoveryScore,
      icon: 'clock',
      findings: [
        completedWorkoutFinding(sessionRows),
        averageIntensityFinding(intensityValues, averageIntensity),
        averageDurationFinding(averageDuration),
      ],
    },
    averageIntensity,
  };
};

const trainingLoadWindows = (sessionRows) => {
  const now = new Date();
  const currentWindowStart = new Date(now);
  currentWindowStart.setDate(currentWindowStart.getDate() - 14);
  const previousWindowStart = new Date(currentWindowStart);
  previousWindowStart.setDate(previousWindowStart.getDate() - 14);
  return {
    currentLoad: recentSessionLoad(sessionRows, currentWindowStart, now),
    previousLoad: recentSessionLoad(sessionRows, previousWindowStart, currentWindowStart),
  };
};

const trainingLoadNote = (currentLoad, previousLoad, loadIncrease) => {
  if (previousLoad > 0) return `${Math.round(loadIncrease)}% load change compared with the prior 14 days.`;
  return currentLoad > 0
    ? 'Not enough prior-window rated training-load data exists for a trend comparison.'
    : 'Not enough rated training-load data exists for a trend comparison.';
};

const loadScoreFrom = (currentLoad, loadIncrease) => {
  if (loadIncrease > 25) return 70;
  return currentLoad > 0 ? 30 : 0;
};

const loadStatusFromScore = (loadScore) => {
  if (loadScore >= 70) return 'caution';
  return loadScore >= 40 ? 'attention' : 'good';
};

const loadRecommendation = (loadScore) => (
  loadScore >= 70
    ? 'Hold progression until the next logged session confirms tolerance.'
    : 'Progression does not currently exceed the configured risk threshold.'
);

const trainingProgressionCategory = (sessionRows) => {
  const { currentLoad, previousLoad } = trainingLoadWindows(sessionRows);
  const loadIncrease = previousLoad > 0 ? ((currentLoad - previousLoad) / previousLoad) * 100 : 0;
  const loadScore = clampScore(loadScoreFrom(currentLoad, loadIncrease));
  return {
    id: 'training-progression',
    name: 'Training Progression',
    risk: riskFromScore(loadScore),
    score: loadScore,
    icon: 'trending-up',
    findings: [{
      pattern: '14-day training load',
      status: loadStatusFromScore(loadScore),
      notes: trainingLoadNote(currentLoad, previousLoad, loadIncrease),
      recommendation: loadRecommendation(loadScore),
    }],
  };
};

export const sessionAssessment = (sessionRows) => {
  if (!sessionRows.length) return { categories: [], alerts: [] };
  const recoveryLoad = recoveryLoadCategory(sessionRows);
  const alerts = recoveryLoad.averageIntensity !== null && recoveryLoad.averageIntensity >= 8 ? [{
    severity: 'medium',
    title: 'High recent intensity',
    description: `${recoveryLoad.averageIntensity}/10 average intensity across rated sessions.`,
    action: 'Review pain entries and recovery before increasing load.',
    timeframe: 'Next session',
  }] : [];
  return {
    categories: [recoveryLoad.category, trainingProgressionCategory(sessionRows)],
    alerts,
  };
};
