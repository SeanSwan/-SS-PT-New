/**
 * Legacy MCP integration hook.
 *
 * Kept for older UI imports, but all runtime work now goes through
 * SwanStudios REST APIs. MCP servers are retired, so `mcpStatus` is always
 * false and no localhost/MCP bridge calls are made.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import gamificationRewardsService from '../services/gamificationRewardsService';

interface McpServersStatus {
  workout: boolean;
  gamification: boolean;
}

interface WorkoutData {
  recommendations?: any;
  progress?: any;
  statistics?: any;
}

interface GamificationData {
  profile?: any;
  achievements?: any;
  challenges?: any;
  gameBoard?: any;
}

interface UseMcpIntegrationOptions {
  checkInterval?: number;
  cacheExpiry?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialCheckDelay?: number;
}

const retiredStatus: McpServersStatus = { workout: false, gamification: false };

const useMcpIntegration = (_options: UseMcpIntegrationOptions = {}) => {
  const { user } = useAuth();
  const [mcpStatus, setMcpStatus] = useState<McpServersStatus>(retiredStatus);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [workoutData, setWorkoutData] = useState<WorkoutData>({});
  const [gamificationData, setGamificationData] = useState<GamificationData>({});

  const checkMcpStatus = useCallback(async () => {
    setMcpStatus(retiredStatus);
    return retiredStatus;
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [progressResult, statsResult, profileResult, achievementsResult, challengesResult] =
        await Promise.allSettled([
          apiService.get(`/api/workout/progress/${user.id}`),
          apiService.get(`/api/workout/statistics/${user.id}`),
          apiService.get('/api/v1/gamification/profile'),
          apiService.get('/api/v1/gamification/achievements'),
          apiService.get('/api/v1/gamification/challenges?limit=5')
        ]);

      setWorkoutData({
        progress: progressResult.status === 'fulfilled' ? progressResult.value.data?.progress || progressResult.value.data : null,
        statistics: statsResult.status === 'fulfilled' ? statsResult.value.data : null
      });

      setGamificationData({
        profile: profileResult.status === 'fulfilled' ? profileResult.value.data?.profile || null : null,
        achievements: achievementsResult.status === 'fulfilled' ? achievementsResult.value.data?.achievements || [] : [],
        challenges: challengesResult.status === 'fulfilled' ? challengesResult.value.data?.challenges || [] : []
      });
    } catch (err: any) {
      setError(err?.message || 'Error fetching SwanStudios API data');
    } finally {
      setMcpStatus(retiredStatus);
      setLoading(false);
    }
  }, [user?.id]);

  const logWorkoutActivity = useCallback(async (workoutPayload: any) => {
    if (!user?.id) {
      throw new Error('User ID not found');
    }

    const response = await apiService.post('/api/workout/sessions', {
      userId: user.id,
      ...workoutPayload
    });

    await gamificationRewardsService.recordWorkoutCompletion({
      userId: user.id,
      workoutId: workoutPayload.id || workoutPayload.workoutId || 'manual-workout',
      duration: Number(workoutPayload.duration || 0),
      exercisesCompleted: workoutPayload.exercises?.length
    });

    await fetchAllData();
    return response.data;
  }, [fetchAllData, user?.id]);

  const logFoodIntake = useCallback(async (_foodData: any) => ({
    success: true,
    pointsEarned: 0,
    message: 'Food intake is recorded by the nutrition API.'
  }), []);

  const rollDice = useCallback(async () => {
    throw new Error('Legacy MCP dice board is retired. Use the active gamification API surfaces.');
  }, []);

  useEffect(() => {
    checkMcpStatus();
    fetchAllData();
  }, [checkMcpStatus, fetchAllData]);

  return {
    mcpStatus,
    loading,
    error,
    workoutData,
    gamificationData,
    refreshData: () => fetchAllData(),
    logWorkoutActivity,
    logFoodIntake,
    rollDice
  };
};

export default useMcpIntegration;
