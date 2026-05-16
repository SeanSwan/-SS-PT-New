/**
 * MCP Utilities
 * 
 * Compatibility utilities for retired MCP integrations.
 * SwanStudios now awards points and syncs progress through first-party APIs.
 */

/**
 * Types for MCP status
 */
export interface McpServerStatus {
  workout: boolean;
  gamification: boolean;
}

const RETIRED_STATUS: McpServerStatus = {
  workout: false,
  gamification: false
};

/**
 * MCP servers were retired to keep Render cost and operational surface down.
 * Keep the old helper name so legacy imports do not start network checks.
 */
export const checkMcpServersStatus = async (): Promise<McpServerStatus> => {
  return RETIRED_STATUS;
};

/**
 * Fast compatibility check. It must not ping retired localhost services.
 */
export const quickCheckMcpStatus = async (): Promise<McpServerStatus> => {
  return RETIRED_STATUS;
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
    return "Legacy MCP compatibility is available.";
  } else if (hasMcpFunctionality(status)) {
    return "Legacy MCP compatibility is partially available.";
  } else {
    return "MCP servers are retired. SwanStudios API routes handle workout and gamification data.";
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
  void userId;
  void workoutData;
  return false;
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
  void userId;
  void foodData;
  return false;
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
