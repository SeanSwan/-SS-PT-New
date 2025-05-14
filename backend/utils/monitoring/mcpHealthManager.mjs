import axios from 'axios';
import { piiSafeLogger } from './piiSafeLogging.mjs';

/**
 * P0: Individual MCP Server Health Monitoring
 * Comprehensive health management for all MCP servers
 * Aligned with Master Prompt v26 MCP-Centric Architecture
 */

class MCPHealthManager {
  constructor() {
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

    // Health check intervals
    this.healthCheckInterval = 30000; // 30 seconds
    this.alertThresholds = {
      maxLatency: 5000, // 5 seconds
      minHealthScore: 50,
      maxErrorRate: 10 // 10%
    };

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Check health of all MCP servers
   */
  async checkAllMCPHealth() {
    const healthResults = {};

    for (const [serverKey, serverConfig] of Object.entries(this.mcpServers)) {
      try {
        const healthResult = await this.checkSingleMCPHealth(serverKey);
        healthResults[serverKey] = healthResult;
      } catch (error) {
        piiSafeLogger.error(`Health check failed for ${serverKey}`, { error: error.message });
        healthResults[serverKey] = {
          healthy: false,
          error: error.message,
          timestamp: Date.now()
        };
      }
    }

    // Log overall health status
    piiSafeLogger.trackMCPOperation('health_check', 'all_servers', {
      results: healthResults,
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
      piiSafeLogger.trackMCPOperation(serverKey, 'health_check_success', {
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
    piiSafeLogger.trackMCPOperation(serverKey, 'server_failure', alertData);

    // Here you could integrate with alerting systems like:
    // - Email notifications
    // - Slack webhooks
    // - PagerDuty
    // - Discord notifications
    // For now, we'll use console output for immediate visibility
    console.error(`🚨 CRITICAL: ${server.name} is DOWN`);
    console.error(`Port: ${server.port}, Error: ${error.message || error}`);
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
    setInterval(async () => {
      try {
        await this.checkAllMCPHealth();
      } catch (error) {
        piiSafeLogger.error('Monitoring cycle failed', { error: error.message });
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
      piiSafeLogger.trackMCPOperation(serverKey, 'metrics_updated', metrics);
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
