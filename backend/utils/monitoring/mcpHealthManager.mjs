import { piiSafeLogger } from './piiSafeLogging.mjs';

/**
 * Retired MCP health manager compatibility layer.
 *
 * This module is still imported by older AI monitoring services, but MCP
 * servers are no longer a SwanStudios runtime dependency. Keep the API shape
 * stable while preventing URL polling, env-var reactivation, or fake online
 * statuses.
 */

const RETIRED_SERVERS = {
  workout: {
    name: 'Workout MCP',
    type: 'workout_generation',
    replacement: '/api/workout',
    metrics: retiredMetrics()
  },
  gamification: {
    name: 'Gamification MCP',
    type: 'gamification',
    replacement: '/api/v1/gamification',
    metrics: retiredMetrics()
  },
  nutrition: {
    name: 'Nutrition MCP',
    type: 'nutrition',
    replacement: '/api/nutrition',
    metrics: retiredMetrics()
  },
  alternatives: {
    name: 'Exercise Alternatives MCP',
    type: 'alternatives',
    replacement: '/api/workout',
    metrics: retiredMetrics()
  },
  yolo: {
    name: 'YOLO MCP',
    type: 'form_analysis',
    replacement: '/api/form-analysis',
    metrics: retiredMetrics()
  }
};

function retiredMetrics() {
  return {
    health: 0,
    latency: 0,
    tokenUsage: 0,
    successRate: 0,
    avgResponseTime: 0
  };
}

function retiredStatus(serverKey, server) {
  return {
    healthy: false,
    status: 'retired',
    message: 'Legacy MCP server retired; use SwanStudios first-party APIs.',
    replacement: server.replacement,
    serverKey,
    timestamp: Date.now()
  };
}

class MCPHealthManager {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.enableHealthChecks = false;
    this.enableHealthAlerting = false;
    this.mcpServers = structuredClone(RETIRED_SERVERS);
    this.healthCheckInterval = this.isProduction ? 60000 : 30000;
    this.alertThresholds = {
      maxLatency: 5000,
      minHealthScore: 50,
      maxErrorRate: 10
    };

    piiSafeLogger.info('MCP Health Monitoring retired; first-party APIs own runtime health.');
  }

  async checkAllMCPHealth() {
    const healthResults = {};
    for (const [serverKey, server] of Object.entries(this.mcpServers)) {
      healthResults[serverKey] = retiredStatus(serverKey, server);
    }
    return healthResults;
  }

  async checkSingleMCPHealth(serverKey) {
    const server = this.mcpServers[serverKey];
    if (!server) {
      throw new Error(`Unknown MCP server: ${serverKey}`);
    }
    return retiredStatus(serverKey, server);
  }

  async alertMCPFailure(serverKey, error) {
    piiSafeLogger.debug('MCP alert skipped because MCP monitoring is retired', {
      serverKey,
      error: error?.message || String(error)
    });
  }

  async checkAlerts(serverKey) {
    piiSafeLogger.debug('MCP alert checks skipped because MCP monitoring is retired', {
      serverKey
    });
    return [];
  }

  async getMCPEcosystemHealth() {
    const serverDetails = await this.checkAllMCPHealth();
    const totalServers = Object.keys(this.mcpServers).length;

    return {
      overallHealth: 0,
      healthyServers: 0,
      totalServers,
      averageLatency: 0,
      status: 'retired',
      message: 'Legacy MCP ecosystem retired; use SwanStudios first-party APIs.',
      serverDetails,
      timestamp: Date.now()
    };
  }

  startMonitoring() {
    piiSafeLogger.debug('MCP monitoring start ignored because MCP monitoring is retired');
    return false;
  }

  getServerMetrics(serverKey) {
    const server = this.mcpServers[serverKey];
    return server ? { ...server.metrics } : null;
  }

  updateServerMetrics(serverKey, metrics) {
    const server = this.mcpServers[serverKey];
    if (!server) {
      return false;
    }

    server.metrics = {
      ...server.metrics,
      ...metrics,
      health: 0,
      successRate: 0
    };
    return true;
  }

  async generateHealthReport() {
    const ecosystemHealth = await this.getMCPEcosystemHealth();

    return {
      reportGenerated: new Date().toISOString(),
      status: 'retired',
      summary: ecosystemHealth,
      recommendations: [
        'Keep MCP services disabled.',
        'Use /api/workout, /api/v1/gamification, /api/nutrition, and /api/form-analysis for runtime workflows.'
      ]
    };
  }
}

export const mcpHealthManager = new MCPHealthManager();

export default MCPHealthManager;
