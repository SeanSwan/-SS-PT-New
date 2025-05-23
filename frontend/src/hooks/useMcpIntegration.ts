/**
 * useMcpIntegration Hook
 * 
 * Custom hook that manages the integration between the client dashboard and both MCP servers.
 * Handles data flow, caching, and error handling for a seamless user experience.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { workoutMcpApi } from '../services/mcp/workoutMcpService';
import { gamificationMcpApi } from '../services/mcp/gamificationMcpService';
import { handleMcpError, notifyMcpError } from '../services/mcp/utils/mcp-error-handler';

// Types
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

interface CombinedData {
  workoutData: WorkoutData;
  gamificationData: GamificationData;
  updatedAt: Date;
}

interface UseMcpIntegrationOptions {
  checkInterval?: number; // How often to check MCP server status (ms)
  cacheExpiry?: number;   // How long to cache data (ms)
  autoRefresh?: boolean;  // Whether to auto-refresh data
  refreshInterval?: number; // How often to refresh data (ms)
  initialCheckDelay?: number; // Delay before first check (ms)
}

const defaultOptions: UseMcpIntegrationOptions = {
  checkInterval: 30000,      // Check every 30 seconds
  cacheExpiry: 5 * 60 * 1000, // Cache expires after 5 minutes
  autoRefresh: true,         // Auto-refresh data
  refreshInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  initialCheckDelay: 1000     // Wait 1 second before first check
};

/**
 * Custom hook for managing MCP server integration
 */
