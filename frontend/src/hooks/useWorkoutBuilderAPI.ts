/**
 * useWorkoutBuilderAPI -- Phase 9 Frontend Hook
 * ==============================================
 * Client Intelligence + Intelligent Workout Builder API.
 */

import { useCallback, useMemo } from 'react';
import apiService from '../services/api.service';
import type {
  AdminOverview,
  ClientContext,
  GeneratedPlan,
  GeneratedWorkout,
} from './useWorkoutBuilderAPI.types';

export type {
  AdminOverview,
  ClientContext,
  Compensation,
  EquipmentLocation,
  Explanation,
  GeneratedPlan,
  GeneratedWorkout,
  Mesocycle,
  PainExclusion,
  PainWarning,
  WarmupExercise,
  WorkoutExercise,
} from './useWorkoutBuilderAPI.types';

// ── Types ────────────────────────────────────────────────────────────

// ── API Helpers ──────────────────────────────────────────────────────

function parseRequestBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();

  try {
    if (method === 'POST') {
      const response = await apiService.post<T>(url, parseRequestBody(options?.body));
      return response.data;
    }
    if (method === 'PUT') {
      const response = await apiService.put<T>(url, parseRequestBody(options?.body));
      return response.data;
    }
    if (method === 'DELETE') {
      const response = await apiService.delete<T>(url);
      return response.data;
    }

    const response = await apiService.get<T>(url);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Request failed'
    );
  }
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useWorkoutBuilderAPI() {
  const getClientContext = useCallback(async (clientId: number): Promise<ClientContext> => {
    const data = await apiFetch<{ success: boolean; context: ClientContext }>(
      `/api/client-intelligence/${clientId}`
    );
    return data.context;
  }, []);

  const getAdminOverview = useCallback(async (): Promise<AdminOverview> => {
    const data = await apiFetch<{ success: boolean; overview: AdminOverview }>(
      '/api/client-intelligence/'
    );
    return data.overview;
  }, []);

  const generateWorkout = useCallback(async (options: {
    clientId: number;
    category?: string;
    equipmentProfileId?: number;
    exerciseCount?: number;
    rotationPattern?: string;
  }): Promise<GeneratedWorkout> => {
    const data = await apiFetch<{ success: boolean; workout: GeneratedWorkout }>(
      '/api/workout-builder/generate',
      { method: 'POST', body: JSON.stringify(options) }
    );
    return data.workout;
  }, []);

  const generatePlan = useCallback(async (options: {
    clientId: number;
    durationWeeks?: number;
    sessionsPerWeek?: number;
    primaryGoal?: string;
    equipmentProfileId?: number;
  }): Promise<GeneratedPlan> => {
    const data = await apiFetch<{ success: boolean; plan: GeneratedPlan }>(
      '/api/workout-builder/plan',
      { method: 'POST', body: JSON.stringify(options) }
    );
    return data.plan;
  }, []);

  return useMemo(() => ({
    getClientContext,
    getAdminOverview,
    generateWorkout,
    generatePlan,
  }), [getClientContext, getAdminOverview, generateWorkout, generatePlan]);
}
