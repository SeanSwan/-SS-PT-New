/**
 * MCP Services Index
 * 
 * Exports all MCP related services for easy import in components.
 * This module serves as the central entry point for MCP (Model Context Protocol) services,
 * providing access to the gamification and workout API interfaces.
 * 
 * @module services/mcp
 */

// Type imports
import type { GamificationMcpApi } from '../../types/mcp/gamification.types';
import type { WorkoutMcpApi } from '../../types/mcp/workout.types';

export { default as workoutMcpApi } from './workoutMcpService';
export { default as gamificationMcpApi } from './gamificationMcpService';

/**
 * Interface for MCP server connectivity status
 */
export interface McpServersStatus {
  workout: boolean;
  gamification: boolean;
}

/**
 * Helper function for checking MCP servers connectivity
 * 
 * This function dynamically imports both MCP services and checks their server status.
 * It provides a convenient way to verify if all MCP services are available.
 * 
 * @returns Promise<McpServersStatus> Object with boolean status for each service
 */
export const checkMcpServersStatus = async (): Promise<McpServersStatus> => {
  const results: McpServersStatus = {
    workout: false,
    gamification: false
  };
  
  try {
    const workoutResult = await import('./workoutMcpService').then(module => 
      module.default.checkServerStatus()
        .then(() => true)
        .catch(() => false)
    );
    results.workout = workoutResult;
  } catch (error) {
    console.error('Error checking workout MCP server', error);
  }
  
  try {
    const gamificationResult = await import('./gamificationMcpService').then(module => 
      module.default.checkServerStatus()
        .then(() => true)
        .catch(() => false)
    );
    results.gamification = gamificationResult;
  } catch (error) {
    console.error('Error checking gamification MCP server', error);
  }
  
  return results;
};