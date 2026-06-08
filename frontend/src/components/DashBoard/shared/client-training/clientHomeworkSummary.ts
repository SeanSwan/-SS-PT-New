/**
 * Client Training Homework Summary
 * ===============================
 *
 * Shared read-only contract and display helpers for off-day homework history.
 * The backend summary is intentionally zero-PII, so this module only accepts
 * IDs, dates, counts, plan position, and exercise labels already approved for UI.
 */

export interface ClientHomeworkCompletion {
  completedAt: string | null;
  scheduledDate: string | null;
  weekNumber: number | null;
  dayNumber: number | null;
  exerciseCount: number;
  firstExerciseName: string | null;
}

export interface ClientHomeworkSummary {
  assignmentType: string;
  todayStatus: string;
  todayIsCompleted: boolean;
  todayIsLoggable: boolean;
  todayShouldDeductSession: boolean;
  todayWeekNumber: number | null;
  todayDayNumber: number | null;
  todayExerciseCount: number;
  todayFirstExerciseName: string | null;
  recentCompletedCount: number;
  lastCompletedAt: string | null;
  recentCompletions: ClientHomeworkCompletion[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const positiveIntegerOrFallback = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const positiveIntegerOrNull = (value: unknown) => positiveIntegerOrFallback(value, 0) || null;

const stringOrNull = (value: unknown) => (
  typeof value === 'string' && value.trim() ? value : null
);

const normalizeHomeworkCompletion = (value: unknown): ClientHomeworkCompletion => {
  const completion = isRecord(value) ? value : {};
  return {
    completedAt: stringOrNull(completion.completedAt),
    scheduledDate: stringOrNull(completion.scheduledDate),
    weekNumber: positiveIntegerOrNull(completion.weekNumber),
    dayNumber: positiveIntegerOrNull(completion.dayNumber),
    exerciseCount: positiveIntegerOrFallback(completion.exerciseCount, 0),
    firstExerciseName: stringOrNull(completion.firstExerciseName),
  };
};

const normalizeRecentCompletions = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).map(normalizeHomeworkCompletion);
};

export const normalizeClientHomeworkSummary = (value: unknown): ClientHomeworkSummary | null => {
  if (!isRecord(value)) return null;
  return {
    assignmentType: stringOrNull(value.assignmentType) || 'none',
    todayStatus: stringOrNull(value.todayStatus) || 'none',
    todayIsCompleted: value.todayIsCompleted === true,
    todayIsLoggable: value.todayIsLoggable === true,
    todayShouldDeductSession: value.todayShouldDeductSession === true,
    todayWeekNumber: positiveIntegerOrNull(value.todayWeekNumber),
    todayDayNumber: positiveIntegerOrNull(value.todayDayNumber),
    todayExerciseCount: positiveIntegerOrFallback(value.todayExerciseCount, 0),
    todayFirstExerciseName: stringOrNull(value.todayFirstExerciseName),
    recentCompletedCount: positiveIntegerOrFallback(value.recentCompletedCount, 0),
    lastCompletedAt: stringOrNull(value.lastCompletedAt),
    recentCompletions: normalizeRecentCompletions(value.recentCompletions),
  };
};

const completionDateValue = (completion?: ClientHomeworkCompletion | null) => {
  if (!completion) return null;
  return completion.completedAt || completion.scheduledDate;
};

const parseDisplayDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const formatHomeworkCompletionDate = (
  completion?: ClientHomeworkCompletion | null,
): string => {
  const date = parseDisplayDate(completionDateValue(completion));
  if (!date) return 'Date pending';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const completionPositionParts = (completion?: ClientHomeworkCompletion | null) => {
  if (!completion) return [];
  const parts: string[] = [];
  if (completion.weekNumber) parts.push(`Week ${completion.weekNumber}`);
  if (completion.dayNumber) parts.push(`Day ${completion.dayNumber}`);
  return parts;
};

export const formatHomeworkCompletionPosition = (
  completion?: ClientHomeworkCompletion | null,
  separator = ' - ',
  fallback = 'Recent log',
): string => {
  const parts = completionPositionParts(completion);
  if (!parts.length) return fallback;
  return parts.join(separator);
};

const completionCountLabel = (completion?: ClientHomeworkCompletion | null) => {
  if (!completion) return '';
  if (completion.exerciseCount <= 0) return 'Workout logged';
  return `${completion.exerciseCount} exercise${completion.exerciseCount === 1 ? '' : 's'}`;
};

const firstExerciseSuffix = (name: string | null, startsWith: boolean) => {
  if (!name) return '';
  return startsWith ? ` - starts with ${name}` : ` - ${name}`;
};

export const formatHomeworkCompletionExerciseLabel = (
  completion?: ClientHomeworkCompletion | null,
  options: { startsWith?: boolean } = {},
): string => {
  const countLabel = completionCountLabel(completion);
  if (!completion) return countLabel;
  if (countLabel === 'Workout logged') return countLabel;
  return `${countLabel}${firstExerciseSuffix(completion.firstExerciseName, options.startsWith === true)}`;
};
