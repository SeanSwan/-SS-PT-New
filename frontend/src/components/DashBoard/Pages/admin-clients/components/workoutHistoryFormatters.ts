const WORKOUT_HISTORY_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

export function formatWorkoutHistoryDate(date: string | undefined | null): string {
  if (!date) return '';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleDateString('en-US', WORKOUT_HISTORY_DATE_FORMAT);
}

export function formatWorkoutHistoryVolume(totalWeight: number): string {
  return `${Math.round(totalWeight).toLocaleString()} lbs`;
}
