/**
 * FILE: useCurrentClientWorkout.ts
 * PURPOSE: Fetch and normalize the active client workout plan for /overview.
 */

import { useEffect, useState } from 'react';
import apiService from '../../../../../services/api.service';

interface PlannedExercisePreview {
  name?: string;
  exerciseName?: string;
}

interface CurrentSessionPreview {
  weekNumber?: number | string;
  dayNumber?: number | string;
  dayLabel?: string;
  exercises?: PlannedExercisePreview[];
  session?: {
    dayLabel?: string;
    name?: string;
    exercises?: PlannedExercisePreview[];
  };
}

interface CurrentWorkoutPlanPreview {
  title?: string;
  name?: string;
  currentWeek?: number | string;
  currentDay?: number | string;
  currentSession?: CurrentSessionPreview | null;
}

interface CurrentWorkoutResponse {
  data?: CurrentWorkoutPlanPreview | null;
  plan?: CurrentWorkoutPlanPreview | null;
  currentSession?: CurrentSessionPreview | null;
}

export interface CurrentClientWorkout {
  title: string;
  weekNumber?: number;
  dayNumber?: number;
  dayLabel?: string;
  exerciseCount: number;
  firstExercise?: string;
}

export interface CurrentClientWorkoutState {
  workout: CurrentClientWorkout | null;
  loading: boolean;
  error: boolean;
}

function coerceClientId(raw: unknown): number | null {
  const value = typeof raw === 'number' ? raw : Number(String(raw || '').trim());
  return Number.isInteger(value) && value > 0 ? value : null;
}

function toPositiveInteger(raw: unknown): number | undefined {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function exerciseName(exercise?: PlannedExercisePreview): string | undefined {
  const candidate = exercise?.name || exercise?.exerciseName;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : undefined;
}

export function normalizeCurrentClientWorkout(payload?: CurrentWorkoutResponse | null): CurrentClientWorkout | null {
  const plan = payload?.data || payload?.plan || null;
  if (!plan) return null;

  const session = payload?.currentSession || plan.currentSession || null;
  const exercises = Array.isArray(session?.exercises)
    ? session?.exercises || []
    : Array.isArray(session?.session?.exercises)
      ? session?.session?.exercises || []
      : [];

  return {
    title: plan.title || plan.name || 'Current Workout',
    weekNumber: toPositiveInteger(session?.weekNumber ?? plan.currentWeek),
    dayNumber: toPositiveInteger(session?.dayNumber ?? plan.currentDay),
    dayLabel: session?.dayLabel || session?.session?.dayLabel || session?.session?.name,
    exerciseCount: exercises.length,
    firstExercise: exerciseName(exercises[0]),
  };
}

export function useCurrentClientWorkout(userId: unknown): CurrentClientWorkoutState {
  const [state, setState] = useState<CurrentClientWorkoutState>({
    workout: null,
    loading: false,
    error: false,
  });

  useEffect(() => {
    const clientId = coerceClientId(userId);
    if (!clientId) {
      setState({ workout: null, loading: false, error: false });
      return undefined;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: false }));

    apiService.get<CurrentWorkoutResponse>(`/api/workouts/${clientId}/current`)
      .then((response) => {
        if (cancelled) return;
        setState({
          workout: normalizeCurrentClientWorkout(response.data),
          loading: false,
          error: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ workout: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
