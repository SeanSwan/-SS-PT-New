// backend/services/clientProgress/goalTrackingReadModel.mjs

import {
  toIsoDateTime,
  toMetricNumber,
  unwrapRows,
} from './progressScoring.mjs';

const PRIORITY_MAP = {
  high: 'high',
  medium: 'medium',
  low: 'low',
  critical: 'high',
};

const CATEGORY_TYPE_MAP = new Map([
  ['strength', 'performance'],
  ['cardio', 'performance'],
  ['flexibility', 'performance'],
  ['fitness', 'performance'],
  ['habit', 'behavioral'],
  ['streak', 'behavioral'],
  ['sleep', 'behavioral'],
  ['nutrition', 'behavioral'],
]);

const goalProgress = (goal) => Math.max(0, Math.min(
  100,
  Math.round(toMetricNumber(goal.progressPercentage)),
));

const isPastDate = (value) => {
  const date = value ? new Date(value) : null;
  return Boolean(date && !Number.isNaN(date.getTime()) && date < new Date());
};

const rawGoalStatus = (goal) => String(goal?.status || 'active');

const activeGoalStatus = (goal) => {
  if (isPastDate(goal?.deadline)) return 'overdue';
  return 'active';
};

const normalizeGoalStatus = (goal) => {
  const rawStatus = rawGoalStatus(goal);
  const explicitStatus = { completed: 'completed', paused: 'paused' }[rawStatus];
  if (explicitStatus) return explicitStatus;
  if (rawStatus !== 'active') return 'paused';
  return activeGoalStatus(goal);
};

const normalizeGoalPriority = (value) => PRIORITY_MAP[String(value || 'medium')] || 'medium';

const normalizeGoalType = (goal) => {
  const category = String(goal?.category || 'fitness');
  return CATEGORY_TYPE_MAP.get(category) || 'measurable';
};

const valueOrFallback = (value, fallback) => {
  if (value !== undefined && value !== null) return value;
  return fallback;
};

const textOrFallback = (value, fallback) => {
  const text = String(value || '');
  return text || fallback;
};

const isoOrNow = (value) => toIsoDateTime(value) || new Date().toISOString();

const normalizeMilestone = (goal, milestone, index) => ({
  id: String(valueOrFallback(milestone.id, `${goal.id}-milestone-${index + 1}`)),
  title: textOrFallback(milestone.title, `Milestone ${index + 1}`),
  target: toMetricNumber(valueOrFallback(milestone.target, milestone.percentage)),
  current: toMetricNumber(valueOrFallback(milestone.current, goal.currentValue)),
  completed: Boolean(valueOrFallback(milestone.completed, milestone.achieved)),
  date: toIsoDateTime(valueOrFallback(milestone.date, milestone.achievedAt)),
  estimatedDate: toIsoDateTime(milestone.estimatedDate),
});

const normalizeMilestones = (goal) => {
  const milestones = Array.isArray(goal?.milestones) ? goal.milestones : [];
  return milestones.map((milestone, index) => normalizeMilestone(goal, milestone, index));
};

const normalizeProgressHistory = (goal) => {
  const history = Array.isArray(goal?.progressHistory) ? goal.progressHistory : [];
  return history.map((point) => ({
    date: toIsoDateTime(point.date) || toIsoDateTime(goal.updatedAt) || new Date().toISOString(),
    value: toMetricNumber(valueOrFallback(point.value, point.currentValue)),
  }));
};

const goalTrend = (status, progress) => {
  if (status === 'completed') return 'achieved';
  return status === 'overdue' || progress === 0 ? 'stalled' : 'positive';
};

const goalRecommendation = (status) => ({
  completed: 'Goal is completed. Set the next measurable target from the latest workout data.',
  overdue: 'Goal is past its target date. Review recent logs and reset the target or plan.',
}[status] || 'Use recent workout logs to update this goal after the next session.');

const buildGoalInsight = (goal, status, progress) => ({
  trend: goalTrend(status, progress),
  predictedCompletion: toIsoDateTime(valueOrFallback(goal.estimatedCompletionDate, goal.deadline)),
  likelihood: Math.max(0, Math.min(100, toMetricNumber(goal.confidenceLevel) * 10)),
  weeklyRate: toMetricNumber(goal.averageProgressPerWeek),
  recommendation: goalRecommendation(status),
});

const mapGoal = (goal) => {
  const status = normalizeGoalStatus(goal);
  const progress = goalProgress(goal);
  return {
    id: String(goal.id),
    title: textOrFallback(goal.title, 'Untitled Goal'),
    category: textOrFallback(goal.category, 'fitness'),
    type: normalizeGoalType(goal),
    status,
    priority: normalizeGoalPriority(goal.priority),
    progress,
    startDate: isoOrNow(goal.startDate),
    targetDate: isoOrNow(goal.deadline),
    completedDate: toIsoDateTime(goal.completedAt),
    currentValue: toMetricNumber(goal.currentValue),
    targetValue: toMetricNumber(goal.targetValue),
    unit: textOrFallback(goal.unit, 'units'),
    milestones: normalizeMilestones(goal),
    progressHistory: normalizeProgressHistory(goal),
    insights: buildGoalInsight(goal, status, progress),
  };
};

const countByStatus = (goals, status) => goals.filter((goal) => goal.status === status).length;

const averageProgress = (goals) => (goals.length
  ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length)
  : 0);

const latestCompletedGoal = (goals) => goals
  .filter((goal) => goal.status === 'completed')
  .sort((a, b) => new Date(b.completedDate || b.targetDate).getTime() - new Date(a.completedDate || a.targetDate).getTime())[0];

const completedGoalAchievement = (goal) => (goal ? [{
  id: 'completed-goal-recorded',
  title: 'Completed Goal Recorded',
  description: `${goal.title} is marked complete in this client's goal history.`,
  earned: true,
  date: goal.completedDate || goal.targetDate,
  icon: 'trophy',
}] : []);

export const buildGoalTrackingData = ({ goals }) => {
  const mappedGoals = unwrapRows(goals).map(mapGoal);
  const activeGoals = countByStatus(mappedGoals, 'active');
  return {
    summary: {
      totalGoals: mappedGoals.length,
      activeGoals,
      completedGoals: countByStatus(mappedGoals, 'completed'),
      overdueGoals: countByStatus(mappedGoals, 'overdue'),
      averageProgress: averageProgress(mappedGoals),
      onTrackGoals: activeGoals,
    },
    goals: mappedGoals,
    achievements: completedGoalAchievement(latestCompletedGoal(mappedGoals)),
  };
};
