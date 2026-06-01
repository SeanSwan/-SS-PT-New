/**
 * ============================================================================
 * FILE: useClientProgressCharts.ts
 * PURPOSE: Canonical runtime hook for the 12 client-progress charts.
 * ============================================================================
 *
 * Fetches the client-safe `/api/client/analytics/chart-*` endpoints in
 * parallel, sanitizes every payload before Victory receives it, and returns
 * truthful empty shapes when logged workout data does not exist yet.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CANONICAL_CHART_IDS,
  CANONICAL_CHART_ROUTES,
  type AnchorLiftsBundle,
  type AttendanceBundle,
  type CanonicalProgressCharts,
  type SetsRepsBundle,
} from './useClientProgressCharts.types';
import { sanitizeClientProgressChartsBundle } from './useClientProgressChartsSanitizers';

export {
  CANONICAL_CHART_IDS,
  CANONICAL_CHART_ROUTES,
} from './useClientProgressCharts.types';

export type {
  AnchorLiftPoint,
  AnchorLiftsBundle,
  AttendanceBundle,
  CanonicalChartId,
  CanonicalProgressCharts,
  ChartPoint,
  ExerciseFrequencyPoint,
  IntensityPoint,
  MovementPatternPoint,
  MuscleGroupPoint,
  PRPoint,
  RecoveryPoint,
  SetsRepsBundle,
  WeeklyVolumePoint,
} from './useClientProgressCharts.types';

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

interface UseClientProgressChartsReturn {
  charts: CanonicalProgressCharts;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
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

      const next: CanonicalProgressCharts = sanitizeClientProgressChartsBundle({
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
      });

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
