import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { workoutMcpApi, gamificationMcpApi } from '../services/mcpApis';

/**
 * Custom hook for managing Client Dashboard MCP integrations
 * Provides unified access to workout and gamification data
 */
const useClientDashboardMcp = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [mcpStatus, setMcpStatus] = useState<{workout: boolean; gamification: boolean}>({
    workout: false,
    gamification: false
  });
  const [workoutData, setWorkoutData] = useState<any>(null);
  const [gamificationData, setGamificationData] = useState<any>(null);

  // Check MCP server status
  const checkMcpStatus = useCallback(async () => {
    try {
      // Check workout MCP server
      const workoutStatus = await workoutMcpApi.checkServerStatus()
        .then(() => true)
        .catch(() => false);
      
      // Check gamification MCP server
      const gamificationStatus = await gamificationMcpApi.checkServerStatus()
        .then(() => true)
        .catch(() => false);
      
      const status = {
        workout: workoutStatus,
        gamification: gamificationStatus
      };
      
      setMcpStatus(status);
      return status;
    } catch (error) {
      console.error('[MCP] Error checking MCP servers status', error);
      const status = { workout: false, gamification: false };
      setMcpStatus(status);
      return status;
    }
  }, []);

  // Load mock data as fallback
  const loadMockData = useCallback(() => {
    console.log('[MCP] Using mock data fallback');
    
    // Mock workout data
    const mockWorkoutData = {
      recommendations: {
        workouts: [
          {
            id: '1',
            name: 'Lower Body Strength',
            type: 'Strength',
            duration: 45,
            exercises: 8,
            level: 3
          },
          {
            id: '2',
            name: 'Core Stability',
            type: 'Core',
            duration: 30,
            exercises: 6,
            level: 2
          },
          {
            id: '3',
            name: 'Upper Body Power',
            type: 'Strength',
            duration: 40,
            exercises: 7,
            level: 3
          },
          {
            id: '4',
            name: 'HIIT Cardio',
            type: 'Cardio',
            duration: 25,
            exercises: 5,
            level: 4
          }
        ]
      },
      progress: {
        sessionsCompleted: 12,
        totalSessions: 20,
        daysActive: 24,
        weeklyProgress: 85
      }
    };
    
    // Mock gamification data
    const mockGamificationData = {
      profile: {
        level: 22,
        progress: 65,
        points: 2250,
        streak: 24,
        attributes: {
          strength: { level: 24, progress: 70 },
          cardio: { level: 18, progress: 45 },
          flexibility: { level: 20, progress: 60 },
          balance: { level: 19, progress: 50 }
        }
      },
      achievements: [
        {
          id: '1',
          name: 'Strength Master',
          description: 'Complete 10 strength workouts',
          progress: 8,
          totalRequired: 10,
          tier: 'silver',
          completed: false,
          icon: 'dumbbell'
        },
        {
          id: '2',
          name: 'Consistency Champion',
          description: 'Work out 5 days in a row',
          progress: 5,
          totalRequired: 5,
          tier: 'gold',
          completed: true,
          icon: 'award'
        },
        {
          id: '3',
          name: 'Flexibility Guru',
          description: 'Reach level 10 in flexibility',
          progress: 6,
          totalRequired: 10,
          tier: 'bronze',
          completed: false,
          icon: 'activity'
        }
      ]
    };
    
    setWorkoutData(mockWorkoutData);
    setGamificationData(mockGamificationData);
    setLoading(false);
  }, []);

  // Fetch data from workout MCP
  const fetchWorkoutData = useCallback(async () => {
    if (!user?.id) return null;
    
    try {
      // Get workout recommendations
      const recommendationsResponse = await workoutMcpApi.getWorkoutRecommendations({
        userId: user.id,
        goal: 'strength',
        difficulty: 'intermediate',
        limit: 4
      });
      
      // Get client progress
      const progressResponse = await workoutMcpApi.getClientProgress({
        userId: user.id
      });
      
      // Combine workout data
      const combinedWorkoutData = {
        recommendations: recommendationsResponse.data,
        progress: progressResponse.data
      };
      
      setWorkoutData(combinedWorkoutData);
      return combinedWorkoutData;
    } catch (error) {
      console.error('[MCP] Error fetching workout data', error);
      return null;
    }
  }, [user?.id]);

  // Fetch gamification data
  const fetchGamificationData = useCallback(async (workoutData = null) => {
    if (!user?.id) return null;
    
    try {
      // If workout data is provided, log the activity
      if (workoutData) {
        await gamificationMcpApi.logActivity({
          userId: user.id,
          activityType: 'workout_data_sync',
          activityData: workoutData
        });
      }
      
      // Get profile
      const profileResponse = await gamificationMcpApi.getGamificationProfile({
        userId: user.id
      });
      
      // Get achievements
      const achievementsResponse = await gamificationMcpApi.getAchievements({
        userId: user.id,
        includeCompleted: true,
        includeInProgress: true
      });
      
      // Combine gamification data
      const combinedGamificationData = {
        profile: profileResponse.data,
        achievements: achievementsResponse.data
      };
      
      setGamificationData(combinedGamificationData);
      return combinedGamificationData;
    } catch (error) {
      console.error('[MCP] Error fetching gamification data', error);
      return null;
    }
  }, [user?.id]);

  // Refresh all data
  const refreshData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    
    // Check MCP server status
    const status = await checkMcpStatus();
    
    // If both servers are offline or forceRefresh is false, use mock data
    if ((!status.workout && !status.gamification) || !forceRefresh) {
      loadMockData();
      return;
    }
    
    // Fetch workout data if available
    let workoutResult = null;
    if (status.workout) {
      workoutResult = await fetchWorkoutData();
    }
    
    // Fetch gamification data if available
    if (status.gamification) {
      await fetchGamificationData(workoutResult);
    }
    
    // If no data was fetched, use mock data
    // Don't check workoutData and gamificationData state here as it creates a dependency loop
    // Instead check if we got results from the API calls
    if (!workoutResult && !status.gamification) {
      loadMockData();
    } else {
      setLoading(false);
    }
  }, [checkMcpStatus, fetchWorkoutData, fetchGamificationData, loadMockData]);

  // Log workout completion
  const logWorkoutCompletion = useCallback(async (workoutId: string, data: any) => {
    try {
      if (mcpStatus.workout) {
        // Log to workout MCP
        // Implementation would go here
      }
      
      if (mcpStatus.gamification) {
        // Log to gamification MCP
        await gamificationMcpApi.logActivity({
          userId: user?.id,
          activityType: 'workout_completed',
          activityData: {
            workoutId,
            ...data
          }
        });
        
        // Refresh gamification data
        await fetchGamificationData();
      }
      
      return true;
    } catch (error) {
      console.error('[MCP] Error logging workout completion', error);
      return false;
    }
  }, [mcpStatus, user?.id, fetchGamificationData]);

  // Log food intake
  const logFoodIntake = useCallback(async (data: any) => {
    try {
      if (mcpStatus.gamification) {
        // Log to gamification MCP
        await gamificationMcpApi.logActivity({
          userId: user?.id,
          activityType: 'food_intake',
          activityData: data
        });
        
        // Refresh gamification data
        await fetchGamificationData();
      }
      
      return true;
    } catch (error) {
      console.error('[MCP] Error logging food intake', error);
      return false;
    }
  }, [mcpStatus, user?.id, fetchGamificationData]);

  // Update game progress
  const updateGameProgress = useCallback(async (data: any) => {
    try {
      if (mcpStatus.gamification) {
        // Log to gamification MCP
        await gamificationMcpApi.logActivity({
          userId: user?.id,
          activityType: 'progress_update',
          activityData: data
        });
        
        // Refresh gamification data
        await fetchGamificationData();
      }
      
      return true;
    } catch (error) {
      console.error('[MCP] Error updating game progress', error);
      return false;
    }
  }, [mcpStatus, user?.id, fetchGamificationData]);

  // Initial data load
  useEffect(() => {
    // Run refreshData only once during initialization
    const initializeData = async () => {
      await refreshData(false);
    };
    
    initializeData();
    
    // Set up interval to check MCP status
    const intervalId = setInterval(() => {
      checkMcpStatus();
    }, 30000);
    
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once

  return {
    loading,
    mcpStatus,
    workoutData,
    gamificationData,
    refreshData,
    logWorkoutCompletion,
    logFoodIntake,
    updateGameProgress
  };
};

export default useClientDashboardMcp;
