import axios from 'axios';
import { piiSafeLogger } from './piiSafeLogging.mjs';

/**
 * P0: Individual MCP Server Health Monitoring
 * Comprehensive health management for all MCP servers
 * Aligned with Master Prompt v26 MCP-Centric Architecture
 */

class MCPHealthManager {
  constructor() {
    // Production-safe configuration for MCP health checks
    // MCP servers are not deployed in production — health checks are opt-IN in prod, opt-OUT in dev
    this.isProduction = process.env.NODE_ENV === 'production';
    // Unified semantics: opt-IN in production, opt-OUT in dev (matches mcpRoutes.mjs + MCPAnalytics.mjs)
    const mcpMasterSwitch = this.isProduction
      ? process.env.ENABLE_MCP_SERVICES === 'true'
      : process.env.ENABLE_MCP_SERVICES !== 'false';
    this.enableHealthChecks = this.isProduction
      ? (process.env.ENABLE_MCP_HEALTH_CHECKS === 'true' && mcpMasterSwitch)
      : process.env.ENABLE_MCP_HEALTH_CHECKS !== 'false';
    this.enableHealthAlerting = this.isProduction
      ? (process.env.ENABLE_MCP_HEALTH_ALERTS === 'true' && mcpMasterSwitch)
      : process.env.ENABLE_MCP_HEALTH_ALERTS !== 'false';
    
    // Define all MCP servers with their configurations
    this.mcpServers = {
      workout: {
        name: 'Workout Generation MCP',
        port: 8000,
        url: 'http://localhost:8000',
        healthEndpoint: '/health',
        statusEndpoint: '/status',
        metricsEndpoint: '/metrics',
        type: 'workout_generation',
        metrics: {
          health: 0,
          latency: 0,
          tokenUsage: 0,
          successRate: 100,
          workoutsGenerated: 0,
          avgResponseTime: 0
        }
      },
      gamification: {
        name: 'Enhanced Gamification MCP',
        port: 8002,
        url: 'http://localhost:8002',
        healthEndpoint: '/health',
        statusEndpoint: '/status',
        metricsEndpoint: '/metrics',
        type: 'gamification',
        metrics: {
          health: 0,
          latency: 0,
          pointsAwarded: 0,
          achievementsUnlocked: 0,
          activeUsers: 0,
          avgResponseTime: 0
        }
      },
      nutrition: {
        name: 'Nutrition Planning MCP',
        port: 8003,
        url: 'http://localhost:8003',
        healthEndpoint: '/health',
        statusEndpoint: '/status',
        metricsEndpoint: '/metrics',
        type: 'nutrition',
        metrics: {
          health: 0,
          latency: 0,
          mealsGenerated: 0,
          nutritionPlansCreated: 0,
          avgResponseTime: 0
        }
      },
      alternatives: {
        name: 'Exercise Alternatives MCP',
        port: 8004,
        url: 'http://localhost:8004',
        healthEndpoint: '/health',
        statusEndpoint: '/status',
        metricsEndpoint: '/metrics',
        type: 'alternatives',
        metrics: {
          health: 0,
          latency: 0,
          alternativesProvided: 0,
          adaptationsCreated: 0,
          avgResponseTime: 0
        }
      },
      yolo: {
        name: 'YOLO AI Form Analysis MCP',
        port: 8005,
        url: 'http://localhost:8005',
        healthEndpoint: '/health',
        statusEndpoint: '/status',
        metricsEndpoint: '/metrics',
        type: 'form_analysis',
        metrics: {
          health: 0,
          latency: 0,
          formsAnalyzed: 0,
          correctionsProvided: 0,
          avgResponseTime: 0
        }
      }
    };

    // Health check intervals - longer in production to reduce noise
    this.healthCheckInterval = this.isProduction ? 60000 : 30000; // 60s prod, 30s dev
    this.alertThresholds = {
      maxLatency: 5000, // 5 seconds
      minHealthScore: 50,
      maxErrorRate: 10 // 10%
    };

    // Start monitoring only if enabled
    if (this.enableHealthChecks) {
      this.startMonitoring();
    } else {
      piiSafeLogger.info('MCP Health Monitoring DISABLED via configuration');
    }
  }

