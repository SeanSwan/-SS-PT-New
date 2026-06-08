/**
 * ============================================================================
 * FILE: userGoalAnalyticsService.mjs
 * PURPOSE: Build authenticated-user goal analytics for the mounted goals route.
 * AUTHOR: Codex | LAST MODIFIED: 2026-06-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Reads the current user's Goal rows and converts them into a compact dashboard
 * analytics payload. This keeps /api/goals/analytics separate from the
 * single-goal analytics controller, which expects a goal id.
 *
 * HOW IT FITS IN THE APP:
 * goalRoutes -> getUserGoalAnalytics -> Goal.findAll -> analytics JSON.
 *
 * KEY DECISIONS:
 * The service uses only fields declared by backend/models/Goal.mjs. It does not
 * invent a deleted status or expose raw model objects to callers.
 */

export const USER_GOAL_ANALYTICS_FIELDS = [
  'id',
  'category',
  'status',
  'progressPercentage',
  'deadline',
  'completedAt',
];

const emptyAnalytics = () => ({
  totalGoals: 0,
  activeGoals: 0,
  completedGoals: 0,
  pausedGoals: 0,
  averageProgress: 0,
  completionRate: 0,
  nearestDeadline: null,
  goalsAtRisk: 0,
  categoryBreakdown: [],
});

const roundTwo = (value) => Number(value.toFixed(2));

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const statusOf = (goal) => String(goal?.status || '').toLowerCase();

const categoryOf = (goal) => {
  const category = String(goal?.category || '').trim();
  return category || 'custom';
};

const isAtRisk = (goal, now) => {
  const status = statusOf(goal);
  if (status === 'completed' || status === 'cancelled' || status === 'failed') return false;

  const progress = toNumber(goal?.progressPercentage);
  const deadline = toDate(goal?.deadline);
  if (!deadline) return progress < 25;

  const daysRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return progress < 25 || daysRemaining <= 14;
};

export const buildGoalAnalyticsFromRows = (goals = [], options = {}) => {
  const now = options.now instanceof Date ? options.now : new Date();
  if (!Array.isArray(goals) || goals.length === 0) return emptyAnalytics();

  const categoryStats = new Map();
  let progressTotal = 0;
  let completedGoals = 0;
  let activeGoals = 0;
  let pausedGoals = 0;
  let goalsAtRisk = 0;
  let nearestDeadline = null;

  goals.forEach((goal) => {
    const status = statusOf(goal);
    const category = categoryOf(goal);
    const progress = toNumber(goal?.progressPercentage);
    const deadline = toDate(goal?.deadline);

    progressTotal += progress;
    if (status === 'completed') completedGoals += 1;
    if (status === 'active') activeGoals += 1;
    if (status === 'paused') pausedGoals += 1;
    if (isAtRisk(goal, now)) goalsAtRisk += 1;

    if (deadline && status !== 'completed' && (!nearestDeadline || deadline < nearestDeadline)) {
      nearestDeadline = deadline;
    }

    const current = categoryStats.get(category) || { total: 0, completed: 0, progressTotal: 0 };
    current.total += 1;
    current.completed += status === 'completed' ? 1 : 0;
    current.progressTotal += progress;
    categoryStats.set(category, current);
  });

  const totalGoals = goals.length;
  const categoryBreakdown = Array.from(categoryStats.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, stats]) => ({
      category,
      total: stats.total,
      completed: stats.completed,
      averageProgress: roundTwo(stats.progressTotal / stats.total),
    }));

  return {
    totalGoals,
    activeGoals,
    completedGoals,
    pausedGoals,
    averageProgress: roundTwo(progressTotal / totalGoals),
    completionRate: roundTwo((completedGoals / totalGoals) * 100),
    nearestDeadline: nearestDeadline ? nearestDeadline.toISOString() : null,
    goalsAtRisk,
    categoryBreakdown,
  };
};

/**
 * Return dashboard analytics for one authenticated user's goals.
 *
 * @param {{ Goal?: { findAll: Function }, userId: number|string, now?: Date }} params
 * @returns {Promise<object>} Safe analytics payload for /api/goals/analytics.
 */
export const getUserGoalAnalytics = async ({ Goal, userId, now } = {}) => {
  if (!Goal || !userId) return emptyAnalytics();

  const goals = await Goal.findAll({
    where: { userId },
    attributes: USER_GOAL_ANALYTICS_FIELDS,
    raw: true,
  });

  return buildGoalAnalyticsFromRows(goals, { now });
};
