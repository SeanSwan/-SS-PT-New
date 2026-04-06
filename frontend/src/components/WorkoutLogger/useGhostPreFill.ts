/**
 * ┌─── HOOK: useGhostPreFill ──────────────────────────────────┐
 * │ PURPOSE: Fetch & cache previous workout data for a client   │
 * │ so new sets auto-populate with last session's values.       │
 * │                                                              │
 * │ Shares the same API + cache as GhostDataRow but returns     │
 * │ structured data for pre-filling inputs.                      │
 * │                                                              │
 * │ Returns: getPreFill(exerciseName, setIndex) => ExerciseSet  │
 * │          getOverload(exerciseName, setIndex) => suggestion   │
 * └──────────────────────────────────────────────────────────────┘
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export interface PreFillData {
  weight: number;
  reps: number;
  rpe?: number;
  tempo?: string;
  restTime?: number;
}

export interface OverloadSuggestion {
  type: 'weight' | 'reps';
  current: number;
  suggested: number;
  label: string;
}

// Module-level cache shared across all hook instances
const preFillCache = new Map<string, PreFillData[] | null>();

// Compound movements get +5 lbs suggestion, isolation gets +2.5
const COMPOUND_PATTERNS = /squat|deadlift|bench|press|row|pull.?up|chin.?up|lunge|clean|snatch|thrust/i;

export function useGhostPreFill(clientId: number) {
  const [isLoading, setIsLoading] = useState(false);
  const fetchedExercises = useRef(new Set<string>());

  // Fetch history for a specific exercise (if not cached)
  const fetchExerciseHistory = useCallback(async (exerciseName: string) => {
    const cacheKey = `${clientId}:${exerciseName}`;

    if (preFillCache.has(cacheKey) || fetchedExercises.current.has(cacheKey)) {
      return;
    }

    fetchedExercises.current.add(cacheKey);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsLoading(true);
      const res = await fetch(
        `${API_BASE}/api/admin/clients/${clientId}/workouts?limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        preFillCache.set(cacheKey, null);
        return;
      }

      const data = await res.json();
      if (!data?.success || !data.workouts) {
        preFillCache.set(cacheKey, null);
        return;
      }

      // Find most recent workout containing this exercise
      for (const workout of data.workouts) {
        const logs = workout.logs || workout.exercises || [];
        const matching = logs.filter(
          (log: any) => log.exerciseName?.toLowerCase() === exerciseName.toLowerCase()
        );

        if (matching.length > 0) {
          const sets: PreFillData[] = matching.map((log: any) => ({
            weight: log.weight || 0,
            reps: log.reps || 0,
            rpe: log.rpe,
            tempo: log.tempo,
            restTime: log.rest || log.restTime,
          }));
          preFillCache.set(cacheKey, sets);
          return;
        }
      }

      preFillCache.set(cacheKey, null);
    } catch {
      preFillCache.set(cacheKey, null);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  /** Get pre-fill values for a specific set */
  const getPreFill = useCallback((exerciseName: string, setIndex: number): PreFillData | null => {
    const cacheKey = `${clientId}:${exerciseName}`;
    const cached = preFillCache.get(cacheKey);
    if (!cached) return null;
    return cached[setIndex] || cached[cached.length - 1] || null;
  }, [clientId]);

  /** Get progressive overload suggestion for a set */
  const getOverload = useCallback((exerciseName: string, setIndex: number): OverloadSuggestion | null => {
    const preFill = getPreFill(exerciseName, setIndex);
    if (!preFill || preFill.weight === 0) return null;

    const isCompound = COMPOUND_PATTERNS.test(exerciseName);
    const weightBump = isCompound ? 5 : 2.5;

    // Suggest weight increase as primary overload
    return {
      type: 'weight',
      current: preFill.weight,
      suggested: preFill.weight + weightBump,
      label: `+${weightBump} lbs`,
    };
  }, [getPreFill]);

  /** Pre-fill a new set with previous workout data */
  const createPreFilledSet = useCallback((
    exerciseName: string,
    setNumber: number,
  ) => {
    const preFill = getPreFill(exerciseName, setNumber - 1);

    return {
      setNumber,
      weight: preFill?.weight || 0,
      reps: preFill?.reps || 0,
      rpe: preFill?.rpe || 5,
      tempo: preFill?.tempo || '',
      restTime: preFill?.restTime || 60,
      formQuality: 3,
      notes: '',
    };
  }, [getPreFill]);

  return {
    isLoading,
    fetchExerciseHistory,
    getPreFill,
    getOverload,
    createPreFilledSet,
  };
}