  /**
   * Check health of all MCP servers
   */
  async checkAllMCPHealth() {
    // Skip health checks if disabled
    if (!this.enableHealthChecks) {
      piiSafeLogger.debug('MCP Health checks disabled, returning mock healthy status');
      const healthResults = {};
      for (const [serverKey] of Object.entries(this.mcpServers)) {
        healthResults[serverKey] = {
          healthy: true,
          status: 'disabled',
          message: 'Health checks disabled in configuration',
          timestamp: Date.now()
        };
      }
      return healthResults;
    }
    
    const healthResults = {};

    for (const [serverKey, serverConfig] of Object.entries(this.mcpServers)) {
      try {
        const healthResult = await this.checkSingleMCPHealth(serverKey);
        healthResults[serverKey] = healthResult;
      } catch (error) {
        // In production, reduce error noise for expected MCP service unavailability
        if (this.isProduction) {
          piiSafeLogger.warn(`MCP service unavailable: ${serverKey} (this is expected if MCP services are not deployed)`, { error: error.message });
        } else {
          piiSafeLogger.error(`Health check failed for ${serverKey}`, { error: error.message });
        }
        healthResults[serverKey] = {
          healthy: false,
          error: error.message,
          timestamp: Date.now()
        };
      }
    }

    // Log overall health status
    piiSafeLogger.info('Health check completed for all MCP servers', {
      serverCount: Object.keys(healthResults).length,
      timestamp: Date.now()
    });

    return healthResults;
  }

  /**
   * Check health of a single MCP server
   * @param {string} serverKey - Key identifying the server
   */
  async checkSingleMCPHealth(serverKey) {
    const server = this.mcpServers[serverKey];
    if (!server) {
      throw new Error(`Unknown MCP server: ${serverKey}`);
    }

    const startTime = Date.now();
    let healthData = {};

    try {
      // Primary health check
      const healthResponse = await axios.get(
        `${server.url}${server.healthEndpoint}`,
        { timeout: 5000 }
      );

      const latency = Date.now() - startTime;
      server.metrics.latency = latency;
      server.metrics.health = healthResponse.status === 200 ? 100 : 0;

      // Get detailed metrics if available
      try {
        const metricsResponse = await axios.get(
          `${server.url}${server.metricsEndpoint}`,
          { timeout: 3000 }
        );
        healthData.metrics = metricsResponse.data;
      } catch (metricsError) {
        // Metrics endpoint might not be available
        piiSafeLogger.warn(`Metrics unavailable for ${serverKey}`, {
          error: metricsError.message
        });
      }

      // Check for alerts
      await this.checkAlerts(serverKey, server);

      const healthResult = {
        healthy: true,
        latency,
        health: server.metrics.health,
        metrics: server.metrics,
        timestamp: Date.now(),
        ...healthData
      };

      // Log successful health check
      piiSafeLogger.info(`Health check successful for ${serverKey}`, {
        latency,
        health: server.metrics.health
      });

      return healthResult;

    } catch (error) {
      // Server is down or unreachable
      server.metrics.health = 0;
      server.metrics.latency = Date.now() - startTime;

      await this.alertMCPFailure(serverKey, error);

      throw error;
    }
  }

  /**
   * Alert when MCP server fails
   * @param {string} serverKey - Key identifying the server
   * @param {Error|Object} error - Error details
   */
  async alertMCPFailure(serverKey, error) {
    // Skip alerting if disabled or in production with expected service unavailability  
    if (!this.enableHealthAlerting || (this.isProduction && error.code === 'ECONNREFUSED')) {
      piiSafeLogger.debug(`MCP alerting skipped for ${serverKey}: alerting disabled or expected production unavailability`);
      return;
    }
    
    const server = this.mcpServers[serverKey];
    const alertData = {
      serverName: server.name,
      serverType: server.type,
      port: server.port,
      error: error.message || error,
      timestamp: Date.now(),
      severity: 'critical'
    };

    // Log the failure
    piiSafeLogger.error(`MCP Server Failure: ${serverKey}`, alertData);

    // Track the failure
    await piiSafeLogger.trackMCPOperation(`MCP Server Failure: ${serverKey}`, alertData);

    // Here you could integrate with alerting systems like:
    // - Email notifications
    // - Slack webhooks
    // - PagerDuty
    // - Discord notifications
    // For now, we'll use console output for immediate visibility (only if alerting enabled)
    if (this.enableHealthAlerting) {
      console.error(`🚨 CRITICAL: ${server.name} is DOWN`);
      console.error(`Port: ${server.port}, Error: ${error.message || error}`);
    }
  }

