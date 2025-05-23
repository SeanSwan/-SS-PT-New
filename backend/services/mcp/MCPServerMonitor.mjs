/**
 * MCP Server Monitor Service
 * Monitors and manages individual MCP servers
 */

import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

export class MCPServerMonitor {
  constructor() {
    this.servers = new Map();
    this.healthChecks = new Map();
    this.alertThresholds = {
      responseTime: 5000, // 5 seconds
      errorRate: 0.1, // 10%
      memoryUsage: 0.8, // 80%
      cpuUsage: 0.9 // 90%
    };
    
    // Start periodic health checks
    this.startHealthCheckInterval();
  }
  
  /**
   * Register a new MCP server
   */
  async registerServer(name, config, autoStart = true) {
    try {
      const serverInfo = {
        name,
        config,
        status: 'registered',
        registeredAt: new Date().toISOString(),
        lastHealthCheck: null,
        tools: [],
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          avgResponseTime: 0,
          lastResponseTime: null
        },
        health: {
          status: 'unknown',
          uptime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          errors: []
        }
      };
      
      this.servers.set(name, serverInfo);
      
      if (autoStart) {
        await this.startServer(name);
      }
      
      piiSafeLogger.trackMCPOperation('server_registered', name, {
        config: config.type || 'unknown',
        autoStart
      });
      
      return {
        success: true,
        message: `MCP server ${name} registered successfully`,
        serverInfo
      };
    } catch (error) {
      piiSafeLogger.error('Failed to register MCP server', {
        error: error.message,
        serverName: name
      });
      throw error;
    }
  }
  
  /**
   * Start a registered MCP server
   */
  async startServer(name) {
    try {
      const server = this.servers.get(name);
      if (!server) {
        throw new Error(`Server ${name} not found`);
      }
      
      // Mock server startup logic
      server.status = 'starting';
      server.startedAt = new Date().toISOString();
      
      // Simulate startup delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      server.status = 'running';
      server.health.status = 'healthy';
      
      this.servers.set(name, server);
      
      piiSafeLogger.trackMCPOperation('server_started', name, {
        status: 'success'
      });
      
      return {
        success: true,
        message: `MCP server ${name} started successfully`,
        status: server.status
      };
    } catch (error) {
      piiSafeLogger.error('Failed to start MCP server', {
        error: error.message,
        serverName: name
      });
      throw error;
    }
  }
  
  /**
   * Stop a running MCP server
   */
  async stopServer(name, graceful = true) {
    try {
      const server = this.servers.get(name);
      if (!server) {
        throw new Error(`Server ${name} not found`);
      }
      
      server.status = 'stopping';
      
      if (graceful) {
        // Allow time for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      server.status = 'stopped';
      server.stoppedAt = new Date().toISOString();
      server.health.status = 'stopped';
      
      this.servers.set(name, server);
      
      piiSafeLogger.trackMCPOperation('server_stopped', name, {
        graceful,
        status: 'success'
      });
      
      return {
        success: true,
        message: `MCP server ${name} stopped successfully`,
        graceful
      };
    } catch (error) {
      piiSafeLogger.error('Failed to stop MCP server', {
        error: error.message,
        serverName: name
      });
      throw error;
    }
  }
  
  /**
   * Restart a MCP server
   */
  async restartServer(name, force = false) {
    try {
      const server = this.servers.get(name);
      if (!server) {
        throw new Error(`Server ${name} not found`);
      }
      
      // Stop the server
      await this.stopServer(name, !force);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Start the server
      await this.startServer(name);
      
      piiSafeLogger.trackMCPOperation('server_restarted', name, {
        force,
        status: 'success'
      });
      
      return {
        success: true,
        message: `MCP server ${name} restarted successfully`,
        force
      };
    } catch (error) {
      piiSafeLogger.error('Failed to restart MCP server', {
        error: error.message,
        serverName: name
      });
      throw error;
    }
  }
  
  /**
   * Unregister a MCP server
   */
  async unregisterServer(name, gracefulShutdown = true) {
    try {
      const server = this.servers.get(name);
      if (!server) {
        throw new Error(`Server ${name} not found`);
      }
      
      // Stop the server if it's running
      if (server.status === 'running') {
        await this.stopServer(name, gracefulShutdown);
      }
      
      // Remove from registered servers
      this.servers.delete(name);
      this.healthChecks.delete(name);
      
      piiSafeLogger.trackMCPOperation('server_unregistered', name, {
        gracefulShutdown,
        status: 'success'
      });
      
      return {
        success: true,
        message: `MCP server ${name} unregistered successfully`,
        gracefulShutdown
      };
    } catch (error) {
      piiSafeLogger.error('Failed to unregister MCP server', {
        error: error.message,
        serverName: name
      });
      throw error;
    }
  }
  
  /**
   * Get all registered servers
   */
  async getAllServers() {
    return Array.from(this.servers.values());
  }
  
  /**
   * Get detailed information about a specific server
   */
  async getServerDetails(name) {
    const server = this.servers.get(name);
    if (!server) {
      return null;
    }
    
    // Add real-time metrics
    const currentMetrics = await this.getCurrentMetrics(name);
    
    return {
      ...server,
      currentMetrics,
      lastChecked: new Date().toISOString()
    };
  }
  
  /**
   * Get tools available on a specific server
   */
  async getServerTools(name) {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`Server ${name} not found`);
    }
    
    // Mock tool discovery
    const mockTools = [
      {
        name: 'generate_workout',
        description: 'Generate personalized workout plan',
        category: 'fitness',
        parameters: ['userProfile', 'preferences', 'constraints']
      },
      {
        name: 'analyze_form',
        description: 'Analyze exercise form from video',
        category: 'analysis',
        parameters: ['videoData', 'exerciseType']
      }
    ];
    
    return {
      serverName: name,
      tools: mockTools,
      totalTools: mockTools.length,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Get all available tools across servers
   */
  async getAllAvailableTools(filters = {}) {
    const allTools = [];
    
    for (const [serverName, server] of this.servers) {
      if (server.status === 'running') {
        const serverTools = await this.getServerTools(serverName);
        
        for (const tool of serverTools.tools) {
          const toolWithServer = {
            ...tool,
            server: serverName,
            serverStatus: server.status
          };
          
          // Apply filters
          if (filters.category && tool.category !== filters.category) {
            continue;
          }
          if (filters.server && serverName !== filters.server) {
            continue;
          }
          
          allTools.push(toolWithServer);
        }
      }
    }
    
    return allTools;
  }
  
  /**
   * Invoke a tool on a specific MCP server
   */
  async invokeTool(serverName, toolName, args = {}) {
    try {
      const server = this.servers.get(serverName);
      if (!server) {
        throw new Error(`Server ${serverName} not found`);
      }
      
      if (server.status !== 'running') {
        throw new Error(`Server ${serverName} is not running (status: ${server.status})`);
      }
      
      const startTime = Date.now();
      
      // Mock tool invocation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      const responseTime = Date.now() - startTime;
      
      // Update metrics
      server.metrics.totalRequests++;
      server.metrics.successfulRequests++;
      server.metrics.lastResponseTime = responseTime;
      server.metrics.avgResponseTime = (
        (server.metrics.avgResponseTime * (server.metrics.totalRequests - 1)) + responseTime
      ) / server.metrics.totalRequests;
      
      this.servers.set(serverName, server);
      
      // Mock successful response
      const mockResponse = {
        success: true,
        tool: toolName,
        result: {
          message: `Tool ${toolName} executed successfully`,
          data: { processed: true, args },
          executionTime: responseTime
        },
        timestamp: new Date().toISOString()
      };
      
      piiSafeLogger.trackMCPOperation('tool_invoked', serverName, {
        tool: toolName,
        responseTime,
        success: true
      });
      
      return mockResponse;
    } catch (error) {
      // Update error metrics
      const server = this.servers.get(serverName);
      if (server) {
        server.metrics.totalRequests++;
        server.metrics.failedRequests++;
        this.servers.set(serverName, server);
      }
      
      piiSafeLogger.error('Tool invocation failed', {
        error: error.message,
        serverName,
        toolName
      });
      
      throw error;
    }
  }
  
  /**
   * Get system overview
   */
  async getSystemOverview() {
    const servers = Array.from(this.servers.values());
    
    const overview = {
      totalServers: servers.length,
      runningServers: servers.filter(s => s.status === 'running').length,
      stoppedServers: servers.filter(s => s.status === 'stopped').length,
      healthyServers: servers.filter(s => s.health.status === 'healthy').length,
      serversWithIssues: servers.filter(s => s.health.status === 'warning' || s.health.status === 'critical').length,
      totalRequests: servers.reduce((sum, s) => sum + s.metrics.totalRequests, 0),
      totalErrors: servers.reduce((sum, s) => sum + s.metrics.failedRequests, 0),
      avgResponseTime: this.calculateSystemAvgResponseTime(servers),
      lastUpdated: new Date().toISOString()
    };
    
    return overview;
  }
  
  /**
   * Get active alerts
   */
  async getActiveAlerts() {
    const alerts = [];
    
    for (const [name, server] of this.servers) {
      // Check response time alerts
      if (server.metrics.lastResponseTime > this.alertThresholds.responseTime) {
        alerts.push({
          type: 'performance',
          severity: 'warning',
          server: name,
          message: `High response time: ${server.metrics.lastResponseTime}ms`,
          threshold: this.alertThresholds.responseTime,
          actual: server.metrics.lastResponseTime,
          timestamp: new Date().toISOString()
        });
      }
      
      // Check error rate alerts
      const errorRate = server.metrics.totalRequests > 0 
        ? server.metrics.failedRequests / server.metrics.totalRequests 
        : 0;
      
      if (errorRate > this.alertThresholds.errorRate) {
        alerts.push({
          type: 'reliability',
          severity: 'critical',
          server: name,
          message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
          threshold: this.alertThresholds.errorRate,
          actual: errorRate,
          timestamp: new Date().toISOString()
        });
      }
      
      // Check health status alerts
      if (server.health.status === 'critical') {
        alerts.push({
          type: 'health',
          severity: 'critical',
          server: name,
          message: `Server health critical`,
          details: server.health.errors,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return alerts;
  }
  
  /**
   * Start periodic health checks
   */
  startHealthCheckInterval() {
    // Run health checks every 30 seconds
    setInterval(async () => {
      for (const [name, server] of this.servers) {
        if (server.status === 'running') {
          try {
            await this.performHealthCheck(name);
          } catch (error) {
            piiSafeLogger.error('Health check failed', {
              error: error.message,
              serverName: name
            });
          }
        }
      }
    }, 30000);
  }
  
  /**
   * Perform health check on a server
   */
  async performHealthCheck(name) {
    try {
      const server = this.servers.get(name);
      if (!server) {
        return null;
      }
      
      // Mock health check
      const healthCheck = {
        timestamp: new Date().toISOString(),
        responseTime: Math.random() * 1000 + 100,
        status: 'healthy',
        uptime: Date.now() - Date.parse(server.startedAt || server.registeredAt),
        memoryUsage: Math.random() * 0.5 + 0.1,
        cpuUsage: Math.random() * 0.3 + 0.1,
        errors: []
      };
      
      // Randomly introduce some issues for testing
      if (Math.random() < 0.1) {
        healthCheck.status = 'warning';
        healthCheck.errors.push('High memory usage detected');
      }
      
      if (Math.random() < 0.05) {
        healthCheck.status = 'critical';
        healthCheck.errors.push('Connection timeout');
      }
      
      // Update server health
      server.health = healthCheck;
      server.lastHealthCheck = healthCheck.timestamp;
      this.servers.set(name, server);
      
      // Store health check history
      if (!this.healthChecks.has(name)) {
        this.healthChecks.set(name, []);
      }
      
      const history = this.healthChecks.get(name);
      history.push(healthCheck);
      
      // Keep only last 100 health checks
      if (history.length > 100) {
        history.shift();
      }
      
      this.healthChecks.set(name, history);
      
      return healthCheck;
    } catch (error) {
      piiSafeLogger.error('Health check failed', {
        error: error.message,
        serverName: name
      });
      throw error;
    }
  }
  
  /**
   * Get current metrics for a server
   */
  async getCurrentMetrics(name) {
    const server = this.servers.get(name);
    if (!server) {
      return null;
    }
    
    return {
      requests: {
        total: server.metrics.totalRequests,
        successful: server.metrics.successfulRequests,
        failed: server.metrics.failedRequests,
        successRate: server.metrics.totalRequests > 0 
          ? (server.metrics.successfulRequests / server.metrics.totalRequests * 100).toFixed(2) + '%'
          : '0%'
      },
      performance: {
        avgResponseTime: server.metrics.avgResponseTime,
        lastResponseTime: server.metrics.lastResponseTime
      },
      health: server.health,
      uptime: server.startedAt 
        ? Date.now() - Date.parse(server.startedAt)
        : 0
    };
  }
  
  /**
   * Calculate system average response time
   */
  calculateSystemAvgResponseTime(servers) {
    const runningServers = servers.filter(s => s.status === 'running' && s.metrics.avgResponseTime > 0);
    if (runningServers.length === 0) return 0;
    
    const totalResponseTime = runningServers.reduce((sum, s) => sum + s.metrics.avgResponseTime, 0);
    return Math.round(totalResponseTime / runningServers.length);
  }
}

// Export singleton instance
export const mcpServerMonitor = new MCPServerMonitor();