export interface ExerciseHistoryItem {
  exerciseId: number;
  exerciseName: string;
  primaryMuscles: string;
  category: string;
  timesPerformed: number;
  maxWeight: number;
  maxReps: number;
  totalVolume: number;
  lastPerformedDate: string;
  firstPerformedDate: string;
}

export type ExerciseHistorySortOption =
  | 'timesPerformed'
  | 'totalVolume'
  | 'lastPerformed'
  | 'alphabetical';

const toTrimmedString = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

export const toNonNegativeFinite = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : fallback;
};

export function sanitizeExerciseHistoryItems(input: unknown): ExerciseHistoryItem[] {
  if (!Array.isArray(input)) return [];

  return input.reduce<ExerciseHistoryItem[]>((items, raw, index) => {
    if (!raw || typeof raw !== 'object') return items;
    const row = raw as Record<string, unknown>;
    const exerciseName = toTrimmedString(row.exerciseName);
    if (!exerciseName) return items;

    const timesPerformed = toNonNegativeFinite(row.timesPerformed);
    const totalVolume = toNonNegativeFinite(row.totalVolume);
    if (timesPerformed <= 0 && totalVolume <= 0) return items;

    items.push({
      exerciseId: Math.round(toNonNegativeFinite(row.exerciseId, index + 1)),
      exerciseName,
      primaryMuscles: toTrimmedString(row.primaryMuscles, 'Unknown'),
      category: toTrimmedString(row.category, 'Unknown'),
      timesPerformed,
      maxWeight: toNonNegativeFinite(row.maxWeight),
      maxReps: toNonNegativeFinite(row.maxReps),
      totalVolume,
      lastPerformedDate: toTrimmedString(row.lastPerformedDate),
      firstPerformedDate: toTrimmedString(row.firstPerformedDate),
    });

    return items;
  }, []);
}

export function getExerciseHistoryBarValue(
  item: ExerciseHistoryItem,
  sort: ExerciseHistorySortOption,
): number {
  return sort === 'totalVolume' ? item.totalVolume : item.timesPerformed;
}

export function getExerciseHistoryBarLabel(
  item: ExerciseHistoryItem,
  sort: ExerciseHistorySortOption,
): string {
  if (sort === 'totalVolume') {
    return `${(item.totalVolume / 1000).toFixed(1)}k lbs`;
  }
  return `${item.timesPerformed}x`;
}

export function clampExerciseHistoryPercent(value: number): number {
  return Number.isFinite(value) ? Math.max(Math.min(value, 100), 0) : 0;
}
