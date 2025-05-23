/**
 * MCP Authentication Utilities
 * 
 * Utilities for handling authentication with MCP servers
 * including token management and authorization.
 */

import { MCP_CONFIG } from '../config/env-config';
import { checkMcpServersStatus } from './mcp-utils';

/**
 * Get the current authentication token for MCP servers
 * @returns The authentication token or null if not available
 */
export const getMcpAuthToken = (): string | null => {
  return localStorage.getItem(MCP_CONFIG.AUTH_TOKEN_KEY);
};

/**
 * Set the authentication token for MCP servers
 * @param token The token to set
 */
export const setMcpAuthToken = (token: string): void => {
  localStorage.setItem(MCP_CONFIG.AUTH_TOKEN_KEY, token);
};

/**
 * Remove the authentication token for MCP servers
 */
export const removeMcpAuthToken = (): void => {
  localStorage.removeItem(MCP_CONFIG.AUTH_TOKEN_KEY);
};

/**
 * Check if the user is authenticated with MCP servers
 * @returns Promise that resolves to boolean indicating if authenticated
 */
export const isMcpAuthenticated = async (): Promise<boolean> => {
  const token = getMcpAuthToken();
  
  // If no token, not authenticated
  if (!token) {
    return false;
  }
  
  try {
    // Check MCP status to verify authentication
    const status = await checkMcpServersStatus();
    
    // If at least one server is available, consider authenticated
    return status.workout || status.gamification;
  } catch (error) {
    console.error('Error checking MCP authentication:', error);
    return false;
  }
};

/**
 * Generate authentication headers for MCP requests
 * @returns Headers object with authorization token
 */
export const getMcpAuthHeaders = (): Record<string, string> => {
  const token = getMcpAuthToken();
  
  if (token) {
    return {
      'Authorization': `Bearer ${token}`
    };
  }
  
  return {};
};

/**
 * Set up authentication refresh interval
 * Periodically checks token validity and refreshes if needed
 * @param refreshCallback Optional callback to execute on refresh
 * @returns Cleanup function to clear interval
 */
export const setupMcpAuthRefresh = (
  refreshCallback?: () => void
): () => void => {
  // Check auth every 15 minutes
  const intervalId = setInterval(async () => {
    const isAuthenticated = await isMcpAuthenticated();
    
    if (isAuthenticated && refreshCallback) {
      refreshCallback();
    }
  }, 15 * 60 * 1000); // 15 minutes
  
  // Return cleanup function
  return () => clearInterval(intervalId);
};

export default {
  getMcpAuthToken,
  setMcpAuthToken,
  removeMcpAuthToken,
  isMcpAuthenticated,
  getMcpAuthHeaders,
  setupMcpAuthRefresh
};