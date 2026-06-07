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
import { attachWorkoutPlanPdf } from './useWorkoutMcp.planPdf';
import type { WorkoutPlan, WorkoutSession } from './useWorkoutMcp.types';

export type {
  ClientProgress,
  Exercise,
  SetData,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutPlanDay,
  WorkoutPlanDayExercise,
  WorkoutSession,
  WorkoutStatistics,
} from './useWorkoutMcp.types';

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
    const pdfAttachment = options.attachPdf && planId
      ? await attachWorkoutPlanPdf({
        api: apiService,
        planId,
        planData: payload.planData,
        clientName: options.clientName,
        goal: payload.planData.goal || plan.goal,
        nasmPhase: payload.nasmPhase,
        durationWeeks: payload.durationWeeks,
      })
      : 'skipped';
    return response.data && typeof response.data === 'object'
      ? { ...response.data, pdfAttachment }
      : { data: response.data, pdfAttachment };
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
