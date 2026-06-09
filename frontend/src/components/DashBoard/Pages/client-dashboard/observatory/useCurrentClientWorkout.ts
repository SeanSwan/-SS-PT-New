/**
 * FILE: useCurrentClientWorkout.ts
 * PURPOSE: Fetch the active client workout plan for /overview and delegate
 * read-model shaping to the pure current-workout normalizer.
 */

import { useEffect, useState } from 'react';
import apiService from '../../../../../services/api.service';
import {
  normalizeCurrentClientWorkout,
  normalizeTrainingPlanVault,
  type ClientTrainingPlanVault,
  type CurrentClientWorkout,
  type CurrentWorkoutResponse,
} from './currentClientWorkoutNormalizer';

export type { ClientTrainingPlanSlot } from './clientTrainingPlanVaultNormalizer';
export type {
  ClientTrainingPlanVault,
  CurrentClientWorkout,
} from './currentClientWorkoutNormalizer';

export interface CurrentClientWorkoutState {
  workout: CurrentClientWorkout | null;
  planVault: ClientTrainingPlanVault | null;
  loading: boolean;
  error: boolean;
}

function rawClientId(raw: unknown): string | number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return raw.trim();
  return '';
}

function coerceClientId(raw: unknown): number | null {
  const value = Number(rawClientId(raw));
  if (!Number.isInteger(value)) return null;
  if (value <= 0) return null;
  return value;
}

export function useCurrentClientWorkout(userId: unknown): CurrentClientWorkoutState {
  const [state, setState] = useState<CurrentClientWorkoutState>({
    workout: null,
    planVault: null,
    loading: false,
    error: false,
  });

  useEffect(() => {
    const clientId = coerceClientId(userId);
    if (!clientId) {
      setState({ workout: null, planVault: null, loading: false, error: false });
      return undefined;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: false }));

    apiService.get<CurrentWorkoutResponse>(`/api/workouts/${clientId}/current`)
      .then((response) => {
        if (cancelled) return;
        setState({
          workout: normalizeCurrentClientWorkout(response.data),
          planVault: normalizeTrainingPlanVault(response.data),
          loading: false,
          error: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ workout: null, planVault: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
