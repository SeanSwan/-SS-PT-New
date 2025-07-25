/**
 * MCP Service Base Types
 * 
 * ENHANCED - Common type definitions for MCP API services
 * Added additional response types and error handling
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
  pointsEarned?: number;
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

/**
 * Enhanced response for services with AI integration
 */
export interface AiEnhancedResponse {
  aiInsights?: string;
  aiGenerated?: boolean;
  generatedContent?: string;
  lastAnalyzed?: string;
  mcpEnhanced?: boolean;
  mcpResponse?: string;
  fallbackMode?: boolean;
  errorMessage?: string;
}

/**
 * Error response type
 */
export interface ErrorResponse {
  error: string;
  statusCode?: number;
  details?: any;
  timestamp: string;
}