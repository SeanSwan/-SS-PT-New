/**
 * Client homework summary read sanitizer.
 * =======================================
 *
 * Produces the zero-PII Swan Coach homework summary shape from the shared
 * client training read model.
 */

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateOnly = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const summarizeRecentHomeworkCompletion = (completion = {}) => ({
  assignmentType: completion.assignmentType ?? 'homework',
  assignmentKey: completion.assignmentKey ?? completion.assignmentId ?? null,
  formId: completion.formId ?? null,
  completedAt: toDateOnly(completion.completedAt),
  weekNumber: completion.weekNumber ?? null,
  dayNumber: completion.dayNumber ?? null,
  exerciseCount: toNumber(completion.exerciseCount),
  firstExerciseName: completion.firstExerciseName ?? null,
});

export const summarizeHomeworkSummary = (summary = {}) => ({
  assignmentType: summary.assignmentType ?? 'none',
  todayStatus: summary.todayStatus ?? 'none',
  todayIsCompleted: summary.todayIsCompleted === true,
  todayIsLoggable: summary.todayIsLoggable === true,
  todayShouldDeductSession: summary.todayShouldDeductSession === true,
  todayWeekNumber: summary.todayWeekNumber ?? null,
  todayDayNumber: summary.todayDayNumber ?? null,
  todayExerciseCount: toNumber(summary.todayExerciseCount),
  todayFirstExerciseName: summary.todayFirstExerciseName ?? null,
  recentCompletedCount: toNumber(summary.recentCompletedCount),
  lastCompletedAt: toDateOnly(summary.lastCompletedAt),
  recentCompletions: Array.isArray(summary.recentCompletions)
    ? summary.recentCompletions.slice(0, 3).map(summarizeRecentHomeworkCompletion)
    : [],
});
