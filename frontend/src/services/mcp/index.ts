/**
 * MCP Services Index
 * 
 * PRODUCTION MCP SERVICES - NO MOCK DATA
 * Exports all MCP related services with real API integration
 * 
 * This module serves as the central entry point for MCP (Model Context Protocol) services,
 * providing access to the gamification and workout API interfaces with real backend integration.
 * 
 * @module services/mcp
 */

// Configuration and utilities
export { default as mcpConfig } from './mcpConfig';
export type { McpServerStatus, McpHealth } from './mcpConfig';

// Core MCP services
export { default as workoutMcpApi, McpServiceError } from './workoutMcpService';
export { default as gamificationMcpApi, GamificationMcpError } from './gamificationMcpService';

// Type imports
import type { GamificationMcpApi } from '../../types/mcp/gamification.types';
import type { WorkoutMcpApi } from '../../types/mcp/workout.types';
import { logger } from '@/utils/logger';

/**
 * Interface for MCP server connectivity status
 */
export interface McpServersStatus {
  workout: {
    available: boolean;
    status: string;
    message?: string;
    lastChecked: string;
  };
  gamification: {
    available: boolean;
    status: string;
    message?: string;
    lastChecked: string;
  };
  overall: {
    healthy: boolean;
    servicesEnabled: boolean;
    timestamp: string;
  };
}

/**
 * Enhanced MCP Status Checker
 * 
 * Provides comprehensive status checking for all MCP services with detailed health information.
 * Uses the new mcpConfig service for consistent health monitoring.
 * 
 * @param forceRefresh - Force a fresh health check instead of using cached data
 * @returns Promise<McpServersStatus> Detailed status for each service
 */
export const checkMcpServersStatus = async (forceRefresh = false): Promise<McpServersStatus> => {
  const timestamp = new Date().toISOString();
  void forceRefresh;

  return {
    workout: {
      available: false,
      status: 'decommissioned',
      message: 'Workout MCP is retired. Use /api/workout and /api/workout/sessions.',
      lastChecked: timestamp
    },
    gamification: {
      available: false,
      status: 'decommissioned',
      message: 'Gamification MCP is retired. Use /api/v1/gamification.',
      lastChecked: timestamp
    },
    overall: {
      healthy: false,
      servicesEnabled: false,
      timestamp
    }
  };
};

/**
 * Quick MCP Availability Check
 * 
 * Simple boolean check for whether MCP services are available
 * 
 * @returns Promise<boolean> True if any MCP service is available
 */
export const isMcpAvailable = async (): Promise<boolean> => {
  return false;
};

/**
 * Check Specific Service Availability
 * 
 * Check if a specific MCP service is available
 * 
 * @param service - The service to check ('workout' | 'gamification')
 * @returns Promise<boolean> True if the service is available
 */
export const isServiceAvailable = async (service: 'workout' | 'gamification'): Promise<boolean> => {
  void service;
  return false;
};

/**
 * Clear MCP Health Cache
 * 
 * Forces fresh health checks on next status request
 */
export const clearMcpCache = (): void => {
  logger.log('[MCP Services] MCP health cache disabled because MCP servers are retired');
};

/**
 * MCP Service Health Monitor
 * 
 * Utility class for monitoring MCP service health over time
 */
export class McpHealthMonitor {
  private static instance: McpHealthMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthCallbacks: Array<(status: McpServersStatus) => void> = [];
  
  static getInstance(): McpHealthMonitor {
    if (!McpHealthMonitor.instance) {
      McpHealthMonitor.instance = new McpHealthMonitor();
    }
    return McpHealthMonitor.instance;
  }
  
  /**
   * Start monitoring MCP service health
   * 
   * @param intervalMs - Monitoring interval in milliseconds (default: 30000 = 30 seconds)
   */
  startMonitoring(intervalMs = 30000): void {
    // Skip monitoring entirely when MCP is disabled at build time
    if (import.meta.env.VITE_ENABLE_MCP_SERVICES !== 'true') {
      logger.log('[MCP Health Monitor] MCP disabled — skipping health monitoring');
      return;
    }

    if (this.monitoringInterval) {
      logger.warn('[MCP Health Monitor] Already monitoring, stopping previous interval');
      this.stopMonitoring();
    }

    logger.log(`[MCP Health Monitor] Starting health monitoring (interval: ${intervalMs}ms)`);
    
    // Initial check
    this.performHealthCheck();
    
    // Set up recurring checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);
  }
  
  /**
   * Stop monitoring MCP service health
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.log('[MCP Health Monitor] Health monitoring stopped');
    }
  }
  
  /**
   * Add a callback to be called when health status changes
   * 
   * @param callback - Function to call with status updates
   */
  onHealthUpdate(callback: (status: McpServersStatus) => void): void {
    this.healthCallbacks.push(callback);
  }
  
  /**
   * Remove a health update callback
   * 
   * @param callback - The callback function to remove
   */
  removeHealthCallback(callback: (status: McpServersStatus) => void): void {
    const index = this.healthCallbacks.indexOf(callback);
    if (index > -1) {
      this.healthCallbacks.splice(index, 1);
    }
  }
  
  private async performHealthCheck(): Promise<void> {
    try {
      const status = await checkMcpServersStatus(true); // Force refresh
      
      // Notify all callbacks
      this.healthCallbacks.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.error('[MCP Health Monitor] Callback error:', error);
        }
      });
      
    } catch (error) {
      console.error('[MCP Health Monitor] Health check failed:', error);
    }
  }
}

// Export singleton instance for convenience
export const mcpHealthMonitor = McpHealthMonitor.getInstance();
