/**
 * MCP Service Base Types
 * 
 * Common type definitions for MCP API services
 * 
 * @module types/mcp/service.types
 */

/**
 * Base response type for all MCP API calls
 */
export interface McpApiResponse<T> {
  data: T;
}

/**
 * Basic success response
 */
export interface SuccessResponse {
  success: boolean;
  message?: string;
}

/**
 * Server status response
 */
export interface ServerStatus {
  status: string;
  version: string;
  uptime: string;
  message: string;
}
