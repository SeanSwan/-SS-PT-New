import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { logger } from '@/utils/logger';
import { normalizeWorkoutRecommendationExercises } from './useWorkoutMcp.normalizers';
import {
  buildSwanCoachPlanRequest,
  buildWorkoutPlanSavePayload,
  buildWorkoutPlanFromSwanCoachPlan,
  type WorkoutPlanSaveOptions,
  type WorkoutPlanGenerationParams,
} from './useWorkoutMcp.planGeneration';

export interface Exercise {
  id: string;
  name: string;
  description: string;
  difficulty?: string;
  category?: string;
  exerciseType?: string;
  isRehabExercise?: boolean;
  optPhase?: string;
  muscleGroups?: { id: string; name: string; shortName: string; bodyRegion: string }[];
  equipment?: { id: string; name: string; category: string }[];
}

export interface SetData {
  setNumber: number;
  setType: string;
  repsGoal?: number;
  repsCompleted?: number;
  weightGoal?: number;
  weightUsed?: number;
  duration?: number;
  distance?: number;
  restGoal?: number;
  restTaken?: number;
  rpe?: number;
  tempo?: string;
  notes?: string;
  isPR?: boolean;
  completedAt?: string;
}

export interface WorkoutExercise {
  id?: string;
  exerciseId: string;
  orderInWorkout?: number;
  performanceRating?: number;
  difficultyRating?: number;
  painLevel?: number;
  formRating?: number;
  formNotes?: string;
  isRehabExercise?: boolean;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  sets?: SetData[];
  exercise?: Exercise;
}

export interface WorkoutSession {
  id?: string;
  userId: string;
  workoutPlanId?: string;
  title: string;
  description?: string;
  plannedStartTime?: string;
  startedAt?: string;
  completedAt?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  duration?: number;
  caloriesBurned?: number;
  feelingRating?: number;
  intensityRating?: number;
  notes?: string;
  exercises?: WorkoutExercise[];
}

export interface ClientProgress {
  userId: string;
  strengthLevel: number;
  cardioLevel: number;
  flexibilityLevel: number;
  balanceLevel: number;
  coreLevel: number;
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  totalExercises: number;
  lastWorkoutDate?: string;
  currentStreak: number;
  personalRecords?: Record<string, any>;
}

export interface WorkoutStatistics {
  totalWorkouts: number;
  totalDuration: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  averageIntensity: number;
  weekdayBreakdown: number[];
  exerciseBreakdown?: { exerciseId: string; name: string; count: number }[];
  muscleGroupBreakdown?: { muscleGroup: string; count: number }[];
  intensityTrends?: { date: string; intensity: number }[];
  recentWorkouts?: { id: string; title: string; date: string; duration: number }[];
}

export interface WorkoutPlanDayExercise {
  exerciseId: string;
  exerciseName?: string;
  orderInWorkout?: number;
  setScheme?: string;
  repGoal?: string;
  restPeriod?: number;
  tempo?: string;
  intensityGuideline?: string;
  supersetGroup?: number;
  notes?: string;
  isOptional?: boolean;
  alternateExerciseId?: string;
}

export interface WorkoutPlanDay {
  dayNumber: number;
  name: string;
  focus?: string;
  dayType: string;
  optPhase?: string;
  notes?: string;
  warmupInstructions?: string;
  cooldownInstructions?: string;
  estimatedDuration?: number;
  sortOrder?: number;
  exercises?: WorkoutPlanDayExercise[];
}

export interface WorkoutPlan {
  id?: string;
  name: string;
  description?: string;
  trainerId: string;
  clientId: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed' | 'archived';
  planningSystem?: string;
  planData?: unknown;
  days?: WorkoutPlanDay[];
}

/**
 * Workout API hook.
 *
 * The exported name is retained for compatibility with older dashboard code,
 * but the implementation now uses SwanStudios backend APIs only.
 */
