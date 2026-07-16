/**
 * ============================================================================
 * FILE: useClientAnalytics.ts
 * PURPOSE: Client-safe analytics hook — uses JWT-derived routes (no userId in URL)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Fetches analytics data from /api/client/analytics/*
 * endpoints where userId is derived from JWT token. Safe for client dashboards.
 *
 * HOW IT FITS: Client Dashboard → useClientAnalytics → /api/client/analytics/*
 * KEY DECISIONS: Uses same data types as useWorkoutAnalytics for compatibility
 * with Victory chart components. Falls back gracefully on individual failures.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  buildAnalyticsData,
  buildPersonalRecordsFromApi,
  buildWeeklyVolumeFromApi,
  mapWorkoutSessions,
  withEstimatedOneRepMaxes,
} from './workoutAnalyticsData';
import type {
  AnalyticsData,
} from './useWorkoutAnalytics.types';

// Re-export types for consumers
export type { AnalyticsData };

// ─────────────────────────────────────────────────────────────
// SECTION: Chart data types (Victory-ready shapes)
// ─────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  x: string;
  y: number;
}

export interface ChartData {
  workoutFrequency: ChartDataPoint[];
  weightProgression: ChartDataPoint[];
  muscleGroupFocus: ChartDataPoint[];
  macroSplit: ChartDataPoint[];
  cardioEndurance: ChartDataPoint[];
  sessionFrequency: ChartDataPoint[];
  bodyFatTrend: ChartDataPoint[];
  muscleRecovery: ChartDataPoint[];
  rpeByExercise: ChartDataPoint[];
}

interface UseClientAnalyticsReturn {
  data: AnalyticsData | null;
  chartData: ChartData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook implementation
// ─────────────────────────────────────────────────────────────

export function useClientAnalytics(): UseClientAnalyticsReturn {
  const { authAxios } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!authAxios) return;

    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch: core analytics + all 9 chart endpoints
      const [, volumeRes, prsRes, , chartFreqRes, chartWeightRes, chartMuscleRes, chartMacroRes, chartCardioRes, chartSessionRes, chartBodyFatRes, chartRecoveryRes, chartRPERes] = await Promise.allSettled([
        authAxios.get('/api/client/analytics/dashboard', { params: { days: 90 } }),
        authAxios.get('/api/client/analytics/volume-progression', { params: { groupBy: 'week' } }),
        authAxios.get('/api/client/analytics/personal-records'),
        authAxios.get('/api/client/analytics/frequency', { params: { days: 90 } }),
        authAxios.get('/api/client/analytics/chart-workout-frequency'),
        authAxios.get('/api/client/analytics/chart-weight-progression'),
        authAxios.get('/api/client/analytics/chart-muscle-group-focus'),
        authAxios.get('/api/client/analytics/chart-macro-split'),
        authAxios.get('/api/client/analytics/chart-cardio-endurance'),
        authAxios.get('/api/client/analytics/chart-session-frequency'),
        authAxios.get('/api/client/analytics/chart-body-fat-trend'),
        authAxios.get('/api/client/analytics/chart-muscle-recovery'),
        authAxios.get('/api/client/analytics/chart-rpe-by-exercise'),
      ]);

      // Extract chart data from Victory endpoints
      const extractChartData = (res: PromiseSettledResult<any>): ChartDataPoint[] => {
        if (res.status === 'fulfilled' && res.value.data?.success) {
          return res.value.data.data || [];
        }
        return [];
      };

      setChartData({
        workoutFrequency: extractChartData(chartFreqRes),
        weightProgression: extractChartData(chartWeightRes),
        muscleGroupFocus: extractChartData(chartMuscleRes),
        macroSplit: extractChartData(chartMacroRes),
        cardioEndurance: extractChartData(chartCardioRes),
        sessionFrequency: extractChartData(chartSessionRes),
        bodyFatTrend: extractChartData(chartBodyFatRes),
        muscleRecovery: extractChartData(chartRecoveryRes),
        rpeByExercise: extractChartData(chartRPERes),
      });

      // Build AnalyticsData from dashboard + individual endpoints
      // Use workout sessions from the main workout endpoint for derived analytics
      const workoutsRes = await authAxios.get('/api/workout/sessions', {
        params: { limit: 50 }
      }).catch(() => null);

      const sessions = mapWorkoutSessions(
        workoutsRes?.data?.sessions ?? workoutsRes?.data?.workouts,
      );

      // Weekly volume
      const weeklyVolume = buildWeeklyVolumeFromApi(volumeRes);

      // Personal records
      const personalRecords = withEstimatedOneRepMaxes(
        buildPersonalRecordsFromApi(prsRes),
      );

      setData(buildAnalyticsData(sessions, weeklyVolume, personalRecords));
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return useMemo(() => ({
    data,
    chartData,
    isLoading,
    error,
    refetch: fetchAnalytics,
  }), [data, chartData, isLoading, error, fetchAnalytics]);
}
