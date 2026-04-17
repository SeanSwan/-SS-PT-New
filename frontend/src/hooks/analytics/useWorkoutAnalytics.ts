/**
 * ============================================================================
 * FILE: useWorkoutAnalytics.ts
 * PURPOSE: Data hook for workout analytics — connects Victory charts to real data
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Fetches aggregated workout data from the analytics API
 * for a specific user. Returns typed data ready for Victory chart components.
 *
 * HOW IT FITS: EnhancedWorkoutsModal → useWorkoutAnalytics → /api/analytics/:userId/*
 *
 * KEY DECISIONS: Uses multiple parallel API calls with Promise.allSettled for
 * resilience — individual chart failures don't block the whole modal.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  derive1RMProgression, deriveMuscleGroupVolume, deriveRPETrend,
  calcLongestStreak, calcBrzycki1RM,
  type OneRMProgression, type MuscleGroupVolume, type RPEPoint,
} from './workoutAnalyticsUtils';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface WorkoutSession {
  id: string;
  title: string;
  date: string;
  duration: number;
  intensity: number;
  status: string;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  notes?: string;
  logs: WorkoutLogEntry[];
}

export interface WorkoutLogEntry {
  id: number;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  tempo?: string;
  rest?: number;
  rpe?: number;
  /** Set-specific note — stays a set-level field only. */
  notes?: string;
  /**
   * Phase 15.0 (2026-04-15): exercise-level coaching note. Stamped on
   * every row of the exercise group by the backend write path, so
   * deleting any single set preserves the note on the remaining rows.
   * Replaces the Phase 13.2 `Coach: ` encoding into set 1's notes.
   */
  exerciseNote?: string;
}

export interface PersonalRecord {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
  estimated1RM?: number;
}

export interface WeeklyVolume {
  week: string;
  volume: number;
  workoutCount: number;
}

export interface ExerciseFrequency {
  name: string;
  count: number;
  totalVolume: number;
}

export interface WorkoutCalendarEntry {
  date: string;
  count: number;
}

export interface IntensityPoint {
  date: string;
  intensity: number;
}

export type { OneRMProgression, MuscleGroupVolume, RPEPoint };
export { calcBrzycki1RM };

export interface AnalyticsData {
  sessions: WorkoutSession[];
  weeklyVolume: WeeklyVolume[];
  exerciseFrequency: ExerciseFrequency[];
  intensityTrend: IntensityPoint[];
  workoutCalendar: WorkoutCalendarEntry[];
  personalRecords: PersonalRecord[];
  oneRMProgression: OneRMProgression[];
  muscleGroupVolume: MuscleGroupVolume[];
  rpeTrend: RPEPoint[];
  summary: {
    totalWorkouts: number;
    totalExercises: number;
    totalVolume: number;
    avgIntensity: number;
    avgRPE: number;
    longestStreak: number;
  };
}

interface UseWorkoutAnalyticsReturn {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useWorkoutAnalytics(userId: number | string | null): UseWorkoutAnalyticsReturn {
  const { authAxios } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!userId || !authAxios) return;

    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch: workouts + analytics endpoints
      const [workoutsRes, volumeRes, prsRes, frequencyRes] = await Promise.allSettled([
        authAxios.get(`/api/admin/clients/${userId}/workouts`, {
          params: { limit: 50, offset: 0 }
        }),
        authAxios.get(`/api/analytics/${userId}/volume-progression`, {
          params: { groupBy: 'week' }
        }),
        authAxios.get(`/api/analytics/${userId}/personal-records`),
        authAxios.get(`/api/analytics/${userId}/frequency`, {
          params: { days: 90 }
        }),
      ]);

      // Extract workouts (primary data source)
      const sessions: WorkoutSession[] = [];
      if (workoutsRes.status === 'fulfilled' && workoutsRes.value.data?.success) {
        const raw = workoutsRes.value.data.workouts || [];
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
              // Phase 15.0: dedicated exercise-note column.
              exerciseNote: l.exerciseNote,
            })),
          });
        }
      }

      // Derive analytics from sessions if API endpoints fail
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
      } else {
        // Derive from sessions
        const weekMap = new Map<string, { volume: number; count: number }>();
        for (const s of sessions) {
          const d = new Date(s.date);
          const weekNum = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + 6 - d.getDay()) / 7)).padStart(2, '0')}`;
          const existing = weekMap.get(weekNum) || { volume: 0, count: 0 };
          existing.volume += s.totalWeight;
          existing.count += 1;
          weekMap.set(weekNum, existing);
        }
        for (const [week, val] of weekMap) {
          weeklyVolume.push({ week, volume: val.volume, workoutCount: val.count });
        }
        weeklyVolume.sort((a, b) => a.week.localeCompare(b.week));
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
            estimated1RM: pr.estimated1RM,
          });
        }
      } else {
        // Derive PRs from workout logs
        const prMap = new Map<string, { weight: number; reps: number; date: string }>();
        for (const s of sessions) {
          for (const log of s.logs) {
            const key = log.exerciseName;
            const existing = prMap.get(key);
            if (!existing || log.weight > existing.weight) {
              prMap.set(key, { weight: log.weight, reps: log.reps, date: s.date });
            }
          }
        }
        for (const [exercise, val] of prMap) {
          if (val.weight > 0) {
            personalRecords.push({ exercise, ...val });
          }
        }
      }

      // Exercise frequency (derived from sessions)
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
      const exerciseFrequency: ExerciseFrequency[] = Array.from(freqMap.entries())
        .map(([name, val]) => ({ name, ...val }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      // Intensity trend (from sessions)
      const intensityTrend: IntensityPoint[] = sessions
        .filter(s => s.intensity > 0)
        .map(s => ({ date: s.date, intensity: s.intensity }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Workout calendar (from sessions)
      const calMap = new Map<string, number>();
      for (const s of sessions) {
        const dateKey = new Date(s.date).toISOString().split('T')[0];
        calMap.set(dateKey, (calMap.get(dateKey) || 0) + 1);
      }
      const workoutCalendar: WorkoutCalendarEntry[] = Array.from(calMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // NASM-specific derived analytics
      const oneRMProgression = derive1RMProgression(sessions);
      const muscleGroupVolume = deriveMuscleGroupVolume(sessions);
      const rpeTrend = deriveRPETrend(sessions);
      const longestStreak = calcLongestStreak(sessions);

      // Add estimated 1RM to personal records that don't have it
      for (const pr of personalRecords) {
        if (!pr.estimated1RM && pr.weight > 0 && pr.reps > 0) {
          pr.estimated1RM = calcBrzycki1RM(pr.weight, pr.reps);
        }
      }

      // Summary
      const totalVolume = sessions.reduce((sum, s) => sum + s.totalWeight, 0);
      const totalExercises = new Set(sessions.flatMap(s => s.logs.map(l => l.exerciseName))).size;
      const avgIntensity = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + s.intensity, 0) / sessions.length
        : 0;
      const allRPEs = sessions.flatMap(s => s.logs.filter(l => l.rpe && l.rpe > 0).map(l => l.rpe!));
      const avgRPE = allRPEs.length > 0
        ? allRPEs.reduce((sum, r) => sum + r, 0) / allRPEs.length
        : 0;

      setData({
        sessions: sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        weeklyVolume,
        exerciseFrequency,
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
  }, [userId, authAxios]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return useMemo(() => ({
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
  }), [data, isLoading, error, fetchAnalytics]);
}
