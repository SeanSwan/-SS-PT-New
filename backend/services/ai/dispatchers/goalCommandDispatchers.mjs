/**
 * Goal command dispatchers
 * ========================
 * Coach command handlers for selected-client goal reads and writes. Results
 * stay compact so free-form titles, descriptions, and notes are not echoed
 * back through the AI command receipt.
 */
import { Op } from 'sequelize';
import { getAllModels } from '../../../models/index.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const GOAL_STATUSES = ['draft', 'active', 'completed', 'paused', 'cancelled', 'failed'];

const toGoalNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const goalPercent = (currentValue, targetValue) => {
  const current = toGoalNumber(currentValue);
  const target = toGoalNumber(targetValue);
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
};

const goalProgress = (goal) => {
  if (goal?.progressPercentage !== undefined && goal?.progressPercentage !== null) {
    return Math.max(0, Math.min(100, Math.round(toGoalNumber(goal.progressPercentage))));
  }
  return goalPercent(goal?.currentValue, goal?.targetValue);
};

const asPlain = (goal) => (goal?.toJSON ? goal.toJSON() : goal);

const isOverdue = (goal) => {
  if (goal?.status === 'completed' || !goal?.deadline) return false;
  const deadline = new Date(goal.deadline);
  return !Number.isNaN(deadline.getTime()) && deadline < new Date();
};

export const dispatchViewGoals = async (params, ctx) => {
  const { Goal } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const goals = await Goal.findAll({
    where: {
      userId: clientId,
      status: { [Op.in]: GOAL_STATUSES },
    },
    order: [['updatedAt', 'DESC']],
    limit: 100,
  });

  const rows = goals.map(asPlain);
  const totalGoals = rows.length;
  const completedGoals = rows.filter((goal) => goal.status === 'completed').length;
  const overdueGoals = rows.filter(isOverdue).length;
  const activeGoals = rows.filter((goal) => goal.status === 'active').length;
  const averageProgress = totalGoals
    ? Math.round(rows.reduce((sum, goal) => sum + goalProgress(goal), 0) / totalGoals)
    : 0;

  return {
    clientId,
    totalGoals,
    activeGoals,
    completedGoals,
    overdueGoals,
    averageProgress,
    firstGoalId: rows[0]?.id ?? null,
  };
};

export const dispatchCreateGoal = async (params, ctx) => {
  const { Goal } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const targetValue = toGoalNumber(params.targetValue);
  const currentValue = Math.max(0, toGoalNumber(params.currentValue));
  const progressPercentage = goalPercent(currentValue, targetValue);
  const now = new Date();
  const status = params.status || (progressPercentage >= 100 ? 'completed' : 'active');
  const notes = typeof params.notes === 'string' && params.notes.trim() ? params.notes.trim() : null;

  const goal = await Goal.create({
    userId: clientId,
    title: params.title,
    description: params.description || null,
    targetValue,
    currentValue,
    unit: params.unit,
    category: params.category || 'fitness',
    priority: params.priority || 'medium',
    status,
    deadline: new Date(params.deadline),
    progressPercentage,
    progressHistory: currentValue > 0 ? [{
      date: now.toISOString(),
      value: currentValue,
      change: currentValue,
      percentage: progressPercentage,
      notes,
    }] : [],
    completedAt: status === 'completed' ? now : null,
    lastProgressUpdate: currentValue > 0 ? now : null,
  });

  return {
    clientId,
    goalId: goal.id,
    created: true,
    status: goal.status ?? status,
    progressPercentage: toGoalNumber(goal.progressPercentage ?? progressPercentage),
  };
};

export const dispatchUpdateGoalProgress = async (params, ctx) => {
  const { Goal } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const goalId = String(params.goalId);
  const goal = await Goal.findOne({ where: { userId: clientId, id: goalId } });

  if (!goal) {
    return {
      clientId,
      goalId,
      found: false,
      updated: false,
      progressPercentage: null,
      status: null,
    };
  }

  const existing = asPlain(goal);
  const targetValue = toGoalNumber(existing.targetValue);
  const previousCurrent = toGoalNumber(existing.currentValue);
  const currentValue = params.currentValue !== undefined
    ? Math.max(0, toGoalNumber(params.currentValue))
    : Math.max(0, targetValue * (toGoalNumber(params.progress) / 100));
  const progressPercentage = params.progress !== undefined
    ? Math.round(toGoalNumber(params.progress))
    : goalPercent(currentValue, targetValue);
  const now = new Date();
  const notes = typeof params.notes === 'string' && params.notes.trim() ? params.notes.trim() : null;
  const nextStatus = progressPercentage >= 100 && ['active', 'paused'].includes(existing.status)
    ? 'completed'
    : existing.status;

  goal.set({
    currentValue,
    progressPercentage,
    status: nextStatus,
    progressHistory: [
      ...(Array.isArray(existing.progressHistory) ? existing.progressHistory : []),
      {
        date: now.toISOString(),
        value: currentValue,
        change: currentValue - previousCurrent,
        percentage: progressPercentage,
        notes,
      },
    ],
    completedAt: nextStatus === 'completed' ? (existing.completedAt || now) : existing.completedAt || null,
    lastProgressUpdate: now,
  });
  await goal.save();

  return {
    clientId,
    goalId,
    found: true,
    updated: true,
    progressPercentage,
    status: nextStatus,
  };
};
