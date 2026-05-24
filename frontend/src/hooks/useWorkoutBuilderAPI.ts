/**
 * useWorkoutBuilderAPI -- Phase 9 Frontend Hook
 * ==============================================
 * Client Intelligence + Intelligent Workout Builder API.
 */

import { useCallback, useMemo } from 'react';
import apiService from '../services/api.service';

// ── Types ────────────────────────────────────────────────────────────

export interface PainExclusion {
  bodyRegion: string;
  painLevel: number;
  painType: string;
  muscles: string[];
  reason: string;
  entryId: number;
}

export interface PainWarning extends PainExclusion {}

export interface Compensation {
  type: string;
  frequency: number;
  avgSeverity: number;
  trend: 'improving' | 'stable' | 'worsening';
  lastDetected: string | null;
  cesStrategy: {
    inhibit: string[];
    lengthen: string[];
    activate: string[];
    integrate: string[];
  } | null;
}

export interface EquipmentLocation {
  id: number;
  name: string;
  locationType: string;
  equipmentCount: number;
  items: { id: number; name: string; category: string; resistanceType: string }[];
}

export interface ClientContext {
  clientId: number;
  trainerId: number;
  clientName: string;
  fetchedAt: string;
  pain: {
    activeEntries: number;
    exclusions: PainExclusion[];
    warnings: PainWarning[];
    excludedMuscles: string[];
  };
  movement: {
    nasmPhaseRecommendation: number | null;
    compensations: Compensation[];
    exerciseScores: Record<string, unknown>;
    totalAnalyses: number;
  };
  formAnalysis: {
    recentCount: number;
    detectedCompensations: string[];
    avgScore: number;
    flaggedExercises: { exercise: string; score: number; analysisId: number }[];
  };
  workouts: {
    sessionsLast2Weeks: number;
    recentExercises: string[];
    avgFormRating: number;
    avgIntensity: number;
  };
  equipment: EquipmentLocation[];
  variation: {
    recentSessions: number;
    lastSessionType: 'build' | 'switch' | null;
    lastSessionDate: string | null;
    recentlyUsedExercises: string[];
    currentPattern: string;
  };
  constraints: {
    excludedMuscles: string[];
    compensationTypes: string[];
    recentlyUsedExercises: string[];
    nasmPhase: number | null;
  };
}

export interface WorkoutExercise {
  exerciseKey: string;
  exerciseName: string;
  muscles: string[];
  category: string;
  equipment: string[];
  nasmLevel: number;
  sets: number;
  reps: string;
  tempo: string;
  rest: string;
  intensity: string;
}

export interface WarmupExercise {
  name: string;
  duration?: string;
  sets?: number;
  reps?: number;
  type: 'inhibit' | 'lengthen' | 'activate';
  reason?: string;
}

export interface Explanation {
  type: string;
  message: string;
  details?: string[];
}

export interface GeneratedWorkout {
  clientId: number;
  trainerId: number;
  clientName: string;
  generatedAt: string;
  sessionType: 'build' | 'switch';
  category: string;
  nasmPhase: number;
  phaseParams: {
    name: string;
    focus: string;
    intensity: string;
    tempo: string;
  };
  warmup: WarmupExercise[];
  exercises: WorkoutExercise[];
  swapSuggestions: unknown[] | null;
  cooldown: { name: string; duration?: string; sets?: number; reps?: number }[];
  constraints: ClientContext['constraints'];
  explanations: Explanation[];
  context: {
    painExclusions: number;
    painWarnings: number;
    compensations: number;
    recentWorkouts: number;
    avgFormRating: number;
    equipmentProfileId: number | null;
  };
}

export interface Mesocycle {
  mesocycle: number;
  weeks: string;
  nasmPhase: number;
  phaseName: string;
  focus: string;
  params: {
    sets: string;
    reps: string;
    intensity: string;
    tempo: string;
    rest: string;
  };
  overloadStrategy: string;
  deloadWeek: number | null;
}

export interface GeneratedPlan {
  clientId: number;
  trainerId: number;
  clientName: string;
  generatedAt: string;
  planSummary: {
    durationWeeks: number;
    sessionsPerWeek: number;
    totalSessions: number;
    primaryGoal: string;
    startingPhase: number;
    equipmentProfileId: number | null;
  };
  mesocycles: Mesocycle[];
  weeklySchedule: { dayNumber: number; focus: string; category: string }[];
  constraints: ClientContext['constraints'];
  compensations: { type: string; trend: string }[];
  recommendations: string[];
}

export interface AdminOverview {
  fetchedAt: string;
  trainerId: number;
  painAlerts: {
    clientId: number;
    clientName: string;
    bodyRegion: string;
    painLevel: number;
    painType: string;
    reportedAt: string;
  }[];
  equipmentPendingApprovals: number;
  formAnalysis: {
    total: number;
    complete: number;
    processing: number;
    failed: number;
    avgScore: number;
    flaggedExercises: { userId: number; exercise: string; score: number }[];
  };
  variationSessionsThisWeek: number;
  workoutsLoggedThisWeek: number;
}

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
