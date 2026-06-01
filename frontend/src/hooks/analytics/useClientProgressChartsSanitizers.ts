/**
 * Runtime sanitizers for client progress chart payloads.
 *
 * Victory turns missing or non-finite x/y values into SVG NaN coordinates.
 * These helpers keep the typed 12-chart contract honest at the API boundary.
 */
import type {
  AnchorLiftPoint,
  CanonicalProgressCharts,
  ChartPoint,
  ExerciseFrequencyPoint,
  IntensityPoint,
  MovementPatternPoint,
  MuscleGroupPoint,
  PRPoint,
  RecoveryPoint,
  WeeklyVolumePoint,
} from './useClientProgressCharts.types';

type RawPoint = Record<string, unknown>;

const toArray = (value: unknown): RawPoint[] => (Array.isArray(value) ? value : []);

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toLabel = (value: unknown, fallback: string): string => {
  return typeof value === 'string' && value.trim() ? value : fallback;
};

const toSource = (value: unknown): 'rpe' | 'intensity' => {
  return value === 'rpe' || value === 'intensity' ? value : 'intensity';
};

const point = <T extends object>(raw: RawPoint, index: number, extra: RawPoint = {}): T => ({
  ...extra,
  x: toLabel(raw.x, `Point ${index + 1}`),
  y: toFiniteNumber(raw.y),
} as unknown as T);

const points = <T extends object>(
  value: unknown,
  extra?: (raw: RawPoint, index: number) => RawPoint,
): T[] => toArray(value).map((raw, index) => point<T>(raw, index, extra?.(raw, index)));

const EMPTY_ATTENDANCE = {
  data: [],
  reliabilityPercent: 0,
  totals: { completed: 0, skipped: 0, cancelled: 0, resolved: 0 },
};

const EMPTY_SETS_REPS = { sets: [], reps: [] };

const EMPTY_ANCHOR_LIFTS = { data: {}, exercises: [] };

export function sanitizeClientProgressChartsBundle(raw: Partial<CanonicalProgressCharts>): CanonicalProgressCharts {
  const attendance = raw.attendanceReliability || EMPTY_ATTENDANCE;
  const attendanceTotals = attendance.totals || EMPTY_ATTENDANCE.totals;
  const setsReps = raw.setsRepsTrend || EMPTY_SETS_REPS;
  const anchor = raw.anchorLifts || EMPTY_ANCHOR_LIFTS;
  const rawAnchorData =
    anchor.data && typeof anchor.data === 'object' && !Array.isArray(anchor.data)
      ? anchor.data
      : {};

  const anchorData = Object.fromEntries(
    Object.entries(rawAnchorData).map(([name, rows]) => [
      name,
      points<AnchorLiftPoint>(rows, (row) => ({ reps: toFiniteNumber(row.reps) })),
    ]),
  ) as Record<string, AnchorLiftPoint[]>;
  const anchorExercises = Array.isArray(anchor.exercises)
    ? anchor.exercises.filter((name): name is string => typeof name === 'string' && !!name.trim())
    : Object.keys(anchorData);

  return {
    workoutFrequency: points<ChartPoint>(raw.workoutFrequency),
    attendanceReliability: {
      data: points<ChartPoint>(attendance.data),
      reliabilityPercent: toFiniteNumber(attendance.reliabilityPercent),
      totals: {
        completed: toFiniteNumber(attendanceTotals.completed),
        skipped: toFiniteNumber(attendanceTotals.skipped),
        cancelled: toFiniteNumber(attendanceTotals.cancelled),
        resolved: toFiniteNumber(attendanceTotals.resolved),
      },
    },
    weeklyVolume: points<WeeklyVolumePoint>(raw.weeklyVolume, (row) => ({ workouts: toFiniteNumber(row.workouts) })),
    setsRepsTrend: {
      sets: points<ChartPoint>(setsReps.sets),
      reps: points<ChartPoint>(setsReps.reps),
    },
    durationTrend: points<ChartPoint>(raw.durationTrend),
    intensityRpeTrend: points<IntensityPoint>(raw.intensityRpeTrend, (row) => ({ source: toSource(row.source) })),
    prTimeline: points<PRPoint>(raw.prTimeline, (row) => ({
      exercise: toLabel(row.exercise, 'Unknown exercise'),
      reps: toFiniteNumber(row.reps),
    })),
    anchorLifts: {
      data: anchorData,
      exercises: anchorExercises.filter((name) => Object.prototype.hasOwnProperty.call(anchorData, name)),
    },
    exerciseFrequency: points<ExerciseFrequencyPoint>(raw.exerciseFrequency, (row) => ({ sets: toFiniteNumber(row.sets) })),
    movementPatternBalance: points<MovementPatternPoint>(raw.movementPatternBalance, (row) => ({ sets: toFiniteNumber(row.sets) })),
    muscleGroupBalance: points<MuscleGroupPoint>(raw.muscleGroupBalance, (row) => ({ sets: toFiniteNumber(row.sets) })),
    recoverySignal: points<RecoveryPoint>(raw.recoverySignal, (row) => ({
      painFlags: toFiniteNumber(row.painFlags),
      highRpeFlags: toFiniteNumber(row.highRpeFlags),
      totalSets: toFiniteNumber(row.totalSets),
    })),
  };
}
