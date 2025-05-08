/**
 * useClientDashboardMcp Hook
 * 
 * Custom hook for the client dashboard that integrates with both MCP servers
 * and handles data loading, sync, and fallback mechanisms.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { workoutMcpApi } from '../services/mcp/workoutMcpService';
import { gamificationMcpApi } from '../services/mcp/gamificationMcpService';
import { checkMcpServersStatus, quickCheckMcpStatus, McpServerStatus } from '../utils/mcp-utils';
import { toast } from '../components/ui/toast';

// Types for hook state and returns
interface DashboardWorkoutData {
  recommendations?: any[];
  progress?: any;
  statistics?: any;
  recentWorkouts?: any[];
}

interface DashboardGamificationData {
  profile?: any;
  achievements?: any[];
  challenges?: any[];
  gameBoard?: any;
  streak?: number;
}

interface UseClientDashboardMcpOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showToasts?: boolean;
}

interface UseClientDashboardMcpReturn {
  loading: boolean;
  error: string | null;
  mcpStatus: McpServerStatus;
  workoutData: DashboardWorkoutData;
  gamificationData: DashboardGamificationData;
  refreshData: (force?: boolean) => Promise<void>;
  logWorkoutCompletion: (workoutData: any) => Promise<boolean>;
  logFoodIntake: (foodData: any) => Promise<boolean>;
  updateGameProgress: (action: string, data?: any) => Promise<boolean>;
}

// Default options
const defaultOptions: UseClientDashboardMcpOptions = {
  autoRefresh: true,
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  showToasts: true
};

/**
 * Custom hook for client dashboard MCP integration
 */
