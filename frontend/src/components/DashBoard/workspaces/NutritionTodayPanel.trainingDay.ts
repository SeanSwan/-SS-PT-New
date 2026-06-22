import { formatLocalCalendarDate } from './clients-team/nutritionDate';

const loggedWorkoutDateKeys = ['date', 'completedAt', 'workoutDate'] as const;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toLocalDateKey = (value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'string' && ISO_DATE_PATTERN.test(value)) return value;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? formatLocalCalendarDate(date) : null;
};

export const hasWorkoutLoggedOnDate = (sessions: unknown[] | null | undefined, targetDate?: string | null): boolean => {
  if (!targetDate || !ISO_DATE_PATTERN.test(targetDate)) return false;

  return (sessions || []).some((session) => {
    if (!session || typeof session !== 'object') return false;
    const record = session as Record<string, unknown>;
    return loggedWorkoutDateKeys.some((key) => toLocalDateKey(record[key]) === targetDate);
  });
};
