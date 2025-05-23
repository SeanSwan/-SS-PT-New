/**
 * MCP Error Handler
 * 
 * Centralized error handling for MCP server requests.
 * Provides consistent error reporting and fallback strategies.
 */

import axios, { AxiosError } from 'axios';
import { toast } from '../../../components/ui/toast';

// Error types
export enum McpErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Formatted error response
export interface McpErrorResponse {
  type: McpErrorType;
  message: string;
  statusCode?: number;
  originalError?: any;
  serverName?: string;
}

/**
 * Handle MCP server errors with appropriate error types
 * @param error The error object from axios
 * @param serverName Name of the MCP server (Workout or Gamification)
 * @returns Formatted error response
 */
export const handleMcpError = (error: any, serverName: 'Workout' | 'Gamification'): McpErrorResponse => {
  let errorType = McpErrorType.UNKNOWN_ERROR;
  let errorMessage = 'An unknown error occurred while connecting to the MCP server.';
  let statusCode: number | undefined = undefined;
  
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    if (axiosError.response) {
      // Server returned an error response (4xx, 5xx)
      statusCode = axiosError.response.status;
      
      if (statusCode >= 400 && statusCode < 500) {
        errorType = McpErrorType.CLIENT_ERROR;
        
        if (statusCode === 401 || statusCode === 403) {
          errorType = McpErrorType.AUTHENTICATION_ERROR;
          errorMessage = `Authentication error: ${axiosError.response.statusText}. Please check your API token.`;
        } else {
          errorMessage = `Client error: ${axiosError.response.statusText}.`;
        }
      } else if (statusCode >= 500) {
        errorType = McpErrorType.SERVER_ERROR;
        errorMessage = `Server error: ${axiosError.response.statusText}. The MCP server encountered an internal error.`;
      }
    } else if (axiosError.request) {
      // No response received (server not running or network issue)
      errorType = McpErrorType.CONNECTION_ERROR;
      errorMessage = `Could not connect to the ${serverName} MCP server. Please check if the server is running.`;
    } else if (axiosError.code === 'ECONNABORTED') {
      // Request timeout
      errorType = McpErrorType.TIMEOUT_ERROR;
      errorMessage = `Request to ${serverName} MCP server timed out. The server might be under heavy load.`;
    }
  }
  
  // Log error to console with details
  console.error(`[${serverName} MCP] ${errorType}:`, {
    message: errorMessage,
    statusCode,
    originalError: error
  });
  
  return {
    type: errorType,
    message: errorMessage,
    statusCode,
    originalError: error,
    serverName
  };
};

/**
 * Show toast notification for MCP errors
 * @param error Formatted MCP error
 * @param showToast Whether to show toast notification
 */
export const notifyMcpError = (error: McpErrorResponse, showToast: boolean = true) => {
  if (showToast) {
    toast({
      title: `${error.serverName} MCP Error`,
      description: error.message,
      variant: "destructive",
      duration: 5000
    });
  }
};

/**
 * Check if MCP servers are available
 * This is a utility function that can be used to check both MCP servers
 * @param workoutMcpUrl URL of the Workout MCP server
 * @param gamificationMcpUrl URL of the Gamification MCP server
 */
export const checkMcpServersAvailability = async (
  workoutMcpUrl: string = process.env.REACT_APP_WORKOUT_MCP_URL || 'http://localhost:8000',
  gamificationMcpUrl: string = process.env.REACT_APP_GAMIFICATION_MCP_URL || 'http://localhost:8001'
) => {
  const results = {
    workout: false,
    gamification: false
  };
  
  // Check Workout MCP server
  try {
    await axios.get(`${workoutMcpUrl}/`, { timeout: 3000 });
    results.workout = true;
  } catch (error) {
    console.warn('[MCP] Workout MCP server not available', error);
  }
  
  // Check Gamification MCP server
  try {
    await axios.get(`${gamificationMcpUrl}/`, { timeout: 3000 });
    results.gamification = true;
  } catch (error) {
    console.warn('[MCP] Gamification MCP server not available', error);
  }
  
  return results;
};

export default {
  handleMcpError,
  notifyMcpError,
  checkMcpServersAvailability
};