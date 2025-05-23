/**
 * MCP Utilities
 * 
 * Utility functions for working with MCP servers and integration.
 * Centralized functions for checking MCP status, handling data flow,
 * and implementing fallback strategies.
 */

import axios from 'axios';
import { MCP_CONFIG } from '../config/env-config';
import { workoutMcpApi } from '../services/mcp/workoutMcpService';
import { gamificationMcpApi } from '../services/mcp/gamificationMcpService';

/**
 * Types for MCP status
 */
export interface McpServerStatus {
  workout: boolean;
  gamification: boolean;
}

/**
 * Check the status of both MCP servers
 * @returns Promise with status of both servers
 */
export const checkMcpServersStatus = async (): Promise<McpServerStatus> => {
  try {
    // Check workout MCP
    const workoutStatus = await workoutMcpApi.checkServerStatus()
      .then(() => true)
      .catch(() => false);
    
    // Check gamification MCP
    const gamificationStatus = await gamificationMcpApi.checkServerStatus()
      .then(() => true)
      .catch(() => false);
    
    return {
      workout: workoutStatus,
      gamification: gamificationStatus
    };
  } catch (error) {
    console.error('[MCP] Error checking MCP servers status:', error);
    return { workout: false, gamification: false };
  }
};

/**
 * Fast check of MCP status without waiting for API response
 * Useful for initial UI rendering before full status check completes
 * @returns Object with MCP status based on ping response
 */
export const quickCheckMcpStatus = async (): Promise<McpServerStatus> => {
  const status: McpServerStatus = {
    workout: false,
    gamification: false
  };
  
  try {
    // Check workout MCP with short timeout
    await axios.get(`${MCP_CONFIG.WORKOUT_MCP_URL}/`, { 
      timeout: 1000 // Short timeout for quick check
    })
      .then(() => { status.workout = true; })
      .catch(() => {});
    
    // Check gamification MCP with short timeout
    await axios.get(`${MCP_CONFIG.GAMIFICATION_MCP_URL}/`, { 
      timeout: 1000 // Short timeout for quick check
    })
      .then(() => { status.gamification = true; })
      .catch(() => {});
    
    return status;
  } catch (error) {
    return status;
  }
};

/**
 * Determine if we have enough MCP functionality to operate
 * @param status MCP server status object
 * @returns Boolean indicating if basic MCP functionality is available
 */
export const hasMcpFunctionality = (status: McpServerStatus): boolean => {
  // We need at least the workout MCP for basic functionality
  return status.workout;
};

/**
 * Determine if we have full MCP functionality
 * @param status MCP server status object
 * @returns Boolean indicating if full MCP functionality is available
 */
export const hasFullMcpFunctionality = (status: McpServerStatus): boolean => {
  // We need both MCP servers for full functionality
  return status.workout && status.gamification;
};

/**
 * Format a user-friendly status message about MCP servers
 * @param status MCP server status object
 * @returns User-friendly status message
 */
export const getMcpStatusMessage = (status: McpServerStatus): string => {
  if (hasFullMcpFunctionality(status)) {
    return "All MCP servers are online and functioning properly.";
  } else if (hasMcpFunctionality(status)) {
    return "Basic MCP functionality is available, but gamification features are limited.";
  } else {
    return "MCP servers are currently offline. Using cached data.";
  }
};

/**
 * Sync workout data with gamification MCP for rewards
 * @param userId User ID
 * @param workoutData Workout data to sync
 * @returns Boolean indicating success
 */
export const syncWorkoutWithGamification = async (
  userId: string,
  workoutData: any
): Promise<boolean> => {
  // First check if gamification MCP is available
  const status = await quickCheckMcpStatus();
  
  if (!status.gamification) {
    console.warn('[MCP] Gamification MCP unavailable for workout sync');
    return false;
  }
  
  try {
    // Log activity to gamification server
    await gamificationMcpApi.logActivity({
      userId,
      activityType: 'workout_completed',
      activityData: workoutData
    });
    
    return true;
  } catch (error) {
    console.error('[MCP] Error syncing workout with gamification:', error);
    return false;
  }
};

/**
 * Sync food intake data with gamification MCP for rewards
 * @param userId User ID
 * @param foodData Food intake data to sync
 * @returns Boolean indicating success
 */
export const syncFoodIntakeWithGamification = async (
  userId: string,
  foodData: any
): Promise<boolean> => {
  // First check if gamification MCP is available
  const status = await quickCheckMcpStatus();
  
  if (!status.gamification) {
    console.warn('[MCP] Gamification MCP unavailable for food intake sync');
    return false;
  }
  
  try {
    // Process food intake for rewards
    await gamificationMcpApi.processFoodIntake({
      userId,
      foodIntake: foodData
    });
    
    return true;
  } catch (error) {
    console.error('[MCP] Error syncing food intake with gamification:', error);
    return false;
  }
};

export default {
  checkMcpServersStatus,
  quickCheckMcpStatus,
  hasMcpFunctionality,
  hasFullMcpFunctionality,
  getMcpStatusMessage,
  syncWorkoutWithGamification,
  syncFoodIntakeWithGamification
};