const useMcpIntegration = (options: UseMcpIntegrationOptions = {}) => {
  const { user } = useAuth();
  const mergedOptions = { ...defaultOptions, ...options };
  
  // State
  const [mcpStatus, setMcpStatus] = useState<McpServersStatus>({ workout: false, gamification: false });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [workoutData, setWorkoutData] = useState<WorkoutData>({});
  const [gamificationData, setGamificationData] = useState<GamificationData>({});
  
  // Cache ref to avoid re-renders
  const dataCache = useRef<CombinedData | null>(null);
  const lastRefreshTime = useRef<number>(0);
  const refreshTimerId = useRef<NodeJS.Timeout | null>(null);
  const checkStatusTimerId = useRef<NodeJS.Timeout | null>(null);
  
  // Check MCP servers status
  const checkMcpStatus = useCallback(async () => {
    try {
      // Check workout MCP
      const workoutStatus = await workoutMcpApi.checkServerStatus()
        .then(() => true)
        .catch(() => false);
      
      // Check gamification MCP
      const gamificationStatus = await gamificationMcpApi.checkServerStatus()
        .then(() => true)
        .catch(() => false);
      
      const newStatus = {
        workout: workoutStatus,
        gamification: gamificationStatus
      };
      
      setMcpStatus(newStatus);
      return newStatus;
    } catch (error) {
      console.error('[MCP] Error checking MCP servers status:', error);
      setMcpStatus({ workout: false, gamification: false });
      return { workout: false, gamification: false };
    }
  }, []);
  
  // Fetch workout data from the Workout MCP server
  const fetchWorkoutData = useCallback(async () => {
    if (!user?.id) {
      throw new Error('User ID not found');
    }
    
    if (!mcpStatus.workout) {
      return null;
    }
    
    try {
      // Get workout recommendations
      const recommendationsResponse = await workoutMcpApi.getWorkoutRecommendations({
        userId: user.id,
        goal: 'strength', // Could be dynamic based on user preferences
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
        recommendations: recommendationsResponse.data,
        progress: progressResponse.data,
        statistics: statsResponse.data
      };
    } catch (error) {
      const formattedError = handleMcpError(error, 'Workout');
      notifyMcpError(formattedError, false); // Don't show toast, just log
      throw formattedError;
    }
  }, [user?.id, mcpStatus.workout]);
  
  // Fetch gamification data from the Gamification MCP server
  const fetchGamificationData = useCallback(async () => {
    if (!user?.id) {
      throw new Error('User ID not found');
    }
    
    if (!mcpStatus.gamification) {
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
        gameBoard: boardResponse.data
      };
    } catch (error) {
      const formattedError = handleMcpError(error, 'Gamification');
      notifyMcpError(formattedError, false); // Don't show toast, just log
      throw formattedError;
    }
  }, [user?.id, mcpStatus.gamification]);
  
  // Fetch all MCP data
  const fetchAllData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      setError('User ID not found');
      setLoading(false);
      return;
    }
    
    // Check if we have cached data and it's not expired or we're forcing a refresh
    const now = Date.now();
    const cacheAge = now - lastRefreshTime.current;
    
    if (
      !forceRefresh && 
      dataCache.current && 
      cacheAge < mergedOptions.cacheExpiry!
    ) {
      // Use cached data
      setWorkoutData(dataCache.current.workoutData);
      setGamificationData(dataCache.current.gamificationData);
      setLoading(false);
      return;
    }
    
    // If we get here, we need to fetch new data
    setLoading(true);
    setError(null);
    
    try {
      // Check MCP status first
      const status = await checkMcpStatus();
      
      // Initialize data objects
      let newWorkoutData: WorkoutData = {};
      let newGamificationData: GamificationData = {};
      
      // Fetch data from each available MCP server
      if (status.workout) {
        const workoutResult = await fetchWorkoutData();
        if (workoutResult) {
          newWorkoutData = workoutResult;
        }
      }
      
      if (status.gamification) {
        const gamificationResult = await fetchGamificationData();
        if (gamificationResult) {
          newGamificationData = gamificationResult;
        }
      }
      
      // Update state
      setWorkoutData(newWorkoutData);
      setGamificationData(newGamificationData);
      
      // Update cache
      dataCache.current = {
        workoutData: newWorkoutData,
        gamificationData: newGamificationData,
        updatedAt: new Date()
      };
      
      lastRefreshTime.current = now;
    } catch (error: any) {
      console.error('[MCP] Error fetching data:', error);
      setError(error.message || 'Error fetching data from MCP servers');
    } finally {
      setLoading(false);
    }
  }, [user?.id, checkMcpStatus, fetchWorkoutData, fetchGamificationData, mergedOptions.cacheExpiry]);
  
  // Log new workout activity and process rewards
  const logWorkoutActivity = useCallback(async (workoutData: any) => {
    if (!user?.id) {
      throw new Error('User ID not found');
    }
    
    try {
      // First log to workout MCP
      if (mcpStatus.workout) {
        const response = await workoutMcpApi.logWorkoutSession({
          session: {
            userId: user.id,
            ...workoutData
          }
        });
        
        // If gamification MCP is available, send workout data for rewards
        if (mcpStatus.gamification) {
          await gamificationMcpApi.logActivity({
            userId: user.id,
            activityType: 'workout_completed',
            activityData: {
              workoutId: workoutData.id,
              ...workoutData
            }
          });
          
          // Refresh data after activity is logged
          await fetchAllData(true);
        }
        
        return response.data;
      }
      
      return null;
    } catch (error) {
      const formattedError = handleMcpError(error, 'Workout');
      notifyMcpError(formattedError);
      throw formattedError;
    }
  }, [user?.id, mcpStatus, fetchAllData]);
  
  // Log food intake data
  const logFoodIntake = useCallback(async (foodData: any) => {
    if (!user?.id) {
      throw new Error('User ID not found');
    }
    
    try {
      // First log to workout MCP for nutrition tracking
      if (mcpStatus.workout) {
        const response = await workoutMcpApi.logFoodIntake({
          userId: user.id,
          foodIntake: foodData
        });
        
        // If gamification MCP is available, process the food intake for rewards
        if (mcpStatus.gamification) {
          await gamificationMcpApi.processFoodIntake({
            userId: user.id,
            foodIntake: foodData
          });
          
          // Refresh data after food intake is logged
          await fetchAllData(true);
        }
        
        return response.data;
      }
      
      return null;
    } catch (error) {
      const formattedError = handleMcpError(error, 'Workout');
      notifyMcpError(formattedError);
      throw formattedError;
    }
  }, [user?.id, mcpStatus, fetchAllData]);
  
  // Roll dice in the gamification system
  const rollDice = useCallback(async () => {
    if (!user?.id || !mcpStatus.gamification) {
      throw new Error('Gamification MCP server not available');
    }
    
    try {
      const response = await gamificationMcpApi.rollDice({
        userId: user.id
      });
      
      // Refresh gamification data after rolling
      const gamificationResult = await fetchGamificationData();
      if (gamificationResult) {
        setGamificationData(gamificationResult);
        
        // Update cache
        if (dataCache.current) {
          dataCache.current.gamificationData = gamificationResult;
          dataCache.current.updatedAt = new Date();
        }
      }
      
      return response.data;
    } catch (error) {
      const formattedError = handleMcpError(error, 'Gamification');
      notifyMcpError(formattedError);
      throw formattedError;
    }
  }, [user?.id, mcpStatus.gamification, fetchGamificationData]);
  
  // Set up periodic checks and data refresh
  useEffect(() => {
    // Initial check with delay
    const initialCheckTimer = setTimeout(() => {
      checkMcpStatus().then(() => {
        fetchAllData();
      });
    }, mergedOptions.initialCheckDelay);
    
    // Set up interval for checking MCP status
    if (mergedOptions.checkInterval) {
      checkStatusTimerId.current = setInterval(checkMcpStatus, mergedOptions.checkInterval);
    }
    
    // Set up auto-refresh if enabled
    if (mergedOptions.autoRefresh && mergedOptions.refreshInterval) {
      refreshTimerId.current = setInterval(() => {
        fetchAllData();
      }, mergedOptions.refreshInterval);
    }
    
    // Clean up
    return () => {
      clearTimeout(initialCheckTimer);
      
      if (checkStatusTimerId.current) {
        clearInterval(checkStatusTimerId.current);
      }
      
      if (refreshTimerId.current) {
        clearInterval(refreshTimerId.current);
      }
    };
  }, [
    checkMcpStatus, 
    fetchAllData, 
    mergedOptions.checkInterval, 
    mergedOptions.autoRefresh, 
    mergedOptions.refreshInterval,
    mergedOptions.initialCheckDelay
  ]);
  
  return {
    mcpStatus,
    loading,
    error,
    workoutData,
    gamificationData,
    refreshData: (force = true) => fetchAllData(force),
    logWorkoutActivity,
    logFoodIntake,
    rollDice
  };
};

export default useMcpIntegration;