  /**
   * Check for various alert conditions
   * @param {string} serverKey - Key identifying the server
   * @param {Object} server - Server configuration and metrics
   */
  async checkAlerts(serverKey, server) {
    const alerts = [];

    // High latency alert
    if (server.metrics.latency > this.alertThresholds.maxLatency) {
      alerts.push({
        type: 'high_latency',
        message: `High latency detected: ${server.metrics.latency}ms`,
        threshold: this.alertThresholds.maxLatency
      });
    }

    // Low health score alert
    if (server.metrics.health < this.alertThresholds.minHealthScore) {
      alerts.push({
        type: 'low_health',
        message: `Low health score: ${server.metrics.health}%`,
        threshold: this.alertThresholds.minHealthScore
      });
    }

    // Log alerts if any
    if (alerts.length > 0) {
      piiSafeLogger.warn(`Alerts for ${serverKey}`, { alerts });
    }
  }

  /**
   * Get overall MCP ecosystem health
   */
  async getMCPEcosystemHealth() {
    const allHealth = await this.checkAllMCPHealth();
    
    let totalServers = Object.keys(this.mcpServers).length;
    let healthyServers = 0;
    let averageLatency = 0;
    let totalLatency = 0;

    for (const [serverKey, healthResult] of Object.entries(allHealth)) {
      if (healthResult.healthy) {
        healthyServers++;
        totalLatency += healthResult.latency || 0;
      }
    }

    averageLatency = healthyServers > 0 ? totalLatency / healthyServers : 0;

    return {
      overallHealth: (healthyServers / totalServers) * 100,
      healthyServers,
      totalServers,
      averageLatency,
      serverDetails: allHealth,
      timestamp: Date.now()
    };
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    // Skip monitoring if disabled
    if (!this.enableHealthChecks) {
      piiSafeLogger.info('MCP Health Monitoring startup skipped - disabled in configuration');
      return;
    }
    
    setInterval(async () => {
      try {
        await this.checkAllMCPHealth();
      } catch (error) {
        if (this.isProduction) {
          piiSafeLogger.debug('MCP monitoring cycle completed with expected service unavailability', { error: error.message });
        } else {
          piiSafeLogger.error('Monitoring cycle failed', { error: error.message });
        }
      }
    }, this.healthCheckInterval);

    piiSafeLogger.info('MCP Health Monitoring Started', {
      interval: this.healthCheckInterval,
      servers: Object.keys(this.mcpServers)
    });
  }

  /**
   * Get metrics for a specific server
   * @param {string} serverKey - Key identifying the server
   */
  getServerMetrics(serverKey) {
    const server = this.mcpServers[serverKey];
    return server ? server.metrics : null;
  }

  /**
   * Update server metrics (called by MCP servers)
   * @param {string} serverKey - Key identifying the server
   * @param {Object} metrics - Updated metrics
   */
  updateServerMetrics(serverKey, metrics) {
    const server = this.mcpServers[serverKey];
    if (server) {
      Object.assign(server.metrics, metrics);
      piiSafeLogger.info(`Metrics updated for ${serverKey}`, metrics);
    }
  }

  /**
   * Generate health report for all servers
   */
  async generateHealthReport() {
    const ecosystemHealth = await this.getMCPEcosystemHealth();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        overallHealth: ecosystemHealth.overallHealth,
        healthyServers: `${ecosystemHealth.healthyServers}/${ecosystemHealth.totalServers}`,
        averageLatency: `${Math.round(ecosystemHealth.averageLatency)}ms`
      },
      servers: {}
    };

    // Add detailed server information
    for (const [serverKey, server] of Object.entries(this.mcpServers)) {
      report.servers[serverKey] = {
        name: server.name,
        type: server.type,
        port: server.port,
        metrics: server.metrics,
        status: server.metrics.health > 0 ? 'healthy' : 'unhealthy'
      };
    }

    piiSafeLogger.info('Health Report Generated', { report });
    return report;
  }
}

// Singleton instance
export const mcpHealthManager = new MCPHealthManager();

export default MCPHealthManager;