export const useWorkoutMcp = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withLoading = useCallback(async <T,>(label: string, task: () => Promise<T>): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      return await task();
    } catch (err) {
      const message = err instanceof Error ? err.message : `${label} failed`;
      setError(message);
      logger.warn(`[WorkoutAPI] ${label} failed:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkoutRecommendations = useCallback(async (params: {
    userId: string;
    goal?: string;
    difficulty?: string;
    equipment?: string[];
    muscleGroups?: string[];
    excludeExercises?: string[];
    limit?: number;
    rehabFocus?: boolean;
    optPhase?: string;
  }) => withLoading('workout recommendations', async () => {
    const response = params.userId === 'admin-library'
      ? await apiService.get('/api/exercises/library')
      : await apiService.get('/api/workout/recommendations', { params });
    const exercises =
      response.data?.recommendedExercises ||
      response.data?.exercises ||
      response.data?.data?.recommendedExercises ||
      response.data?.data?.exercises ||
      response.data?.data ||
      [];
    return {
      exercises: Array.isArray(exercises)
        ? normalizeWorkoutRecommendationExercises(exercises).slice(0, params.limit || 10)
        : []
    };
  }), [withLoading]);

  const getClientProgress = useCallback(async (userId: string) =>
    withLoading('client progress', async () => {
      const response = await apiService.get(`/api/workout/progress/${userId}`);
      return { progress: response.data?.progress || response.data?.data || response.data };
    }), [withLoading]);

  const getWorkoutStatistics = useCallback(async (params: {
    userId: string;
    startDate?: string;
    endDate?: string;
    includeExerciseBreakdown?: boolean;
    includeMuscleGroupBreakdown?: boolean;
    includeWeekdayBreakdown?: boolean;
    includeIntensityTrends?: boolean;
  }) => withLoading('workout statistics', async () => {
    const response = await apiService.get(`/api/workout/statistics/${params.userId}`, { params });
    return response.data?.statistics ? { statistics: response.data.statistics } : response.data;
  }), [withLoading]);

  const logWorkoutSession = useCallback(async (session: WorkoutSession) =>
    withLoading('log workout session', async () => {
      const response = await apiService.post('/api/workout/sessions', session);
      return response.data;
    }), [withLoading]);

  const generateWorkoutPlan = useCallback(async (params: WorkoutPlanGenerationParams) =>
    withLoading('Swan Coach plan generation', async () => {
      const request = buildSwanCoachPlanRequest(params);
      const response = await apiService.post('/api/workout-builder/plan', request);
      const generatedPlan = response.data?.plan;
      if (!generatedPlan || typeof generatedPlan !== 'object') {
        throw new Error('Swan Coach planning did not return a workout plan');
      }
      return {
        plan: buildWorkoutPlanFromSwanCoachPlan(
          params,
          generatedPlan as Record<string, unknown>,
          user?.id,
        ),
      };
    }), [user?.id, withLoading]);

  const saveWorkoutPlan = useCallback(async (
    plan: WorkoutPlan,
    options: WorkoutPlanSaveOptions = {},
  ) => withLoading('save workout plan', async () => {
    const payload = buildWorkoutPlanSavePayload(plan, { ...options, userRole: user?.role });
    const response = await apiService.post('/api/workout-plans', payload);
    const planId = response.data?.plan?.id;
    if (options.activate && planId) {
      await apiService.put(`/api/workout-plans/${encodeURIComponent(String(planId))}/activate`);
    }
    return response.data;
  }), [user?.role, withLoading]);

  const getMcpTools = useCallback(async () => ({
    tools: [],
    message: 'External workout MCP tools are decommissioned. Use SwanStudios workout APIs.'
  }), []);

  const checkMcpHealth = useCallback(async () => {
    setError(null);
    return false;
  }, []);

  return useMemo(() => ({
    getWorkoutRecommendations,
    getClientProgress,
    getWorkoutStatistics,
    logWorkoutSession,
    generateWorkoutPlan,
    saveWorkoutPlan,
    getMcpTools,
    checkMcpHealth,
    loading, error, setError,
  }), [
    getWorkoutRecommendations,
    getClientProgress,
    getWorkoutStatistics,
    logWorkoutSession,
    generateWorkoutPlan,
    saveWorkoutPlan,
    getMcpTools,
    checkMcpHealth,
    loading, error,
  ]);
};

export default useWorkoutMcp;
