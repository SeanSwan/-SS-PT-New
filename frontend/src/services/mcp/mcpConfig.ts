/**
 * Legacy MCP configuration compatibility layer.
 *
 * MCP servers were retired from the SwanStudios runtime because the app now
 * uses first-party REST APIs. This file intentionally fails closed so older
 * MCP-named imports cannot poll localhost, call /mcp routes, or show fake
 * online status.
 */

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

const retiredHealth = (): McpHealth => ({
  status: 'disabled',
  timestamp: new Date().toISOString(),
  services: {
    workout: { status: 'disabled', message: 'Workout MCP retired. Use /api/workout.' },
    gamification: { status: 'disabled', message: 'Gamification MCP retired. Use /api/v1/gamification.' }
  },
  mcpServicesEnabled: false
});

class McpConfigService {
  private healthCache: McpHealth | null = null;

  async checkHealth(forceRefresh = false): Promise<McpHealth> {
    if (!forceRefresh && this.healthCache) {
      return this.healthCache;
    }

    this.healthCache = retiredHealth();
    return this.healthCache;
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async isServiceAvailable(_service: 'workout' | 'gamification'): Promise<boolean> {
    return false;
  }

  async getStatus() {
    return {
      status: 'disabled',
      mcpServicesEnabled: false,
      replacement: '/api/workout, /api/v1/gamification'
    };
  }

  clearHealthCache() {
    this.healthCache = null;
  }
}

export const mcpConfig = new McpConfigService();
export default mcpConfig;
