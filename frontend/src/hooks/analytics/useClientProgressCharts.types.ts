/**
 * ============================================================================
 * FILE: useClientProgressCharts.types.ts
 * PURPOSE: Canonical chart IDs, endpoint suffixes, and response contracts for
 * the client progress chart hook.
 * ============================================================================
 */

export const CANONICAL_CHART_IDS = [
  'workoutFrequency',
  'attendanceReliability',
  'weeklyVolume',
  'setsRepsTrend',
  'durationTrend',
  'intensityRpeTrend',
  'prTimeline',
  'anchorLifts',
  'exerciseFrequency',
  'movementPatternBalance',
  'muscleGroupBalance',
  'recoverySignal',
  'weightTrend',
  'bodyFatTrend',
  'estOneRm',
] as const;

export type CanonicalChartId = typeof CANONICAL_CHART_IDS[number];

/**
 * Explicit route suffixes avoid fragile string transforms and keep frontend
 * chart IDs grep-aligned with backend `/api/client/analytics/chart-*` routes.
 */
export const CANONICAL_CHART_ROUTES: Record<CanonicalChartId, string> = {
  workoutFrequency: 'chart-workout-frequency',
  attendanceReliability: 'chart-attendance-reliability',
  weeklyVolume: 'chart-weekly-volume',
  setsRepsTrend: 'chart-sets-reps-trend',
  durationTrend: 'chart-duration-trend',
  intensityRpeTrend: 'chart-intensity-rpe-trend',
  prTimeline: 'chart-pr-timeline',
  anchorLifts: 'chart-anchor-lifts',
  exerciseFrequency: 'chart-exercise-frequency',
  movementPatternBalance: 'chart-movement-pattern-balance',
  muscleGroupBalance: 'chart-muscle-group-balance',
  recoverySignal: 'chart-recovery-signal',
  weightTrend: 'chart-weight-progression',
  bodyFatTrend: 'chart-body-fat-trend',
  estOneRm: 'chart-est-one-rm',
};

export interface ChartPoint {
  x: string;
  y: number;
}

export interface WeeklyVolumePoint extends ChartPoint {
  workouts: number;
}

export interface ExerciseFrequencyPoint extends ChartPoint {
  sets: number;
}

export interface MovementPatternPoint extends ChartPoint {
  sets: number;
}

export interface MuscleGroupPoint extends ChartPoint {
  sets: number;
}

export interface PRPoint extends ChartPoint {
  exercise: string;
  reps: number;
}

export interface AnchorLiftPoint extends ChartPoint {
  reps: number;
}

export interface IntensityPoint extends ChartPoint {
  source: 'rpe' | 'intensity';
}

export interface RecoveryPoint extends ChartPoint {
  painFlags: number;
  highRpeFlags: number;
  totalSets: number;
}

export interface AttendanceBundle {
  data: ChartPoint[];
  reliabilityPercent: number;
  totals: {
    completed: number;
    skipped: number;
    cancelled: number;
    resolved: number;
  };
}

export interface SetsRepsBundle {
  sets: ChartPoint[];
  reps: ChartPoint[];
}

export interface AnchorLiftsBundle {
  data: Record<string, AnchorLiftPoint[]>;
  exercises: string[];
}

export interface EstOneRmBundle {
  /** The most-logged weighted exercise the series tracks (null = none yet). */
  exercise: string | null;
  data: ChartPoint[];
}

/**
 * Single canonical bundle returned by `useClientProgressCharts`.
 * Every field defaults to an empty array or zeroed object on failure.
 */
export interface CanonicalProgressCharts {
  workoutFrequency: ChartPoint[];
  attendanceReliability: AttendanceBundle;
  weeklyVolume: WeeklyVolumePoint[];
  setsRepsTrend: SetsRepsBundle;
  durationTrend: ChartPoint[];
  intensityRpeTrend: IntensityPoint[];
  prTimeline: PRPoint[];
  anchorLifts: AnchorLiftsBundle;
  exerciseFrequency: ExerciseFrequencyPoint[];
  movementPatternBalance: MovementPatternPoint[];
  muscleGroupBalance: MuscleGroupPoint[];
  recoverySignal: RecoveryPoint[];
  weightTrend: ChartPoint[];
  bodyFatTrend: ChartPoint[];
  estOneRm: EstOneRmBundle;
}
