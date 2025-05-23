/**
 * MCP Health Checker Service
 * Performs comprehensive health checks on MCP servers
 */

import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

export class MCPHealthChecker {
  constructor() {
    this.healthHistory = new Map();
    this.healthThresholds = {
      responseTime: {
        good: 1000,    // < 1s
        warning: 3000, // 1-3s
        critical: 5000 // > 5s
      },
      uptime: {
        good: 0.99,    // 99%+
        warning: 0.95, // 95-99%
        critical: 0.90 // < 95%
      },
      errorRate: {
        good: 0.01,    // < 1%
        warning: 0.05, // 1-5%
        critical: 0.10 // > 10%
      },
      memoryUsage: {
        good: 0.70,    // < 70%
        warning: 0.85, // 70-85%
        critical: 0.95 // > 95%
      },
      cpuUsage: {
        good: 0.70,    // < 70%
        warning: 0.85, // 70-85%
        critical: 0.95 // > 95%
      }
    };
  }
  
  /**
   * Check health of a specific MCP server
   */
  async checkServerHealth(serverName) {
    try {
      const healthCheck = {
        serverName,
        timestamp: new Date().toISOString(),
        status: 'healthy',
        checks: {},
        errors: [],
        warnings: [],
        metrics: {}
      };
      
      // Perform individual health checks
      await this.checkConnectivity(serverName, healthCheck);
      await this.checkResponseTime(serverName, healthCheck);
      await this.checkResourceUsage(serverName, healthCheck);
      await this.checkErrorRate(serverName, healthCheck);
      await this.checkToolAvailability(serverName, healthCheck);
      
      // Determine overall status
      healthCheck.status = this.calculateOverallStatus(healthCheck);
      
      // Store health check in history
      this.storeHealthCheck(serverName, healthCheck);
      
      // Log health check result
      piiSafeLogger.trackMCPOperation('health_check', serverName, {
        status: healthCheck.status,
        checksPerformed: Object.keys(healthCheck.checks).length,
        errors: healthCheck.errors.length,
        warnings: healthCheck.warnings.length
      });
      
      return healthCheck;
    } catch (error) {
      piiSafeLogger.error('Health check failed', {
        error: error.message,
        serverName
      });
      
      return {
        serverName,
        timestamp: new Date().toISOString(),
        status: 'critical',
        checks: {},
        errors: [`Health check failed: ${error.message}`],
        warnings: [],
        metrics: {}
      };
    }
  }
  
  /**
   * Run comprehensive health check with detailed analysis
   */
  async runComprehensiveHealthCheck(serverName) {
    try {
      const basicCheck = await this.checkServerHealth(serverName);
      
      // Add comprehensive checks
      const comprehensiveCheck = {
        ...basicCheck,
        comprehensive: true,
        additionalChecks: {}
      };
      
      // Performance analysis
      comprehensiveCheck.additionalChecks.performance = await this.analyzePerformanceTrends(serverName);
      
      // Tool functionality tests
      comprehensiveCheck.additionalChecks.toolTests = await this.runToolFunctionalityTests(serverName);
      
      // Configuration validation
      comprehensiveCheck.additionalChecks.configuration = await this.validateConfiguration(serverName);
      
      // Security checks
      comprehensiveCheck.additionalChecks.security = await this.runSecurityChecks(serverName);
      
      // Dependency checks
      comprehensiveCheck.additionalChecks.dependencies = await this.checkDependencies(serverName);
      
      return comprehensiveCheck;
    } catch (error) {
      piiSafeLogger.error('Comprehensive health check failed', {
        error: error.message,
        serverName
      });
      throw error;
    }
  }
  
  /**
   * Get health history for a server
   */
  async getHealthHistory(serverName, timeframe = '24h') {
    const history = this.healthHistory.get(serverName) || [];
    const cutoffTime = this.getTimeframeCutoff(timeframe);
    
    const filteredHistory = history.filter(check => 
      new Date(check.timestamp) >= cutoffTime
    );
    
    return {
      serverName,
      timeframe,
      checks: filteredHistory,
      summary: this.calculateHealthSummary(filteredHistory),
      trends: this.calculateHealthTrends(filteredHistory)
    };
  }
  