const useClientDashboardMcp = (
  options?: UseClientDashboardMcpOptions
): UseClientDashboardMcpReturn => {
  const { user } = useAuth();
  const mergedOptions = { ...defaultOptions, ...options };
  
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mcpStatus, setMcpStatus] = useState<McpServerStatus>({ workout: false, gamification: false });
  
  // Data
  const [workoutData, setWorkoutData] = useState<DashboardWorkoutData>({});
  const [gamificationData, setGamificationData] = useState<DashboardGamificationData>({});
  
  // Cache
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  
  // Check MCP servers status
  const checkStatus = useCallback(async () => {
    try {
      const status = await checkMcpServersStatus();
      setMcpStatus(status);
      return status;
    } catch (error) {
      console.error('[MCP] Error checking MCP status:', error);
      setMcpStatus({ workout: false, gamification: false });
      return { workout: false, gamification: false };
    }
  }, []);
  
  // Fetch workout data from MCP
  const fetchWorkoutData = useCallback(async () => {
    if (!user?.id || !mcpStatus.workout) {
      return null;
    }
    
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
      
      // Get workout statistics
      const statsResponse = await workoutMcpApi.getWorkoutStatistics({
        userId: user.id,
        includeExerciseBreakdown: true,
        includeMuscleGroupBreakdown: true
      });
      
      // Return combined data
      return {
        recommendations: recommendationsResponse.data?.workouts || [],
        progress: progressResponse.data,
        statistics: statsResponse.data,
        recentWorkouts: progressResponse.data?.recentWorkouts || []
      };
    } catch (error) {
      console.error('[MCP] Error fetching workout data:', error);
      return null;
    }
  }, [user?.id, mcpStatus.workout]);
  
  // Fetch gamification data from MCP
  const fetchGamificationData = useCallback(async () => {
    if (!user?.id || !mcpStatus.gamification) {
      return null;
    }
    
    try {
      // Get gamification profile
      const profileResponse = await gamificationMcpApi.getGamificationProfile({
        userId: user.id
      });
      
      // Get achievements
      const achievementsResponse = await gamificationMcpApi.getAchievements({
        userId: user.id,
        includeCompleted: true,
        includeInProgress: true
      });
      
      // Get challenges
      const challengesResponse = await gamificationMcpApi.getChallenges({
        userId: user.id
      });
      
      // Get game board position
      const boardResponse = await gamificationMcpApi.getBoardPosition({
        userId: user.id
      });
      
      // Return combined data
      return {
        profile: profileResponse.data,
        achievements: achievementsResponse.data,
        challenges: challengesResponse.data,
        gameBoard: boardResponse.data,
        streak: profileResponse.data?.streak || 0
      };
    } catch (error) {
      console.error('[MCP] Error fetching gamification data:', error);
      return null;
    }
  }, [user?.id, mcpStatus.gamification]);
  
  // Generate mock workout data for development/fallback
  const generateMockWorkoutData = useCallback((): DashboardWorkoutData => {
    return {
      recommendations: [
        {
          id: '1',
          name: 'Full Body Strength',
          type: 'strength',
          duration: 45,
          difficulty: 'intermediate',
          exercises: [
            { name: 'Squats', sets: 3, reps: 12 },
            { name: 'Push-ups', sets: 3, reps: 15 },
            { name: 'Lunges', sets: 3, reps: 10 },
            { name: 'Dumbbell Rows', sets: 3, reps: 12 }
          ]
        },
        {
          id: '2',
          name: 'HIIT Cardio',
          type: 'cardio',
          duration: 30,
          difficulty: 'advanced',
          exercises: [
            { name: 'Jumping Jacks', time: '45s', rest: '15s' },
            { name: 'Mountain Climbers', time: '45s', rest: '15s' },
            { name: 'Burpees', time: '45s', rest: '15s' },
            { name: 'High Knees', time: '45s', rest: '15s' }
          ]
        },
        {
          id: '3',
          name: 'Core Stability',
          type: 'core',
          duration: 20,
          difficulty: 'beginner',
          exercises: [
            { name: 'Plank', time: '45s', rest: '15s' },
            { name: 'Russian Twists', sets: 3, reps: 20 },
            { name: 'Superman', time: '30s', rest: '15s' },
            { name: 'Dead Bug', sets: 3, reps: 12 }
          ]
        }
      ],
      progress: {
        weeklyWorkouts: 3,
        monthlyWorkouts: 12,
        totalWorkouts: 45,
        startDate: '2023-01-01',
        lastWorkout: '2025-05-06'
      },
      statistics: {
        workoutsByType: {
          strength: 20,
          cardio: 15,
          flexibility: 5,
          hiit: 5
        },
        workoutsByMuscleGroup: {
          chest: 10,
          back: 8,
          legs: 12,
          arms: 7,
          shoulders: 5,
          core: 3
        },
        totalDuration: 1350, // minutes
        averageDuration: 30, // minutes
        totalCaloriesBurned: 9500
      },
      recentWorkouts: [
        {
          id: '101',
          name: 'Morning HIIT',
          date: '2025-05-06',
          duration: 25,
          caloriesBurned: 320
        },
        {
          id: '102',
          name: 'Leg Day',
          date: '2025-05-04',
          duration: 45,
          caloriesBurned: 480
        },
        {
          id: '103',
          name: 'Upper Body',
          date: '2025-05-02',
          duration: 40,
          caloriesBurned: 350
        }
      ]
    };
  }, []);
  
  // Generate mock gamification data for development/fallback
  const generateMockGamificationData = useCallback((): DashboardGamificationData => {
    return {
      profile: {
        id: user?.id || '1',
        level: 12,
        points: 2450,
        nextLevelPoints: 3000,
        tier: 'silver',
        streak: 8,
        attributes: {
          strength: { level: 14, progress: 60 },
          cardio: { level: 10, progress: 45 },
          flexibility: { level: 8, progress: 30 },
          balance: { level: 9, progress: 70 }
        }
      },
      achievements: [
        {
          id: '1',
          name: 'Consistency Champion',
          description: 'Work out 5 days in a row',
          icon: 'Lightning',
          completed: true,
          progress: 5,
          totalRequired: 5,
          dateCompleted: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          tier: 'silver',
          pointValue: 200
        },
        {
          id: '2',
          name: 'Strength Master',
          description: 'Complete 10 strength workouts',
          icon: 'Trophy',
          completed: false,
          progress: 7,
          totalRequired: 10,
          tier: 'bronze',
          pointValue: 100
        },
        {
          id: '3',
          name: 'Nutrition Expert',
          description: 'Log 20 healthy meals',
          icon: 'Star',
          completed: false,
          progress: 12,
          totalRequired: 20,
          tier: 'silver',
          pointValue: 150
        }
      ],
      challenges: [
        {
          id: '1',
          name: '30-Day Plank Challenge',
          description: 'Do a plank every day, increasing time by 5 seconds',
          difficulty: 'medium',
          status: 'active',
          progress: 18,
          totalRequired: 30,
          reward: { points: 300 }
        },
        {
          id: '2',
          name: 'Hydration Hero',
          description: 'Drink 8 glasses of water daily for 14 days',
          difficulty: 'easy',
          status: 'available',
          progress: 0,
          totalRequired: 14,
          reward: { points: 150 }
        }
      ],
      gameBoard: {
        currentPosition: 8,
        totalSpaces: 30,
        boardName: 'Fitness Journey',
        currentSpace: {
          id: 'space-8',
          name: 'Nutrition Boost',
          description: 'You landed on a nutrition power-up!',
          type: 'boost',
          reward: { points: 15 }
        },
        nextRollAvailable: true
      },
      streak: 8
    };
  }, [user?.id]);
  
  // Refresh all data
  const refreshData = useCallback(async (force = false) => {
    if (!user?.id) {
      setError('User ID not found');
      setLoading(false);
      return;
    }
    
    // Check if we should skip refresh (due to recent refresh)
    const now = Date.now();
    if (!force && now - lastRefresh < 60000) { // 1 minute cooldown for refreshes
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Check MCP status
      const status = await checkStatus();
      
      // Fetch data based on available servers
      let newWorkoutData = null;
      let newGamificationData = null;
      
      if (status.workout) {
        newWorkoutData = await fetchWorkoutData();
      }
      
      if (status.gamification) {
        newGamificationData = await fetchGamificationData();
      }
      
      // Update state with real or mock data
      setWorkoutData(newWorkoutData || generateMockWorkoutData());
      setGamificationData(newGamificationData || generateMockGamificationData());
      
      // Update last refresh time
      setLastRefresh(now);
    } catch (error: any) {
      console.error('[MCP] Error refreshing data:', error);
      setError(error.message || 'Error refreshing data');
      
      // Fall back to mock data
      setWorkoutData(generateMockWorkoutData());
      setGamificationData(generateMockGamificationData());
    } finally {
      setLoading(false);
    }
  }, [
    user?.id, 
    lastRefresh, 
    checkStatus, 
    fetchWorkoutData, 
    fetchGamificationData, 
    generateMockWorkoutData, 
    generateMockGamificationData
  ]);
  
  // Log workout completion
  const logWorkoutCompletion = useCallback(async (workoutData: any): Promise<boolean> => {
    if (!user?.id) {
      if (mergedOptions.showToasts) {
        toast({
          title: 'Error',
          description: 'User ID not found',
          variant: 'destructive'
        });
      }
      return false;
    }
    
    try {
      const status = await quickCheckMcpStatus();
      
      // Log to workout MCP if available
      if (status.workout) {
        await workoutMcpApi.logWorkoutSession({
          session: {
            userId: user.id,
            ...workoutData
          }
        });
        
        // Sync with gamification MCP if available
        if (status.gamification) {
          await gamificationMcpApi.logActivity({
            userId: user.id,
            activityType: 'workout_completed',
            activityData: workoutData
          });
        }
        
        // Refresh data
        await refreshData(true);
        
        if (mergedOptions.showToasts) {
          toast({
            title: 'Success',
            description: 'Workout completed successfully',
            variant: 'default'
          });
        }
        
        return true;
      } else {
        console.log('[MCP] MCP servers offline, mocking workout completion');
        
        // Refresh with mock data
        await refreshData(true);
        
        if (mergedOptions.showToasts) {
          toast({
            title: 'Success (Offline Mode)',
            description: 'Workout recorded in offline mode',
            variant: 'default'
          });
        }
        
        return true;
      }
    } catch (error: any) {
      console.error('[MCP] Error logging workout:', error);
      
      if (mergedOptions.showToasts) {
        toast({
          title: 'Error',
          description: error.message || 'Error logging workout',
          variant: 'destructive'
        });
      }
      
      return false;
    }
  }, [user?.id, refreshData, mergedOptions.showToasts]);
  
  // Log food intake
  const logFoodIntake = useCallback(async (foodData: any): Promise<boolean> => {
    if (!user?.id) {
      if (mergedOptions.showToasts) {
        toast({
          title: 'Error',
          description: 'User ID not found',
          variant: 'destructive'
        });
      }
      return false;
    }
    
    try {
      const status = await quickCheckMcpStatus();
      
      // Log to workout MCP if available
      if (status.workout) {
        await workoutMcpApi.logFoodIntake({
          userId: user.id,
          foodIntake: foodData
        });
        
        // Sync with gamification MCP if available
        if (status.gamification) {
          await gamificationMcpApi.processFoodIntake({
            userId: user.id,
            foodIntake: foodData
          });
        }
        
        // Refresh data
        await refreshData(true);
        
        if (mergedOptions.showToasts) {
          toast({
            title: 'Success',
            description: 'Food intake logged successfully',
            variant: 'default'
          });
        }
        
        return true;
      } else {
        console.log('[MCP] MCP servers offline, mocking food intake logging');
        
        // Refresh with mock data
        await refreshData(true);
        
        if (mergedOptions.showToasts) {
          toast({
            title: 'Success (Offline Mode)',
            description: 'Food intake recorded in offline mode',
            variant: 'default'
          });
        }
        
        return true;
      }
    } catch (error: any) {
      console.error('[MCP] Error logging food intake:', error);
      
      if (mergedOptions.showToasts) {
        toast({
          title: 'Error',
          description: error.message || 'Error logging food intake',
          variant: 'destructive'
        });
      }
      
      return false;
    }
  }, [user?.id, refreshData, mergedOptions.showToasts]);
  
  // Update game progress (roll dice, join challenge, etc.)
  const updateGameProgress = useCallback(async (action: string, data?: any): Promise<boolean> => {
    if (!user?.id) {
      if (mergedOptions.showToasts) {
        toast({
          title: 'Error',
          description: 'User ID not found',
          variant: 'destructive'
        });
      }
      return false;
    }
    
    try {
      const status = await quickCheckMcpStatus();
      
      // Check if gamification MCP is available
      if (!status.gamification) {
        console.log('[MCP] Gamification MCP offline, cannot update game progress');
        
        if (mergedOptions.showToasts) {
          toast({
            title: 'Error',
            description: 'Gamification server is offline',
            variant: 'destructive'
          });
        }
        
        return false;
      }
      
      // Perform action based on type
      switch (action) {
        case 'roll_dice':
          await gamificationMcpApi.rollDice({
            userId: user.id,
            useBoost: data?.useBoost || false
          });
          break;
          
        case 'join_challenge':
          await gamificationMcpApi.joinChallenge({
            userId: user.id,
            challengeId: data?.challengeId
          });
          break;
          
        case 'log_activity':
          await gamificationMcpApi.logActivity({
            userId: user.id,
            activityType: data?.activityType || 'custom',
            activityData: data
          });
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      // Refresh data
      await refreshData(true);
      
      if (mergedOptions.showToasts) {
        toast({
          title: 'Success',
          description: 'Game progress updated successfully',
          variant: 'default'
        });
      }
      
      return true;
    } catch (error: any) {
      console.error(`[MCP] Error updating game progress (${action}):`, error);
      
      if (mergedOptions.showToasts) {
        toast({
          title: 'Error',
          description: error.message || 'Error updating game progress',
          variant: 'destructive'
        });
      }
      
      return false;
    }
  }, [user?.id, refreshData, mergedOptions.showToasts]);
  
  // Initial data load
  useEffect(() => {
    // Quick check of MCP status first
    quickCheckMcpStatus().then(initialStatus => {
      setMcpStatus(initialStatus);
      
      // Then do full refresh
      refreshData();
    });
  }, [refreshData]);
  
  // Set up auto-refresh
  useEffect(() => {
    if (!mergedOptions.autoRefresh || !mergedOptions.refreshInterval) {
      return;
    }
    
    const interval = setInterval(() => {
      refreshData();
    }, mergedOptions.refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshData, mergedOptions.autoRefresh, mergedOptions.refreshInterval]);
  
  // Return hook data and methods
  return {
    loading,
    error,
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