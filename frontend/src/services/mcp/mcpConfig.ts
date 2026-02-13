/**
 * MCP Configuration Service
 * ========================
 * 
 * Unified configuration for MCP server integration
 * Handles API endpoint configuration, health checks, and fallback modes
 * 
 * @module services/mcp/mcpConfig
 */

import productionApiService from '../api.service';

// Build-time gate: skip all MCP API calls when disabled (prevents 30s polling and wasted requests)
const MCP_ENABLED = import.meta.env.VITE_ENABLE_MCP_SERVICES === 'true';

const DISABLED_HEALTH: McpHealth = {
  status: 'disabled',
  timestamp: new Date().toISOString(),
  services: {
    workout: { status: 'disabled', message: 'MCP services disabled via VITE_ENABLE_MCP_SERVICES' },
    gamification: { status: 'disabled', message: 'MCP services disabled via VITE_ENABLE_MCP_SERVICES' }
  },
  mcpServicesEnabled: false
};

export interface McpServerStatus {
  status: 'online' | 'offline' | 'fallback' | 'disabled';
  message?: string;
  details?: any;
  lastChecked?: string;
}

export interface McpHealth {
  status: 'healthy' | 'degraded' | 'error' | 'disabled';
  timestamp: string;
  services: {
    workout: McpServerStatus;
    gamification: McpServerStatus;
  };
  mcpServicesEnabled: boolean;
}

/**
 * MCP Configuration Class
 * Manages MCP server connections, health checks, and fallbacks
 */
class McpConfigService {
  private healthCache: McpHealth | null = null;
  private lastHealthCheck = 0;
  private readonly HEALTH_CACHE_TTL = 30000; // 30 seconds
  
  /**
   * Check MCP server health status
   */
  async checkHealth(forceRefresh = false): Promise<McpHealth> {
    // Short-circuit when MCP is disabled — no API calls, no polling
    if (!MCP_ENABLED) return DISABLED_HEALTH;

    const now = Date.now();

    // Return cached health if within TTL and not forcing refresh
    if (!forceRefresh && this.healthCache && (now - this.lastHealthCheck) < this.HEALTH_CACHE_TTL) {
      return this.healthCache;
    }
    
    try {
      const response = await productionApiService.get('/mcp/health');
      this.healthCache = response.data;
      this.lastHealthCheck = now;
      
      console.log(`[MCP Config] Health check completed:`, this.healthCache.status);
      return this.healthCache;
    } catch (error) {
      console.error('[MCP Config] Health check failed:', error);
      
      // Create fallback health response
      this.healthCache = {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          workout: { 
            status: 'offline', 
            message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          },
          gamification: { 
            status: 'offline', 
            message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }
        },
        mcpServicesEnabled: false
      };
      
      this.lastHealthCheck = now;
      return this.healthCache;
    }
  }
  
  /**
   * Check if MCP services are available
   */
  async isAvailable(): Promise<boolean> {
    if (!MCP_ENABLED) return false;
    const health = await this.checkHealth();
    return health.mcpServicesEnabled && (
      health.services.workout.status === 'online' || 
      health.services.gamification.status === 'online'
    );
  }
  
  /**
   * Check if a specific MCP service is available
   */
  async isServiceAvailable(service: 'workout' | 'gamification'): Promise<boolean> {
    if (!MCP_ENABLED) return false;
    const health = await this.checkHealth();
    return health.mcpServicesEnabled && health.services[service].status === 'online';
  }
  
  /**
   * Get MCP server status
   */
  async getStatus() {
    if (!MCP_ENABLED) return { status: 'disabled', mcpServicesEnabled: false };
    try {
      const response = await productionApiService.get('/mcp/status');
      return response.data;
    } catch (error) {
      console.error('[MCP Config] Status check failed:', error);
      throw error;
    }
  }
  
  /**
   * Clear health cache (force refresh on next check)
   */
  clearHealthCache() {
    this.healthCache = null;
    this.lastHealthCheck = 0;
  }
}

// Export singleton instance
export const mcpConfig = new McpConfigService();
export default mcpConfig;
