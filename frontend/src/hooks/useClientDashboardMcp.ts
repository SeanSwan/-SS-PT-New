import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import workoutMcpApi from '../services/mcp/workoutMcpService';
import gamificationMcpApi from '../services/mcp/gamificationMcpService';
import { WorkoutProgress, TrainingProgramData } from '../types/mcp/workout.types';
import { GamificationProfile, Achievement, Challenge } from '../types/mcp/gamification.types';

// Interface for the gamification data structure
interface GamificationData {
  profile: GamificationProfile | null;
  achievements: Achievement[];
  challenges: Challenge[];
}

/**
 * Custom hook for integrating with the Client Dashboard MCP services
 * 
 * Provides data and functions for the client dashboard including:
 * - Progress data (fitness metrics, body measurements, etc.)
 * - Gamification data (achievements, leaderboard, etc.)
 * - Training program data (workouts, schedules, etc.)
 * 
 * This hook serves as the central integration point between the client dashboard
 * and the workout/gamification MCP servers, ensuring data synchronization between
 * the client and admin views of progress data.
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
      // Fetch progress data from MCP server
      const response = await workoutMcpApi.getClientProgress({
        userId: user.id
      });
      
      if (response?.data?.progress) {
        setProgress(response.data.progress);
      }
      
      return response?.data?.progress;
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
      // Fetch gamification profile data
      const profileResponse = await gamificationMcpApi.getGamificationProfile({
        userId: user.id
      });
      
      // Fetch achievements
      const achievementsResponse = await gamificationMcpApi.getAchievements({
        userId: user.id,
        includeCompleted: true,
        includeInProgress: true
      });
      
      // Fetch challenges
      const challengesResponse = await gamificationMcpApi.getChallenges({
        userId: user.id,
        limit: 3
      });
      
      // Combine all gamification data
      const gamificationData = {
        profile: profileResponse?.data?.profile || null,
        achievements: achievementsResponse?.data?.achievements || [],
        challenges: challengesResponse?.data?.challenges || []
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
      // Fetch training program data
      const response = await workoutMcpApi.getClientTrainingProgram({
        userId: user.id
      });
      
      if (response?.data?.program) {
        setTrainingProgram(response.data.program);
      }
      
      return response?.data?.program;
    } catch (err) {
      console.error('Error fetching training program data:', err);
      setError('Failed to load training program data. Please try again later.');
      return null;
    }
  }, [user?.id]);
  
  /**
   * Refresh all dashboard data
   * 
   * This function fetches data from both the workout and gamification MCP servers
   * in parallel to ensure a consistent view of the client's progress data.
   * 
   * @returns {Promise<void>}
   */
  const refreshAll = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel without using the other useCallback functions
      const results = await Promise.allSettled([
        // Fetch progress data
        workoutMcpApi.getClientProgress({ userId: user.id }).then(response => {
          if (response?.data?.progress) {
            setProgress(response.data.progress);
            return response.data.progress;
          }
          return null;
        }),
        
        // Fetch gamification data
        Promise.all([
          gamificationMcpApi.getGamificationProfile({ userId: user.id }),
          gamificationMcpApi.getAchievements({ userId: user.id, includeCompleted: true, includeInProgress: true }),
          gamificationMcpApi.getChallenges({ userId: user.id, limit: 3 })
        ]).then(([profileResponse, achievementsResponse, challengesResponse]) => {
          const gamificationData = {
            profile: profileResponse?.data?.profile || null,
            achievements: achievementsResponse?.data?.achievements || [],
            challenges: challengesResponse?.data?.challenges || []
          };
          setGamification(gamificationData);
          return gamificationData;
        }),
        
        // Fetch training program data
        workoutMcpApi.getClientTrainingProgram({ userId: user.id }).then(response => {
          if (response?.data?.program) {
            setTrainingProgram(response.data.program);
            return response.data.program;
          }
          return null;
        })
      ]);
      
      // Update last sync time
      setLastSyncTime(new Date());
      
      // Log successful sync for debugging
      console.log('Successfully synchronized data from MCP servers', {
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