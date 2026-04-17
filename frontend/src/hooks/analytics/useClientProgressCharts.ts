/**
 * ============================================================================
 * FILE: useClientProgressCharts.ts
 * PURPOSE: Canonical hook for the 12 client-progress charts (Phase 14 rebuild)
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-15 (Phase 14)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Fetches the 12 canonical client-progress chart datasets in parallel from
 * `/api/client/analytics/chart-*` and returns them as a single typed bundle
 * keyed by canonical chart IDs. Intentionally separate from
 * `useClientAnalytics` — that older hook fetches the pre-Phase-14 mix of 9
 * endpoints (with 5 broken PascalCase endpoints silently returning empty)
 * plus derived summary data. This hook is the single-responsibility fetcher
 * for the canonical progress surface.
 *
 * WHY THIS FILE EXISTS:
 * Phase 14 establishes a 12-chart canonical contract. Rather than overload
 * the legacy hook, this file gives the new canonical grid one place to own:
 *   - the canonical chart ID constants (shared with the backend)
 *   - per-chart request shapes
 *   - typed empty-state fallbacks
 *   - a single `isLoading` + `error` surface for the whole grid
 *
 * TRUTHFUL EMPTY STATES:
 * Every chart defaults to an empty array / empty object when its endpoint
 * returns no data. No demo / preview / fake fallbacks. The canonical grid
 * renders "None logged yet" copy based on these empty-but-real arrays,
 * never hides the absence of data.
 *
 * DATA FLOW:
 *   CanonicalProgressChartsGrid → useClientProgressCharts →
 *   GET /api/client/analytics/chart-* (12 endpoints in parallel) →
 *   shaped {chartId: data} bundle
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Canonical chart ID constants
//
// These strings are the canonical IDs for the 12 client-progress charts.
// They must match the backend endpoint suffix AFTER the `chart-` prefix —
// e.g. `weeklyVolume` → `/api/client/analytics/chart-weekly-volume`.
//
// Do NOT rename without also updating:
//   - `backend/controllers/chartDataController.mjs` (function names)
//   - `backend/routes/clientAnalyticsRoutes.mjs` (route paths)
//   - `backend/routes/analyticsRoutes.mjs` (admin/trainer routes)
//   - `CanonicalProgressChartsGrid.tsx` (registry)
// ─────────────────────────────────────────────────────────────

export const CANONICAL_CHART_IDS = [
  'workoutFrequency',          // #1 — workouts/week (workout_sessions)
  'attendanceReliability',     // #2 — status breakdown (workout_sessions.status)
  'weeklyVolume',              // #3 — sum(weight*reps)/week (workout_logs)
  'setsRepsTrend',             // #4 — dual series sets + reps (workout_logs)
  'durationTrend',             // #5 — per-session duration (workout_sessions)
  'intensityRpeTrend',         // #6 — rpe precedence, intensity fallback
  'prTimeline',                // #7 — running best sets (workout_logs)
  'anchorLifts',               // #8 — top-3 most-frequent progression
  'exerciseFrequency',         // #9 — top-10 by session count (workout_logs)
  'movementPatternBalance',    // #10 — NASM patterns volume aggregate
  'muscleGroupBalance',        // #11 — NASM muscle groups volume aggregate
  'recoverySignal',            // #12 — pain notes + high-RPE clustering
] as const;

export type CanonicalChartId = typeof CANONICAL_CHART_IDS[number];

/**
 * Map from canonical ID to the backend route suffix. Kept as an explicit
 * object (rather than derived via kebab-casing) so the mapping is
 * grep-friendly and refactor-safe.
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
};

// ─────────────────────────────────────────────────────────────
// SECTION: Per-chart response shapes
// ─────────────────────────────────────────────────────────────

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

/**
 * Single canonical bundle returned by `useClientProgressCharts`.
 * Every field defaults to an empty array / zeroed object on failure —
 * no chart ever renders stale or fake data.
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
}

const EMPTY_ATTENDANCE: AttendanceBundle = {
  data: [],
  reliabilityPercent: 0,
  totals: { completed: 0, skipped: 0, cancelled: 0, resolved: 0 },
};

const EMPTY_SETS_REPS: SetsRepsBundle = { sets: [], reps: [] };

const EMPTY_ANCHOR_LIFTS: AnchorLiftsBundle = { data: {}, exercises: [] };

const EMPTY_BUNDLE: CanonicalProgressCharts = {
  workoutFrequency: [],
  attendanceReliability: EMPTY_ATTENDANCE,
  weeklyVolume: [],
  setsRepsTrend: EMPTY_SETS_REPS,
  durationTrend: [],
  intensityRpeTrend: [],
  prTimeline: [],
  anchorLifts: EMPTY_ANCHOR_LIFTS,
  exerciseFrequency: [],
  movementPatternBalance: [],
  muscleGroupBalance: [],
  recoverySignal: [],
};

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

interface UseClientProgressChartsReturn {
  charts: CanonicalProgressCharts;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  /**
   * Count of charts that have at least one data point. Used by the grid
   * to detect the "empty client" state and render a single "no workouts
   * logged yet" hero message instead of twelve near-empty cards.
   */
  nonEmptyChartCount: number;
}

