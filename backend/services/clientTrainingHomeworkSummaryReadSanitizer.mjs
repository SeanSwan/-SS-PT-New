/**
 * Client Training Homework Summary Read Sanitizer
 * ==============================================
 *
 * Produces the zero-PII Swan Coach homework summary shape from the shared
 * client training read model. This keeps planner context limited to IDs,
 * counts, dates, status, and read-only coaching guidance.
 */

const valueOr = (value, fallback) => (
  value === undefined || value === null ? fallback : value
);
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const toDateOnly = (value) => {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(valueOr(value, ''));
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : null;
};

const summarizeRecentHomeworkCompletion = (completion = {}) => ({
  assignmentType: valueOr(completion.assignmentType, 'homework'),
  assignmentKey: valueOr(completion.assignmentKey, completion.assignmentId ?? null),
  formId: valueOr(completion.formId, null),
  completedAt: toDateOnly(completion.completedAt),
  weekNumber: valueOr(completion.weekNumber, null),
  dayNumber: valueOr(completion.dayNumber, null),
  exerciseCount: toNumber(completion.exerciseCount),
  firstExerciseName: valueOr(completion.firstExerciseName, null),
});

const HOMEWORK_ACCOUNTABILITY_STATUSES = {
  completed_today: {
    key: 'completed_today',
    label: 'Completed today',
    priority: 'review',
    coachDirective: 'Review the logged homework before suggesting optional next work.',
  },
  due_today: {
    key: 'due_today',
    label: 'Due today',
    priority: 'log_prompt',
    coachDirective: 'Encourage the client to log the assigned homework; do not mark it complete.',
  },
  recently_completed: {
    key: 'recently_completed',
    label: 'Recently completed',
    priority: 'momentum',
    coachDirective: 'Use recent homework completion as readiness evidence for planning.',
  },
  no_homework: {
    key: 'no_homework',
    label: 'No homework assigned',
    priority: 'plan_review',
    coachDirective: 'Review the active plan before inventing off-day work.',
  },
};

const HOMEWORK_ACCOUNTABILITY_RULES = [
  {
    status: HOMEWORK_ACCOUNTABILITY_STATUSES.completed_today,
    matches: (summary) => summary.todayIsCompleted || summary.todayStatus === 'completed',
  },
  {
    status: HOMEWORK_ACCOUNTABILITY_STATUSES.due_today,
    matches: (summary) => summary.todayIsLoggable && summary.assignmentType !== 'none',
  },
  {
    status: HOMEWORK_ACCOUNTABILITY_STATUSES.recently_completed,
    matches: (summary) => summary.recentCompletedCount > 0,
  },
];

const buildHomeworkAccountabilityStatus = (safeSummary) => {
  const matchedRule = HOMEWORK_ACCOUNTABILITY_RULES.find((rule) => rule.matches(safeSummary));
  return valueOr(matchedRule?.status, HOMEWORK_ACCOUNTABILITY_STATUSES.no_homework);
};

const summarizeRecentHomeworkCompletions = (recentCompletions) => (
  (Array.isArray(recentCompletions) ? recentCompletions : [])
    .slice(0, 3)
    .map(summarizeRecentHomeworkCompletion)
);

export const summarizeHomeworkSummary = (summary = {}) => {
  const safeSummary = {
    assignmentType: valueOr(summary.assignmentType, 'none'),
    todayStatus: valueOr(summary.todayStatus, 'none'),
    todayIsCompleted: summary.todayIsCompleted === true,
    todayIsLoggable: summary.todayIsLoggable === true,
    todayShouldDeductSession: summary.todayShouldDeductSession === true,
    todayWeekNumber: valueOr(summary.todayWeekNumber, null),
    todayDayNumber: valueOr(summary.todayDayNumber, null),
    todayExerciseCount: toNumber(summary.todayExerciseCount),
    todayFirstExerciseName: valueOr(summary.todayFirstExerciseName, null),
    recentCompletedCount: toNumber(summary.recentCompletedCount),
    lastCompletedAt: toDateOnly(summary.lastCompletedAt),
    recentCompletions: summarizeRecentHomeworkCompletions(summary.recentCompletions),
  };

  return {
    ...safeSummary,
    accountabilityStatus: buildHomeworkAccountabilityStatus(safeSummary),
  };
};
