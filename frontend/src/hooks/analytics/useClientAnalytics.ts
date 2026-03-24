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
  derive1RMProgression, deriveMuscleGroupVolume, deriveRPETrend,
  calcLongestStreak, calcBrzycki1RM,
} from './workoutAnalyticsUtils';
import type {
  AnalyticsData, WorkoutSession, WeeklyVolume,
  PersonalRecord, ExerciseFrequency, IntensityPoint,
  WorkoutCalendarEntry,
} from './useWorkoutAnalytics';

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
      const [
        dashboardRes, volumeRes, prsRes, frequencyRes,
        chartFreqRes, chartWeightRes, chartMuscleRes, chartMacroRes,
        chartCardioRes, chartSessionRes, chartBodyFatRes, chartRecoveryRes,
        chartRPERes,
      ] = await Promise.allSettled([
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

      const sessions: WorkoutSession[] = [];
      if (workoutsRes?.data?.sessions || workoutsRes?.data?.workouts) {
        const raw = workoutsRes.data.sessions || workoutsRes.data.workouts || [];
        for (const w of raw) {
          sessions.push({
            id: w.id,
            title: w.title || 'Workout',
            date: w.date,
            duration: w.duration || 0,
            intensity: w.intensity || 0,
            status: w.status || 'completed',
            totalSets: w.totalSets || 0,
            totalReps: w.totalReps || 0,
            totalWeight: w.totalWeight || 0,
            notes: w.notes,
            logs: (w.logs || w.WorkoutLogs || []).map((l: any) => ({
              id: l.id,
              exerciseName: l.exerciseName,
              setNumber: l.setNumber,
              reps: l.reps,
              weight: l.weight,
              tempo: l.tempo,
              rest: l.rest,
              rpe: l.rpe,
              notes: l.notes,
            })),
          });
        }
      }

      // Weekly volume
      const weeklyVolume: WeeklyVolume[] = [];
      if (volumeRes.status === 'fulfilled' && volumeRes.value.data?.success) {
        const vd = volumeRes.value.data.data || volumeRes.value.data.volumeProgression || [];
        for (const v of vd) {
          weeklyVolume.push({
            week: v.week || v.period || v.label,
            volume: v.volume || v.totalVolume || 0,
            workoutCount: v.workoutCount || v.count || 0,
          });
        }
      }

      // Personal records
      const personalRecords: PersonalRecord[] = [];
      if (prsRes.status === 'fulfilled' && prsRes.value.data?.success) {
        const prs = prsRes.value.data.data || prsRes.value.data.personalRecords || [];
        for (const pr of prs) {
          personalRecords.push({
            exercise: pr.exerciseName || pr.exercise || pr.name,
            weight: pr.weight || pr.maxWeight || 0,
            reps: pr.reps || pr.bestReps || 0,
            date: pr.date || pr.achievedAt || '',
            estimated1RM: pr.estimated1RM || (pr.weight > 0 && pr.reps > 0
              ? calcBrzycki1RM(pr.weight, pr.reps) : undefined),
          });
        }
      }

      // Derived analytics from sessions
      const exerciseFrequency: ExerciseFrequency[] = [];
      const freqMap = new Map<string, { count: number; totalVolume: number }>();
      for (const s of sessions) {
        const exerciseNames = new Set(s.logs.map(l => l.exerciseName));
        for (const name of exerciseNames) {
          const existing = freqMap.get(name) || { count: 0, totalVolume: 0 };
          existing.count += 1;
          const exerciseLogs = s.logs.filter(l => l.exerciseName === name);
          existing.totalVolume += exerciseLogs.reduce((sum, l) => sum + (l.weight * l.reps), 0);
          freqMap.set(name, existing);
        }
      }
      for (const [name, val] of freqMap) {
        exerciseFrequency.push({ name, ...val });
      }
      exerciseFrequency.sort((a, b) => b.count - a.count);

      const intensityTrend: IntensityPoint[] = sessions
        .filter(s => s.intensity > 0)
        .map(s => ({ date: s.date, intensity: s.intensity }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const calMap = new Map<string, number>();
      for (const s of sessions) {
        const dateKey = new Date(s.date).toISOString().split('T')[0];
        calMap.set(dateKey, (calMap.get(dateKey) || 0) + 1);
      }
      const workoutCalendar: WorkoutCalendarEntry[] = Array.from(calMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const oneRMProgression = derive1RMProgression(sessions);
      const muscleGroupVolume = deriveMuscleGroupVolume(sessions);
      const rpeTrend = deriveRPETrend(sessions);
      const longestStreak = calcLongestStreak(sessions);

      const totalVolume = sessions.reduce((sum, s) => sum + s.totalWeight, 0);
      const totalExercises = new Set(sessions.flatMap(s => s.logs.map(l => l.exerciseName))).size;
      const avgIntensity = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + s.intensity, 0) / sessions.length : 0;
      const allRPEs = sessions.flatMap(s => s.logs.filter(l => l.rpe && l.rpe > 0).map(l => l.rpe!));
      const avgRPE = allRPEs.length > 0
        ? allRPEs.reduce((sum, r) => sum + r, 0) / allRPEs.length : 0;

      setData({
        sessions: sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        weeklyVolume,
        exerciseFrequency: exerciseFrequency.slice(0, 15),
        intensityTrend,
        workoutCalendar,
        personalRecords,
        oneRMProgression,
        muscleGroupVolume,
        rpeTrend,
        summary: {
          totalWorkouts: sessions.length,
          totalExercises,
          totalVolume,
          avgIntensity: Math.round(avgIntensity * 10) / 10,
          avgRPE: Math.round(avgRPE * 10) / 10,
          longestStreak,
        },
      });
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