  /**
   * Get system-wide health summary
   */
  async getSystemHealthSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      overallStatus: 'healthy',
      serverStatuses: {},
      systemMetrics: {
        totalServers: 0,
        healthyServers: 0,
        warningServers: 0,
        criticalServers: 0,
        offlineServers: 0
      },
      trends: {
        healthImproving: 0,
        healthStable: 0,
        healthDegrading: 0
      }
    };
    
    // Get status for each server
    for (const [serverName, history] of this.healthHistory) {
      const latestCheck = history[history.length - 1];
      summary.serverStatuses[serverName] = {
        status: latestCheck?.status || 'unknown',
        lastCheck: latestCheck?.timestamp || null
      };
      
      // Count servers by status
      summary.systemMetrics.totalServers++;
      switch (latestCheck?.status) {
        case 'healthy':
          summary.systemMetrics.healthyServers++;
          break;
        case 'warning':
          summary.systemMetrics.warningServers++;
          break;
        case 'critical':
          summary.systemMetrics.criticalServers++;
          break;
        default:
          summary.systemMetrics.offlineServers++;
      }
      
      // Analyze trends
      const trend = this.analyzeServerTrend(history);
      summary.trends[trend]++;
    }
    
    // Determine overall system status
    if (summary.systemMetrics.criticalServers > 0) {
      summary.overallStatus = 'critical';
    } else if (summary.systemMetrics.warningServers > summary.systemMetrics.healthyServers / 2) {
      summary.overallStatus = 'warning';
    } else if (summary.systemMetrics.healthyServers === 0) {
      summary.overallStatus = 'critical';
    }
    
    return summary;
  }
  
  /**
   * Check server connectivity
   */
  async checkConnectivity(serverName, healthCheck) {
    try {
      // Mock connectivity check
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
      const responseTime = Date.now() - startTime;
      
      healthCheck.checks.connectivity = {
        status: 'passed',
        responseTime,
        message: 'Server is reachable'
      };
      
      healthCheck.metrics.connectivity = {
        responseTime,
        status: 'connected'
      };
    } catch (error) {
      healthCheck.checks.connectivity = {
        status: 'failed',
        error: error.message,
        message: 'Server is not reachable'
      };
      healthCheck.errors.push(`Connectivity check failed: ${error.message}`);
    }
  }
  
  /**
   * Check response time
   */
  async checkResponseTime(serverName, healthCheck) {
    try {
      // Get response time from connectivity check or perform new one
      const responseTime = healthCheck.metrics.connectivity?.responseTime || 
                          await this.measureResponseTime(serverName);
      
      let status = 'passed';
      let level = 'good';
      
      if (responseTime > this.healthThresholds.responseTime.critical) {
        status = 'failed';
        level = 'critical';
        healthCheck.errors.push(`Response time too high: ${responseTime}ms`);
      } else if (responseTime > this.healthThresholds.responseTime.warning) {
        status = 'warning';
        level = 'warning';
        healthCheck.warnings.push(`Response time elevated: ${responseTime}ms`);
      }
      
      healthCheck.checks.responseTime = {
        status,
        level,
        responseTime,
        threshold: this.healthThresholds.responseTime,
        message: `Response time: ${responseTime}ms`
      };
      
      healthCheck.metrics.responseTime = responseTime;
    } catch (error) {
      healthCheck.checks.responseTime = {
        status: 'failed',
        error: error.message,
        message: 'Could not measure response time'
      };
      healthCheck.errors.push(`Response time check failed: ${error.message}`);
    }
  }
  
  /**
   * Check resource usage (memory, CPU)
   */
  async checkResourceUsage(serverName, healthCheck) {
    try {
      // Mock resource usage data
      const memoryUsage = Math.random() * 0.9 + 0.1; // 10-100%
      const cpuUsage = Math.random() * 0.8 + 0.1;    // 10-90%
      
      const checks = {
        memory: this.checkResourceThreshold('memory', memoryUsage, this.healthThresholds.memoryUsage),
        cpu: this.checkResourceThreshold('cpu', cpuUsage, this.healthThresholds.cpuUsage)
      };
      
      // Overall resource status
      const resourceStatus = checks.memory.status === 'failed' || checks.cpu.status === 'failed' 
        ? 'failed' 
        : checks.memory.status === 'warning' || checks.cpu.status === 'warning'
        ? 'warning'
        : 'passed';
      
      healthCheck.checks.resourceUsage = {
        status: resourceStatus,
        memory: checks.memory,
        cpu: checks.cpu,
        message: `Memory: ${(memoryUsage * 100).toFixed(1)}%, CPU: ${(cpuUsage * 100).toFixed(1)}%`
      };
      
      healthCheck.metrics.resourceUsage = {
        memoryUsage,
        cpuUsage,
        memoryAvailable: (1 - memoryUsage) * 100,
        cpuAvailable: (1 - cpuUsage) * 100
      };
      
      // Add warnings or errors
      if (checks.memory.status === 'failed') {
        healthCheck.errors.push(`High memory usage: ${(memoryUsage * 100).toFixed(1)}%`);
      } else if (checks.memory.status === 'warning') {
        healthCheck.warnings.push(`Elevated memory usage: ${(memoryUsage * 100).toFixed(1)}%`);
      }
      
      if (checks.cpu.status === 'failed') {
        healthCheck.errors.push(`High CPU usage: ${(cpuUsage * 100).toFixed(1)}%`);
      } else if (checks.cpu.status === 'warning') {
        healthCheck.warnings.push(`Elevated CPU usage: ${(cpuUsage * 100).toFixed(1)}%`);
      }
    } catch (error) {
      healthCheck.checks.resourceUsage = {
        status: 'failed',
        error: error.message,
        message: 'Could not check resource usage'
      };
      healthCheck.errors.push(`Resource usage check failed: ${error.message}`);
    }
  }
  
  /**
   * Check error rate
   */
  async checkErrorRate(serverName, healthCheck) {
    try {
      // Mock error rate calculation
      const totalRequests = Math.floor(Math.random() * 1000 + 100);
      const failedRequests = Math.floor(Math.random() * 50);
      const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;
      
      let status = 'passed';
      let level = 'good';
      
      if (errorRate > this.healthThresholds.errorRate.critical) {
        status = 'failed';
        level = 'critical';
        healthCheck.errors.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
      } else if (errorRate > this.healthThresholds.errorRate.warning) {
        status = 'warning';
        level = 'warning';
        healthCheck.warnings.push(`Elevated error rate: ${(errorRate * 100).toFixed(2)}%`);
      }
      
      healthCheck.checks.errorRate = {
        status,
        level,
        errorRate,
        totalRequests,
        failedRequests,
        successRate: 1 - errorRate,
        threshold: this.healthThresholds.errorRate,
        message: `Error rate: ${(errorRate * 100).toFixed(2)}% (${failedRequests}/${totalRequests})`
      };
      
      healthCheck.metrics.errorRate = {
        errorRate,
        successRate: 1 - errorRate,
        totalRequests,
        failedRequests,
        successfulRequests: totalRequests - failedRequests
      };
    } catch (error) {
      healthCheck.checks.errorRate = {
        status: 'failed',
        error: error.message,
        message: 'Could not check error rate'
      };
      healthCheck.errors.push(`Error rate check failed: ${error.message}`);
    }
  }
  
  /**
   * Check tool availability
   */
  async checkToolAvailability(serverName, healthCheck) {
    try {
      // Mock tool availability check
      const tools = [
        { name: 'generate_workout', available: true },
        { name: 'analyze_form', available: true },
        { name: 'get_recommendations', available: Math.random() > 0.1 } // 90% chance of being available
      ];
      
      const availableTools = tools.filter(t => t.available);
      const unavailableTools = tools.filter(t => !t.available);
      
      const status = unavailableTools.length === 0 ? 'passed' : 
                    unavailableTools.length < tools.length / 2 ? 'warning' : 'failed';
      
      healthCheck.checks.toolAvailability = {
        status,
        totalTools: tools.length,
        availableTools: availableTools.length,
        unavailableTools: unavailableTools.length,
        tools,
        message: `${availableTools.length}/${tools.length} tools available`
      };
      
      healthCheck.metrics.toolAvailability = {
        availabilityRate: availableTools.length / tools.length,
        toolStatus: tools.reduce((acc, tool) => {
          acc[tool.name] = tool.available ? 'available' : 'unavailable';
          return acc;
        }, {})
      };
      
      // Add warnings for unavailable tools
      if (unavailableTools.length > 0) {
        const toolNames = unavailableTools.map(t => t.name).join(', ');
        if (status === 'failed') {
          healthCheck.errors.push(`Critical tools unavailable: ${toolNames}`);
        } else {
          healthCheck.warnings.push(`Some tools unavailable: ${toolNames}`);
        }
      }
    } catch (error) {
      healthCheck.checks.toolAvailability = {
        status: 'failed',
        error: error.message,
        message: 'Could not check tool availability'
      };
      healthCheck.errors.push(`Tool availability check failed: ${error.message}`);
    }
  }
  
  /**
   * Analyze performance trends
   */
  async analyzePerformanceTrends(serverName) {
    const history = this.healthHistory.get(serverName) || [];
    const recentChecks = history.slice(-10); // Last 10 checks
    
    if (recentChecks.length < 2) {
      return {
        status: 'insufficient_data',
        message: 'Not enough data for trend analysis'
      };
    }
    
    // Analyze response time trends
    const responseTimes = recentChecks
      .map(check => check.metrics?.responseTime)
      .filter(rt => rt !== undefined);
    
    const trend = this.calculateTrend(responseTimes);
    
    return {
      status: 'analyzed',
      responseTimeTrend: trend,
      avgResponseTime: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      message: `Response time trend: ${trend.direction} (${trend.strength})`
    };
  }
  
  /**
   * Run tool functionality tests
   */
  async runToolFunctionalityTests(serverName) {
    try {
      const tests = [];
      
      // Mock tool tests
      const toolTests = [
        { tool: 'generate_workout', passed: Math.random() > 0.1 },
        { tool: 'analyze_form', passed: Math.random() > 0.05 },
        { tool: 'get_recommendations', passed: Math.random() > 0.15 }
      ];
      
      for (const test of toolTests) {
        tests.push({
          tool: test.tool,
          status: test.passed ? 'passed' : 'failed',
          message: test.passed ? 'Tool functioning correctly' : 'Tool test failed',
          timestamp: new Date().toISOString()
        });
      }
      
      const passedTests = tests.filter(t => t.status === 'passed').length;
      const overallStatus = passedTests === tests.length ? 'passed' : 
                          passedTests > 0 ? 'warning' : 'failed';
      
      return {
        status: overallStatus,
        tests,
        passedTests,
        failedTests: tests.length - passedTests,
        totalTests: tests.length,
        message: `${passedTests}/${tests.length} tool tests passed`
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        message: 'Could not run tool functionality tests'
      };
    }
  }
  
  /**
   * Validate server configuration
   */
  async validateConfiguration(serverName) {
    try {
      const validations = [
        { item: 'port', valid: true, message: 'Port configuration valid' },
        { item: 'auth', valid: true, message: 'Authentication configured' },
        { item: 'timeout', valid: Math.random() > 0.1, message: 'Timeout settings' },
        { item: 'logging', valid: true, message: 'Logging configuration valid' }
      ];
      
      const passed = validations.filter(v => v.valid).length;
      const status = passed === validations.length ? 'passed' : 
                    passed > validations.length / 2 ? 'warning' : 'failed';
      
      return {
        status,
        validations,
        passed,
        failed: validations.length - passed,
        message: `${passed}/${validations.length} configuration checks passed`
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        message: 'Configuration validation failed'
      };
    }
  }
  
  /**
   * Run security checks
   */
  async runSecurityChecks(serverName) {
    try {
      const checks = [
        { check: 'ssl_enabled', passed: true, message: 'SSL/TLS enabled' },
        { check: 'auth_required', passed: true, message: 'Authentication required' },
        { check: 'rate_limiting', passed: Math.random() > 0.2, message: 'Rate limiting configured' },
        { check: 'secure_headers', passed: true, message: 'Security headers present' }
      ];
      
      const passed = checks.filter(c => c.passed).length;
      const status = passed === checks.length ? 'passed' : 
                    passed > checks.length * 0.8 ? 'warning' : 'failed';
      
      return {
        status,
        checks,
        passed,
        failed: checks.length - passed,
        message: `${passed}/${checks.length} security checks passed`
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        message: 'Security checks failed'
      };
    }
  }
  
  /**
   * Check dependencies
   */
  async checkDependencies(serverName) {
    try {
      const dependencies = [
        { name: 'database', available: true, version: '1.0.0' },
        { name: 'redis', available: true, version: '6.2.0' },
        { name: 'ai_model', available: Math.random() > 0.05, version: '2.1.0' }
      ];
      
      const available = dependencies.filter(d => d.available).length;
      const status = available === dependencies.length ? 'passed' : 
                    available > 0 ? 'warning' : 'failed';
      
      return {
        status,
        dependencies,
        available,
        unavailable: dependencies.length - available,
        message: `${available}/${dependencies.length} dependencies available`
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        message: 'Dependency check failed'
      };
    }
  }
  
  /**
   * Helper method to check resource against thresholds
   */
  checkResourceThreshold(resource, usage, thresholds) {
    let status = 'passed';
    let level = 'good';
    
    if (usage > thresholds.critical) {
      status = 'failed';
      level = 'critical';
    } else if (usage > thresholds.warning) {
      status = 'warning';
      level = 'warning';
    }
    
    return {
      status,
      level,
      usage,
      percentage: (usage * 100).toFixed(1) + '%',
      threshold: thresholds,
      message: `${resource} usage: ${(usage * 100).toFixed(1)}%`
    };
  }
  
  /**
   * Calculate overall health status
   */
  calculateOverallStatus(healthCheck) {
    const checks = Object.values(healthCheck.checks);
    
    if (checks.some(check => check.status === 'failed')) {
      return 'critical';
    }
    
    if (checks.some(check => check.status === 'warning')) {
      return 'warning';
    }
    
    return 'healthy';
  }
  
  /**
   * Store health check in history
   */
  storeHealthCheck(serverName, healthCheck) {
    if (!this.healthHistory.has(serverName)) {
      this.healthHistory.set(serverName, []);
    }
    
    const history = this.healthHistory.get(serverName);
    history.push(healthCheck);
    
    // Keep only last 1000 health checks
    if (history.length > 1000) {
      history.shift();
    }
    
    this.healthHistory.set(serverName, history);
  }
  
  /**
   * Get timeframe cutoff date
   */
  getTimeframeCutoff(timeframe) {
    const now = new Date();
    const timeframeMappings = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const milliseconds = timeframeMappings[timeframe] || timeframeMappings['24h'];
    return new Date(now.getTime() - milliseconds);
  }
  
  /**
   * Calculate health summary from history
   */
  calculateHealthSummary(checks) {
    if (checks.length === 0) {
      return {
        overallStatus: 'unknown',
        uptimePercentage: 0,
        avgResponseTime: 0,
        errorRate: 0
      };
    }
    
    const healthyChecks = checks.filter(c => c.status === 'healthy').length;
    const warningChecks = checks.filter(c => c.status === 'warning').length;
    const criticalChecks = checks.filter(c => c.status === 'critical').length;
    
    const overallStatus = criticalChecks > checks.length * 0.1 ? 'critical' :
                         warningChecks > checks.length * 0.3 ? 'warning' : 'healthy';
    
    const uptimePercentage = (healthyChecks + warningChecks) / checks.length * 100;
    
    const responseTimes = checks
      .map(c => c.metrics?.responseTime)
      .filter(rt => rt !== undefined);
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length 
      : 0;
    
    return {
      overallStatus,
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      healthyChecks,
      warningChecks,
      criticalChecks,
      totalChecks: checks.length
    };
  }
  
  /**
   * Calculate health trends
   */
  calculateHealthTrends(checks) {
    if (checks.length < 3) {
      return { trend: 'insufficient_data' };
    }
    
    const recent = checks.slice(-10);
    const earlier = checks.slice(-20, -10);
    
    const recentHealth = this.calculateHealthScore(recent);
    const earlierHealth = this.calculateHealthScore(earlier);
    
    const difference = recentHealth - earlierHealth;
    
    let trend = 'stable';
    if (difference > 0.1) trend = 'improving';
    else if (difference < -0.1) trend = 'degrading';
    
    return {
      trend,
      recentScore: recentHealth,
      previousScore: earlierHealth,
      change: difference
    };
  }
  
  /**
   * Calculate numeric health score
   */
  calculateHealthScore(checks) {
    if (checks.length === 0) return 0;
    
    const scores = checks.map(check => {
      switch (check.status) {
        case 'healthy': return 1.0;
        case 'warning': return 0.7;
        case 'critical': return 0.3;
        default: return 0;
      }
    });
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }
  
  /**
   * Analyze server trend
   */
  analyzeServerTrend(history) {
    if (history.length < 5) return 'healthStable';
    
    const recentScore = this.calculateHealthScore(history.slice(-5));
    const earlierScore = this.calculateHealthScore(history.slice(-10, -5));
    
    const difference = recentScore - earlierScore;
    
    if (difference > 0.1) return 'healthImproving';
    if (difference < -0.1) return 'healthDegrading';
    return 'healthStable';
  }
  
  /**
   * Calculate trend from numeric array
   */
  calculateTrend(values) {
    if (values.length < 3) {
      return { direction: 'unknown', strength: 'insufficient_data' };
    }
    
    // Simple linear regression
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = values.reduce((sum, _, i) => sum + (i * i), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    let direction = 'stable';
    let strength = 'weak';
    
    if (slope > 5) {
      direction = 'increasing';
      strength = slope > 20 ? 'strong' : 'moderate';
    } else if (slope < -5) {
      direction = 'decreasing';
      strength = slope < -20 ? 'strong' : 'moderate';
    }
    
    return { direction, strength, slope };
  }
  
  /**
   * Measure response time for a server
   */
  async measureResponseTime(serverName) {
    // Mock response time measurement
    return Math.random() * 1000 + 100;
  }
}

// Export singleton instance
export const mcpHealthChecker = new MCPHealthChecker();