export function useClientProgressCharts(): UseClientProgressChartsReturn {
  const { authAxios } = useAuth();
  const [charts, setCharts] = useState<CanonicalProgressCharts>(EMPTY_BUNDLE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!authAxios) return;
    setIsLoading(true);
    setError(null);

    const get = (suffix: string) =>
      authAxios
        .get(`/api/client/analytics/${suffix}`)
        .then((res: any) => res?.data)
        .catch(() => null);

    try {
      // Parallel fetch. Every endpoint tolerates failure via null →
      // the extractor below substitutes the canonical empty shape.
      const responses = await Promise.all(
        CANONICAL_CHART_IDS.map((id) => get(CANONICAL_CHART_ROUTES[id])),
      );
      const [
        workoutFreqRes,
        attendanceRes,
        weeklyVolumeRes,
        setsRepsRes,
        durationRes,
        intensityRes,
        prRes,
        anchorLiftsRes,
        exerciseFreqRes,
        movementPatternRes,
        muscleGroupRes,
        recoveryRes,
      ] = responses;

      const listOrEmpty = (r: any): any[] =>
        r?.success && Array.isArray(r?.data) ? r.data : [];

      const next: CanonicalProgressCharts = {
        workoutFrequency: listOrEmpty(workoutFreqRes),
        attendanceReliability: attendanceRes?.success
          ? {
              data: Array.isArray(attendanceRes.data) ? attendanceRes.data : [],
              reliabilityPercent:
                typeof attendanceRes.reliabilityPercent === 'number'
                  ? attendanceRes.reliabilityPercent
                  : 0,
              totals: attendanceRes.totals || EMPTY_ATTENDANCE.totals,
            }
          : EMPTY_ATTENDANCE,
        weeklyVolume: listOrEmpty(weeklyVolumeRes),
        setsRepsTrend:
          setsRepsRes?.success && setsRepsRes?.data
            ? {
                sets: Array.isArray(setsRepsRes.data.sets) ? setsRepsRes.data.sets : [],
                reps: Array.isArray(setsRepsRes.data.reps) ? setsRepsRes.data.reps : [],
              }
            : EMPTY_SETS_REPS,
        durationTrend: listOrEmpty(durationRes),
        intensityRpeTrend: listOrEmpty(intensityRes),
        prTimeline: listOrEmpty(prRes),
        anchorLifts:
          anchorLiftsRes?.success
            ? {
                data:
                  anchorLiftsRes.data && typeof anchorLiftsRes.data === 'object'
                    ? anchorLiftsRes.data
                    : {},
                exercises: Array.isArray(anchorLiftsRes.exercises)
                  ? anchorLiftsRes.exercises
                  : [],
              }
            : EMPTY_ANCHOR_LIFTS,
        exerciseFrequency: listOrEmpty(exerciseFreqRes),
        movementPatternBalance: listOrEmpty(movementPatternRes),
        muscleGroupBalance: listOrEmpty(muscleGroupRes),
        recoverySignal: listOrEmpty(recoveryRes),
      };

      setCharts(next);
    } catch (err: any) {
      setError(err?.message || 'Failed to load progress charts');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const nonEmptyChartCount = useMemo(() => {
    let count = 0;
    if (charts.workoutFrequency.length > 0) count++;
    if (charts.attendanceReliability.data.length > 0) count++;
    if (charts.weeklyVolume.length > 0) count++;
    if (charts.setsRepsTrend.sets.length > 0) count++;
    if (charts.durationTrend.length > 0) count++;
    if (charts.intensityRpeTrend.length > 0) count++;
    if (charts.prTimeline.length > 0) count++;
    if (charts.anchorLifts.exercises.length > 0) count++;
    if (charts.exerciseFrequency.length > 0) count++;
    if (charts.movementPatternBalance.length > 0) count++;
    if (charts.muscleGroupBalance.length > 0) count++;
    if (charts.recoverySignal.length > 0) count++;
    return count;
  }, [charts]);

  return useMemo(
    () => ({ charts, isLoading, error, refetch: fetchAll, nonEmptyChartCount }),
    [charts, isLoading, error, fetchAll, nonEmptyChartCount],
  );
}
