/**
 * MCP Error Handler
 * 
 * Centralized error handling for retired MCP adapter names.
 * Runtime availability checks are fail-closed because SwanStudios now uses REST APIs.
 */

import axios, { AxiosError } from 'axios';
import { logger } from '@/utils/logger';
// Toast function stub — shadcn toast infrastructure not fully wired
const toast = (opts: { title: string; description: string; variant?: string; duration?: number }) => {
  logger.warn(`[MCP Toast] ${opts.title}: ${opts.description}`);
};

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
  let errorMessage = 'The retired MCP adapter reported an unknown error.';
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
        errorMessage = `Server error: ${axiosError.response.statusText}. The retired MCP adapter encountered an internal error.`;
      }
    } else if (axiosError.request) {
      // No response received (server not running or network issue)
      errorType = McpErrorType.CONNECTION_ERROR;
      errorMessage = `The ${serverName} MCP server is retired. Use the SwanStudios REST APIs instead.`;
    } else if (axiosError.code === 'ECONNABORTED') {
      // Request timeout
      errorType = McpErrorType.TIMEOUT_ERROR;
      errorMessage = `Request to the retired ${serverName} MCP adapter timed out.`;
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
 * Return the retired MCP availability state without making network calls.
 */
export const checkMcpServersAvailability = async (
  _workoutMcpUrl: string = '',
  _gamificationMcpUrl: string = ''
) => {
  return {
    workout: false,
    gamification: false
  };
};

export default {
  handleMcpError,
  notifyMcpError,
  checkMcpServersAvailability
};
