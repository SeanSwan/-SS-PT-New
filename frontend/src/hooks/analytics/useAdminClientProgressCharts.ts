/**
 * ============================================================================
 * FILE: useAdminClientProgressCharts.ts
 * PURPOSE: Admin/trainer-scoped variant of the Phase 14 canonical chart hook
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-16 (Phase 15.3)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Fetches the same 12 canonical client-progress chart datasets as
 * `useClientProgressCharts`, but hits the admin/trainer-scoped endpoints
 * at `/api/analytics/:userId/chart-*` instead of the JWT-derived client-
 * safe endpoints at `/api/client/analytics/chart-*`.
 *
 * WHY THIS EXISTS:
 * The Clients & Team workspace renders the selected client's progress in
 * the admin context. The admin routes use `:userId` in the URL (protected
 * by `requireOwnershipOrTrainer` + `requireTier('pro')` middleware), while
 * the client-safe routes derive userId from the JWT token. Both hit the
 * same controller functions — the only difference is the route prefix.
 *
 * REUSES: all types and canonical chart ID constants from
 * `useClientProgressCharts` so the two surfaces share the same data
 * contract and any new chart added to one is immediately available to
 * the other.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CANONICAL_CHART_IDS,
  CANONICAL_CHART_ROUTES,
  type CanonicalProgressCharts,
  type AttendanceBundle,
  type SetsRepsBundle,
  type AnchorLiftsBundle,
} from './useClientProgressCharts';

// Re-export the shared types + IDs so consumers can import from one place.
export type { CanonicalProgressCharts };
export { CANONICAL_CHART_IDS, CANONICAL_CHART_ROUTES };

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

interface UseAdminClientProgressChartsReturn {
  charts: CanonicalProgressCharts;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  nonEmptyChartCount: number;
}

/**
 * Admin/trainer-scoped chart hook. Same 12 canonical charts as
 * `useClientProgressCharts`, but routes through `/api/analytics/:userId/chart-*`.
 *
 * @param userId — the client userId to fetch charts for. When null/undefined
 *   the hook is idle (no fetch).
 */
export function useAdminClientProgressCharts(
  userId: number | string | null | undefined,
): UseAdminClientProgressChartsReturn {
  const { authAxios } = useAuth();
  const [charts, setCharts] = useState<CanonicalProgressCharts>(EMPTY_BUNDLE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!authAxios || !userId) return;
    setIsLoading(true);
    setError(null);

    const get = (suffix: string) =>
      authAxios
        .get(`/api/analytics/${userId}/${suffix}`)
        .then((res: any) => res?.data)
        .catch(() => null);

    try {
      const responses = await Promise.all(
        CANONICAL_CHART_IDS.map((id) => get(CANONICAL_CHART_ROUTES[id])),
      );
      const [
        workoutFreqRes, attendanceRes, weeklyVolumeRes, setsRepsRes,
        durationRes, intensityRes, prRes, anchorLiftsRes,
        exerciseFreqRes, movementPatternRes, muscleGroupRes, recoveryRes,
      ] = responses;

      const listOrEmpty = (r: any): any[] =>
        r?.success && Array.isArray(r?.data) ? r.data : [];

      setCharts({
        workoutFrequency: listOrEmpty(workoutFreqRes),
        attendanceReliability: attendanceRes?.success
          ? {
              data: Array.isArray(attendanceRes.data) ? attendanceRes.data : [],
              reliabilityPercent: typeof attendanceRes.reliabilityPercent === 'number'
                ? attendanceRes.reliabilityPercent : 0,
              totals: attendanceRes.totals || EMPTY_ATTENDANCE.totals,
            }
          : EMPTY_ATTENDANCE,
        weeklyVolume: listOrEmpty(weeklyVolumeRes),
        setsRepsTrend: setsRepsRes?.success && setsRepsRes?.data
          ? {
              sets: Array.isArray(setsRepsRes.data.sets) ? setsRepsRes.data.sets : [],
              reps: Array.isArray(setsRepsRes.data.reps) ? setsRepsRes.data.reps : [],
            }
          : EMPTY_SETS_REPS,
        durationTrend: listOrEmpty(durationRes),
        intensityRpeTrend: listOrEmpty(intensityRes),
        prTimeline: listOrEmpty(prRes),
        anchorLifts: anchorLiftsRes?.success
          ? {
              data: anchorLiftsRes.data && typeof anchorLiftsRes.data === 'object'
                ? anchorLiftsRes.data : {},
              exercises: Array.isArray(anchorLiftsRes.exercises)
                ? anchorLiftsRes.exercises : [],
            }
          : EMPTY_ANCHOR_LIFTS,
        exerciseFrequency: listOrEmpty(exerciseFreqRes),
        movementPatternBalance: listOrEmpty(movementPatternRes),
        muscleGroupBalance: listOrEmpty(muscleGroupRes),
        recoverySignal: listOrEmpty(recoveryRes),
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to load progress charts');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
