/**
 * Runtime sanitizers for client progress chart payloads.
 *
 * Victory turns missing or non-finite x/y values into SVG NaN coordinates.
 * These helpers keep the typed 15-chart contract honest at the API boundary.
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

export interface RawAttendanceBundle {
  data?: unknown;
  reliabilityPercent?: unknown;
  totals?: unknown;
}

export interface RawSetsRepsBundle {
  sets?: unknown;
  reps?: unknown;
}

export interface RawAnchorLiftsBundle {
  data?: unknown;
  exercises?: unknown;
}

export interface RawEstOneRmBundle {
  exercise?: unknown;
  data?: unknown;
}

export interface RawClientProgressChartsBundle {
  workoutFrequency?: unknown;
  attendanceReliability?: RawAttendanceBundle | null;
  weeklyVolume?: unknown;
  setsRepsTrend?: RawSetsRepsBundle | null;
  durationTrend?: unknown;
  intensityRpeTrend?: unknown;
  prTimeline?: unknown;
  anchorLifts?: RawAnchorLiftsBundle | null;
  exerciseFrequency?: unknown;
  movementPatternBalance?: unknown;
  muscleGroupBalance?: unknown;
  recoverySignal?: unknown;
  weightTrend?: unknown;
  bodyFatTrend?: unknown;
  estOneRm?: RawEstOneRmBundle | null;
}

const isRawPoint = (value: unknown): value is RawPoint =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const toArray = (value: unknown): RawPoint[] => (Array.isArray(value) ? value.filter(isRawPoint) : []);

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPositiveNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const toLabel = (value: unknown, fallback: string): string => {
  return typeof value === 'string' && value.trim() ? value : fallback;
};

const toSource = (value: unknown): 'rpe' | 'intensity' => {
  return value === 'rpe' || value === 'intensity' ? value : 'intensity';
};

const point = <T extends object>(raw: RawPoint, index: number, extra: RawPoint = {}): T | null => {
  const y = toPositiveNumber(raw.y);
  if (y === null) return null;
  // Rebuilds each point as a fresh {x, y} — extra endpoint fields (e.g. the
  // duration-trend `ts` raw timestamp) are INTENTIONALLY dropped here. Bundle
  // consumers are all x/y line charts; anything that needs day-level truth
  // (the workout heatmap) must fetch the endpoint directly, not this bundle.
  return {
    ...extra,
    x: toLabel(raw.x, `Point ${index + 1}`),
    y,
  } as unknown as T;
};

const points = <T extends object>(
  value: unknown,
  extra?: (raw: RawPoint, index: number) => RawPoint,
): T[] => toArray(value)
  .map((raw, index) => point<T>(raw, index, extra?.(raw, index)))
  .filter((row): row is T => row !== null);

// Balance charts (muscle-group, movement-pattern) answer "did you train this
// area", NOT "how much did you lift". A bucket with real logged sets but ZERO
// volume is bodyweight training — push-ups (Chest), planks (Core), pull-ups
// (Back), air squats (Legs) all record weight 0, so weight*reps = 0. The shared
// `point()` helper drops y<=0 (correct for volume/trend axes), which would make
// a client who did 8 sets of push-ups see their Chest bar VANISH — the chart
// then lies that they skipped chest. Keep the bucket whenever sets>0 even at
// zero volume; the plotted y floors at 0. ~25% of real logged sets are
// bodyweight, so this is a routine truth case, not an edge case.
const balancePoints = <T extends object>(
  value: unknown,
  meta: (raw: RawPoint, index: number) => RawPoint & { sets: number },
): T[] => toArray(value)
  .map((raw, index) => {
    const extra = meta(raw, index);
    const y = toFiniteNumber(raw.y, 0);
    if (!(y > 0) && !(extra.sets > 0)) return null;
    return {
      ...extra,
      x: toLabel(raw.x, `Point ${index + 1}`),
      y: Math.max(0, y),
    } as unknown as T;
  })
  .filter((row): row is T => row !== null);

const EMPTY_ATTENDANCE = {
  data: [],
  reliabilityPercent: 0,
  totals: { completed: 0, skipped: 0, cancelled: 0, resolved: 0 },
};

const EMPTY_SETS_REPS = { sets: [], reps: [] };

const EMPTY_ANCHOR_LIFTS = { data: {}, exercises: [] };

export function sanitizeClientProgressChartsBundle(raw: RawClientProgressChartsBundle): CanonicalProgressCharts {
  const attendance = isRawPoint(raw.attendanceReliability)
    ? raw.attendanceReliability
    : EMPTY_ATTENDANCE;
  const attendanceTotals = isRawPoint(attendance.totals)
    ? attendance.totals
    : EMPTY_ATTENDANCE.totals;
  const setsReps = isRawPoint(raw.setsRepsTrend) ? raw.setsRepsTrend : EMPTY_SETS_REPS;
  const anchor = isRawPoint(raw.anchorLifts) ? raw.anchorLifts : EMPTY_ANCHOR_LIFTS;
  const rawAnchorData = isRawPoint(anchor.data) ? anchor.data : {};

  const anchorData = Object.fromEntries(
    Object.entries(rawAnchorData)
      .map(([name, rows]) => [
        name,
        points<AnchorLiftPoint>(rows, (row) => ({ reps: toFiniteNumber(row.reps) })),
      ] as const)
      .filter(([, rows]) => rows.length > 0),
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
      exercises: anchorExercises.filter((name) => anchorData[name]?.length > 0),
    },
    exerciseFrequency: points<ExerciseFrequencyPoint>(raw.exerciseFrequency, (row) => ({ sets: toFiniteNumber(row.sets) })),
    movementPatternBalance: balancePoints<MovementPatternPoint>(raw.movementPatternBalance, (row) => ({ sets: toFiniteNumber(row.sets) })),
    muscleGroupBalance: balancePoints<MuscleGroupPoint>(raw.muscleGroupBalance, (row) => ({ sets: toFiniteNumber(row.sets) })),
    recoverySignal: points<RecoveryPoint>(raw.recoverySignal, (row) => ({
      painFlags: toFiniteNumber(row.painFlags),
      highRpeFlags: toFiniteNumber(row.highRpeFlags),
      totalSets: toFiniteNumber(row.totalSets),
    })),
    weightTrend: points<ChartPoint>(raw.weightTrend),
    bodyFatTrend: points<ChartPoint>(raw.bodyFatTrend),
    estOneRm: {
      exercise: typeof raw.estOneRm?.exercise === 'string' && raw.estOneRm.exercise.trim()
        ? raw.estOneRm.exercise
        : null,
      data: points<ChartPoint>(raw.estOneRm?.data),
    },
  };
}
