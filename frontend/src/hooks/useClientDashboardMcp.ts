import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import { WorkoutProgress, TrainingProgramData } from '../types/mcp/workout.types';
import { GamificationProfile, Achievement, Challenge } from '../types/mcp/gamification.types';
import { logger } from '@/utils/logger';

// Interface for the gamification data structure
interface GamificationData {
  profile: GamificationProfile | null;
  achievements: Achievement[];
  challenges: Challenge[];
}

/**
 * Custom hook for integrating client dashboard data with SwanStudios APIs.
 * 
 * Provides data and functions for the client dashboard including:
 * - Progress data (fitness metrics, body measurements, etc.)
 * - Gamification data (achievements, leaderboard, etc.)
 * - Training program data (workouts, schedules, etc.)
 * 
 * This hook keeps the older export name for compatibility while routing all reads
 * through the same backend APIs used by the current dashboard surfaces.
 * 
 * @returns {Object} An object containing progress data, gamification data, loading state,
 *                  error state, and functions to refresh the data
 */
const useClientDashboardMcp = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<WorkoutProgress | null>(null);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [trainingProgram, setTrainingProgram] = useState<TrainingProgramData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  /**
   * Refresh progress data
   */
  const refreshProgress = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await apiService.get(`/api/workout/progress/${user.id}`);
      const progressData = response.data?.progress || response.data?.data?.progress || response.data?.data || null;
      
      if (progressData) {
        setProgress(progressData);
      }
      
      return progressData;
    } catch (err) {
      console.error('Error fetching progress data:', err);
      setError('Failed to load progress data. Please try again later.');
      return null;
    }
  }, [user?.id]);
  
  /**
   * Refresh gamification data
   */
  const refreshGamification = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const [profileResponse, achievementsResponse, challengesResponse] = await Promise.all([
        apiService.get('/api/v1/gamification/profile'),
        apiService.get('/api/v1/gamification/achievements'),
        apiService.get('/api/v1/gamification/challenges?limit=3')
      ]);
      
      const gamificationData = {
        profile: profileResponse.data?.profile || null,
        achievements: achievementsResponse.data?.achievements || [],
        challenges: challengesResponse.data?.challenges || []
      };
      
      setGamification(gamificationData);
      return gamificationData;
    } catch (err) {
      console.error('Error fetching gamification data:', err);
      setError('Failed to load gamification data. Please try again later.');
      return null;
    }
  }, [user?.id]);
  
  /**
   * Refresh training program data
   */
  const refreshTrainingProgram = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await apiService.get(`/api/workout-plans/client/${user.id}`);
      const programData = response.data?.program || response.data?.plan || null;
      
      if (programData) {
        setTrainingProgram(programData);
      }
      
      return programData;
    } catch (err) {
      console.error('Error fetching training program data:', err);
      setError('Failed to load training program data. Please try again later.');
      return null;
    }
  }, [user?.id]);
  
  /**
   * Refresh all dashboard data
   * 
   * @returns {Promise<void>}
   */
  const refreshAll = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const results = await Promise.allSettled([
        apiService.get(`/api/workout/progress/${user.id}`).then(response => {
          const progressData = response.data?.progress || response.data?.data?.progress || response.data?.data || null;
          if (progressData) {
            setProgress(progressData);
            return progressData;
          }
          return null;
        }),
        
        Promise.all([
          apiService.get('/api/v1/gamification/profile'),
          apiService.get('/api/v1/gamification/achievements'),
          apiService.get('/api/v1/gamification/challenges?limit=3')
        ]).then(([profileResponse, achievementsResponse, challengesResponse]) => {
          const gamificationData = {
            profile: profileResponse.data?.profile || null,
            achievements: achievementsResponse.data?.achievements || [],
            challenges: challengesResponse.data?.challenges || []
          };
          setGamification(gamificationData);
          return gamificationData;
        }),
        
        apiService.get(`/api/workout-plans/client/${user.id}`).then(response => {
          const programData = response.data?.program || response.data?.plan || null;
          if (programData) {
            setTrainingProgram(programData);
            return programData;
          }
          return null;
        })
      ]);
      
      // Update last sync time
      setLastSyncTime(new Date());
      
      // Log successful sync for debugging
      logger.log('Successfully synchronized client dashboard data from SwanStudios APIs', {
        progress: results[0].status === 'fulfilled' && results[0].value ? 'Success' : 'Failed',
        gamification: results[1].status === 'fulfilled' && results[1].value ? 'Success' : 'Failed',
        trainingProgram: results[2].status === 'fulfilled' && results[2].value ? 'Success' : 'Failed',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // Now only depends on user.id
  
  // Initial data fetch
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);
  
  return {
    // Data
    progress,
    gamification,
    trainingProgram,
    loading,
    error,
    lastSyncTime,
    
    // Refresh functions
    refreshProgress,
    refreshGamification,
    refreshTrainingProgram,
    refreshAll
  };
};

export default useClientDashboardMcp;
