/**
 * MCP Metrics Collector Service
 * Collects and analyzes metrics from MCP servers
 */

import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

export class MCPMetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.costTracking = new Map();
    this.aggregatedMetrics = {
      system: {
        totalRequests: 0,
        totalErrors: 0,
        totalCost: 0,
        avgResponseTime: 0,
        lastUpdated: new Date().toISOString()
      },
      servers: new Map()
    };
    
    // Start metrics collection
    this.startMetricsCollection();
  }
  
  /**
   * Get recent metrics for a specific server
   */
  async getRecentMetrics(serverName, timeframe = '1h') {
    try {
      const serverMetrics = this.metrics.get(serverName) || [];
      const cutoffTime = this.getTimeframeCutoff(timeframe);
      
      const recentMetrics = serverMetrics.filter(metric => 
        new Date(metric.timestamp) >= cutoffTime
      );
      
      return {
        serverName,
        timeframe,
        metrics: recentMetrics,
        summary: this.calculateMetricsSummary(recentMetrics),
        trends: this.calculateMetricsTrends(recentMetrics)
      };
    } catch (error) {
      piiSafeLogger.error('Failed to get recent metrics', {
        error: error.message,
        serverName,
        timeframe
      });
      throw error;
    }
  }
  
  /**
   * Get detailed metrics for a specific server
   */
  async getDetailedMetrics(serverName, timeframe = '24h') {
    try {
      const recentMetrics = await this.getRecentMetrics(serverName, timeframe);
      
      // Add detailed analysis
      const detailedMetrics = {
        ...recentMetrics,
        performance: await this.analyzePerformanceMetrics(serverName, timeframe),
        reliability: await this.analyzeReliabilityMetrics(serverName, timeframe),
        cost: await this.analyzeCostMetrics(serverName, timeframe),
        usage: await this.analyzeUsagePatterns(serverName, timeframe),
        quality: await this.analyzeQualityMetrics(serverName, timeframe)
      };
      
      return detailedMetrics;
    } catch (error) {
      piiSafeLogger.error('Failed to get detailed metrics', {
        error: error.message,
        serverName,
        timeframe
      });
      throw error;
    }
  }
  
  /**
   * Get aggregated metrics across all servers
   */
  async getAggregatedMetrics(timeframe = '1h') {
    try {
      const cutoffTime = this.getTimeframeCutoff(timeframe);
      const aggregated = {
        timeframe,
        timestamp: new Date().toISOString(),
        overview: {
          totalServers: this.metrics.size,
          activeServers: 0,
          totalRequests: 0,
          totalErrors: 0,
          avgResponseTime: 0,
          totalCost: 0,
          systemAvailability: 0
        },
        byServer: {},
        trends: {},
        alerts: []
      };
      
      let totalResponseTime = 0;
      let totalRequestsWithResponseTime = 0;
      
      // Aggregate metrics from all servers
      for (const [serverName, serverMetrics] of this.metrics) {
        const recentMetrics = serverMetrics.filter(metric => 
          new Date(metric.timestamp) >= cutoffTime
        );
        
        if (recentMetrics.length > 0) {
          aggregated.overview.activeServers++;
          
          const serverSummary = this.calculateMetricsSummary(recentMetrics);
          aggregated.byServer[serverName] = serverSummary;
          
          aggregated.overview.totalRequests += serverSummary.totalRequests;
          aggregated.overview.totalErrors += serverSummary.totalErrors;
          aggregated.overview.totalCost += serverSummary.totalCost || 0;
          
          if (serverSummary.avgResponseTime && serverSummary.totalRequests > 0) {
            totalResponseTime += serverSummary.avgResponseTime * serverSummary.totalRequests;
            totalRequestsWithResponseTime += serverSummary.totalRequests;
          }
        }
      }
      
      // Calculate system averages
      if (totalRequestsWithResponseTime > 0) {
        aggregated.overview.avgResponseTime = totalResponseTime / totalRequestsWithResponseTime;
      }
      
      if (aggregated.overview.totalRequests > 0) {
        aggregated.overview.systemAvailability = 
          ((aggregated.overview.totalRequests - aggregated.overview.totalErrors) / 
           aggregated.overview.totalRequests) * 100;
      }
      
      // Calculate trends
      aggregated.trends = await this.calculateSystemTrends(timeframe);
      
      // Generate alerts
      aggregated.alerts = await this.generateMetricAlerts(aggregated);
      
      return aggregated;
    } catch (error) {
      piiSafeLogger.error('Failed to get aggregated metrics', {
        error: error.message,
        timeframe
      });
      throw error;
    }
  }
  
  /**
   * Analyze cost metrics
   */
  async getCostAnalysis(options = {}) {
    try {
      const { timeframe = '7d', includeBreakdown = true } = options;
      const cutoffTime = this.getTimeframeCutoff(timeframe);
      
      const costAnalysis = {
        timeframe,
        timestamp: new Date().toISOString(),
        total: {
          cost: 0,
          requests: 0,
          avgCostPerRequest: 0
        },
        byServer: {},
        byPeriod: {},
        trends: {},
        projections: {}
      };
      
      // Calculate costs by server
      for (const [serverName, costs] of this.costTracking) {
        const recentCosts = costs.filter(cost => 
          new Date(cost.timestamp) >= cutoffTime
        );
        
        if (recentCosts.length > 0) {
          const serverCostSummary = this.calculateCostSummary(recentCosts);
          costAnalysis.byServer[serverName] = serverCostSummary;
          
          costAnalysis.total.cost += serverCostSummary.totalCost;
          costAnalysis.total.requests += serverCostSummary.totalRequests;
        }
      }
      
      // Calculate average cost per request
      if (costAnalysis.total.requests > 0) {
        costAnalysis.total.avgCostPerRequest = 
          costAnalysis.total.cost / costAnalysis.total.requests;
      }
      
      // Include breakdown by time period if requested
      if (includeBreakdown) {
        costAnalysis.byPeriod = await this.calculateCostBreakdown(timeframe);
      }
      
      // Calculate cost trends
      costAnalysis.trends = await this.calculateCostTrends(timeframe);
      
      // Generate cost projections
      costAnalysis.projections = await this.generateCostProjections(costAnalysis);
      
      return costAnalysis;
    } catch (error) {
      piiSafeLogger.error('Failed to get cost analysis', {
        error: error.message,
        options
      });
      throw error;
    }
  }
  
  /**
   * Get system metrics summary
   */
  async getSystemMetricsSummary() {
    try {
      const summary = {
        timestamp: new Date().toISOString(),
        servers: {
          total: this.metrics.size,
          active: 0,
          healthy: 0,
          warning: 0,
          critical: 0
        },
        performance: {
          avgResponseTime: 0,
          totalRequests: 0,
          successRate: 0,
          throughput: 0
        },
        costs: {
          totalCost: 0,
          avgCostPerRequest: 0,
          costTrend: 'stable'
        },
        quality: {
          overallScore: 100,
          reliabilityScore: 100,
          performanceScore: 100
        }
      };
      
      // Calculate summary metrics
      let totalResponseTime = 0;
      let totalRequests = 0;
      let totalErrors = 0;
      let totalCost = 0;
      let serversWithResponseTime = 0;
      
      for (const [serverName, metrics] of this.metrics) {
        const recentMetrics = metrics.slice(-10); // Last 10 data points
        
        if (recentMetrics.length > 0) {
          summary.servers.active++;
          
          const serverSummary = this.calculateMetricsSummary(recentMetrics);
          totalRequests += serverSummary.totalRequests || 0;
          totalErrors += serverSummary.totalErrors || 0;
          
          if (serverSummary.avgResponseTime) {
            totalResponseTime += serverSummary.avgResponseTime;
            serversWithResponseTime++;
          }
          
          // Categorize server health based on metrics
          const healthScore = this.calculateServerHealthScore(serverSummary);
          if (healthScore >= 95) summary.servers.healthy++;
          else if (healthScore >= 80) summary.servers.warning++;
          else summary.servers.critical++;
        }
      }
      
      // Calculate system performance metrics
      if (serversWithResponseTime > 0) {
        summary.performance.avgResponseTime = totalResponseTime / serversWithResponseTime;
      }
      
      summary.performance.totalRequests = totalRequests;
      if (totalRequests > 0) {
        summary.performance.successRate = 
          ((totalRequests - totalErrors) / totalRequests) * 100;
      }
      
      // Calculate quality scores
      summary.quality.reliabilityScore = summary.performance.successRate;
      summary.quality.performanceScore = this.calculatePerformanceScore(
        summary.performance.avgResponseTime
      );
      summary.quality.overallScore = 
        (summary.quality.reliabilityScore + summary.quality.performanceScore) / 2;
      
      return summary;
    } catch (error) {
      piiSafeLogger.error('Failed to get system metrics summary', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get cost summary
   */
  async getCostSummary() {
    try {
      let totalCost = 0;
      let totalRequests = 0;
      
      for (const [serverName, costs] of this.costTracking) {
        const recentCosts = costs.slice(-100); // Last 100 cost entries
        const serverCostSummary = this.calculateCostSummary(recentCosts);
        totalCost += serverCostSummary.totalCost;
        totalRequests += serverCostSummary.totalRequests;
      }
      
      return {
        totalCost: Math.round(totalCost * 100) / 100,
        totalRequests,
        avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
        currency: 'USD',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      piiSafeLogger.error('Failed to get cost summary', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Record metrics for a server
   */
  async recordMetrics(serverName, metrics) {
    try {
      const metricEntry = {
        timestamp: new Date().toISOString(),
        ...metrics
      };
      
      if (!this.metrics.has(serverName)) {
        this.metrics.set(serverName, []);
      }
      
      const serverMetrics = this.metrics.get(serverName);
      serverMetrics.push(metricEntry);
      
      // Keep only last 1000 entries per server
      if (serverMetrics.length > 1000) {
        serverMetrics.shift();
      }
      
      this.metrics.set(serverName, serverMetrics);
      
      // Update aggregated metrics
      this.updateAggregatedMetrics();
      
      piiSafeLogger.trackMCPOperation('metrics_recorded', serverName, {
        metricsRecorded: Object.keys(metrics).length
      });
    } catch (error) {
      piiSafeLogger.error('Failed to record metrics', {
        error: error.message,
        serverName
      });
      throw error;
    }
  }
  
  /**
   * Record cost information for a server
   */
  async recordCost(serverName, costInfo) {
    try {
      const costEntry = {
        timestamp: new Date().toISOString(),
        ...costInfo
      };
      
      if (!this.costTracking.has(serverName)) {
        this.costTracking.set(serverName, []);
      }
      
      const serverCosts = this.costTracking.get(serverName);
      serverCosts.push(costEntry);
      
      // Keep only last 1000 cost entries per server
      if (serverCosts.length > 1000) {
        serverCosts.shift();
      }
      
      this.costTracking.set(serverName, serverCosts);
    } catch (error) {
      piiSafeLogger.error('Failed to record cost', {
        error: error.message,
        serverName
      });
      throw error;
    }
  }
  
  /**
   * Start automatic metrics collection
   */
  startMetricsCollection() {
    // Collect metrics every 60 seconds
    setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        piiSafeLogger.error('Failed to collect system metrics', {
          error: error.message
        });
      }
    }, 60000);
    
    // Update aggregated metrics every 5 minutes
    setInterval(async () => {
      try {
        this.updateAggregatedMetrics();
      } catch (error) {
        piiSafeLogger.error('Failed to update aggregated metrics', {
          error: error.message
        });
      }
    }, 300000);
  }
  
  /**
   * Collect system-wide metrics
   */
  async collectSystemMetrics() {
    // Mock system metrics collection
    const systemMetrics = {
      systemLoad: Math.random() * 0.8 + 0.1,
      memoryUsage: Math.random() * 0.6 + 0.2,
      diskUsage: Math.random() * 0.5 + 0.1,
      networkIO: Math.random() * 1000 + 100,
      activeConnections: Math.floor(Math.random() * 100 + 50),
      totalProcesses: Math.floor(Math.random() * 200 + 100)
    };
    
    await this.recordMetrics('system', systemMetrics);
  }
  
  /**
   * Update aggregated metrics
   */
  updateAggregatedMetrics() {
    const now = new Date().toISOString();
    
    // Update system-level aggregated metrics
    this.aggregatedMetrics.system.lastUpdated = now;
    
    // Calculate totals across all servers
    let totalRequests = 0;
    let totalErrors = 0;
    let totalCost = 0;
    let totalResponseTime = 0;
    let serversWithMetrics = 0;
    
    for (const [serverName, metrics] of this.metrics) {
      if (metrics.length > 0) {
        const latest = metrics[metrics.length - 1];
        const recentMetrics = metrics.slice(-10);
        const summary = this.calculateMetricsSummary(recentMetrics);
        
        totalRequests += summary.totalRequests || 0;
        totalErrors += summary.totalErrors || 0;
        
        if (summary.avgResponseTime) {
          totalResponseTime += summary.avgResponseTime;
          serversWithMetrics++;
        }
        
        this.aggregatedMetrics.servers.set(serverName, {
          lastMetric: latest,
          summary,
          lastUpdated: now
        });
      }
    }
    
    // Update aggregated totals
    this.aggregatedMetrics.system.totalRequests = totalRequests;
    this.aggregatedMetrics.system.totalErrors = totalErrors;
    this.aggregatedMetrics.system.totalCost = totalCost;
    this.aggregatedMetrics.system.avgResponseTime = 
      serversWithMetrics > 0 ? totalResponseTime / serversWithMetrics : 0;
  }
  
  /**
   * Calculate metrics summary
   */
  calculateMetricsSummary(metrics) {
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        totalErrors: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        successRate: 100,
        totalCost: 0,
        dataPoints: 0
      };
    }
    
    const responseTimes = metrics
      .map(m => m.responseTime)
      .filter(rt => rt !== undefined && rt !== null);
    
    const requests = metrics
      .map(m => m.requests || 1)
      .reduce((sum, r) => sum + r, 0);
    
    const errors = metrics
      .map(m => m.errors || 0)
      .reduce((sum, e) => sum + e, 0);
    
    const costs = metrics
      .map(m => m.cost || 0)
      .reduce((sum, c) => sum + c, 0);
    
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
      : 0;
    
    const successRate = requests > 0 ? ((requests - errors) / requests) * 100 : 100;
    
    return {
      totalRequests: requests,
      totalErrors: errors,
      avgResponseTime: Math.round(avgResponseTime),
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      successRate: Math.round(successRate * 100) / 100,
      totalCost: Math.round(costs * 100) / 100,
      dataPoints: metrics.length
    };
  }
  
  /**
   * Calculate metrics trends
   */
  calculateMetricsTrends(metrics) {
    if (metrics.length < 3) {
      return {
        responseTime: { trend: 'insufficient_data' },
        requests: { trend: 'insufficient_data' },
        errors: { trend: 'insufficient_data' }
      };
    }
    
    const responseTimes = metrics.map(m => m.responseTime).filter(rt => rt !== undefined);
    const requests = metrics.map(m => m.requests || 1);
    const errors = metrics.map(m => m.errors || 0);
    
    return {
      responseTime: this.calculateTrend(responseTimes),
      requests: this.calculateTrend(requests),
      errors: this.calculateTrend(errors),
      timespan: {
        start: metrics[0].timestamp,
        end: metrics[metrics.length - 1].timestamp,
        dataPoints: metrics.length
      }
    };
  }
  
  /**
   * Analyze performance metrics
   */
  async analyzePerformanceMetrics(serverName, timeframe) {
    const metrics = await this.getRecentMetrics(serverName, timeframe);
    
    if (metrics.metrics.length === 0) {
      return {
        status: 'no_data',
        message: 'No performance data available'
      };
    }
    
    const responseTimes = metrics.metrics.map(m => m.responseTime).filter(rt => rt !== undefined);
    
    const analysis = {
      responseTime: {
        avg: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
        p50: this.calculatePercentile(responseTimes, 50),
        p90: this.calculatePercentile(responseTimes, 90),
        p95: this.calculatePercentile(responseTimes, 95),
        p99: this.calculatePercentile(responseTimes, 99)
      },
      throughput: {
        avgRequestsPerMinute: this.calculateThroughput(metrics.metrics),
        peakRequestsPerMinute: this.calculatePeakThroughput(metrics.metrics),
        minRequestsPerMinute: this.calculateMinThroughput(metrics.metrics)
      },
      trends: metrics.trends,
      score: this.calculatePerformanceScore(responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length),
      recommendations: this.generatePerformanceRecommendations(responseTimes)
    };
    
    return analysis;
  }
  
  /**
   * Analyze reliability metrics
   */
  async analyzeReliabilityMetrics(serverName, timeframe) {
    const metrics = await this.getRecentMetrics(serverName, timeframe);
    
    if (metrics.metrics.length === 0) {
      return {
        status: 'no_data',
        message: 'No reliability data available'
      };
    }
    
    const totalRequests = metrics.metrics.reduce((sum, m) => sum + (m.requests || 1), 0);
    const totalErrors = metrics.metrics.reduce((sum, m) => sum + (m.errors || 0), 0);
    const successRate = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests) * 100 : 100;
    
    // Calculate uptime (percentage of time server was responding)
    const healthyChecks = metrics.metrics.filter(m => !m.errors || m.errors === 0).length;
    const uptime = (healthyChecks / metrics.metrics.length) * 100;
    
    return {
      successRate: Math.round(successRate * 100) / 100,
      uptime: Math.round(uptime * 100) / 100,
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      mtbf: this.calculateMTBF(metrics.metrics), // Mean Time Between Failures
      mttr: this.calculateMTTR(metrics.metrics), // Mean Time To Recovery
      reliability: {
        score: Math.min(successRate, uptime),
        status: successRate >= 99 ? 'excellent' : 
                successRate >= 95 ? 'good' : 
                successRate >= 90 ? 'fair' : 'poor'
      }
    };
  }
  
  /**
   * Analyze usage patterns
   */
  async analyzeUsagePatterns(serverName, timeframe) {
    const metrics = await this.getRecentMetrics(serverName, timeframe);
    
    if (metrics.metrics.length === 0) {
      return {
        status: 'no_data',
        message: 'No usage data available'
      };
    }
    
    // Analyze usage by time of day
    const hourlyUsage = this.analyzeHourlyUsage(metrics.metrics);
    const dailyUsage = this.analyzeDailyUsage(metrics.metrics);
    const peakUsage = this.analyzePeakUsage(metrics.metrics);
    
    return {
      patterns: {
        hourly: hourlyUsage,
        daily: dailyUsage,
        peak: peakUsage
      },
      trends: {
        growth: this.calculateUsageGrowth(metrics.metrics),
        seasonality: this.detectSeasonality(metrics.metrics),
        anomalies: this.detectUsageAnomalies(metrics.metrics)
      },
      recommendations: this.generateUsageRecommendations(hourlyUsage, peakUsage)
    };
  }
  
  /**
   * Analyze quality metrics
   */
  async analyzeQualityMetrics(serverName, timeframe) {
    const performanceAnalysis = await this.analyzePerformanceMetrics(serverName, timeframe);
    const reliabilityAnalysis = await this.analyzeReliabilityMetrics(serverName, timeframe);
    
    // Calculate composite quality score
    const qualityScore = (
      performanceAnalysis.score * 0.4 +
      reliabilityAnalysis.reliability.score * 0.6
    );
    
    return {
      overall: {
        score: Math.round(qualityScore),
        grade: this.calculateQualityGrade(qualityScore),
        status: qualityScore >= 90 ? 'excellent' :
                qualityScore >= 80 ? 'good' :
                qualityScore >= 70 ? 'fair' : 'poor'
      },
      components: {
        performance: {
          score: performanceAnalysis.score,
          weight: 40
        },
        reliability: {
          score: reliabilityAnalysis.reliability.score,
          weight: 60
        }
      },
      trends: {
        performance: performanceAnalysis.trends,
        reliability: reliabilityAnalysis
      },
      recommendations: [
        ...performanceAnalysis.recommendations || [],
        ...this.generateQualityRecommendations(qualityScore)
      ]
    };
  }
  
  /**
   * Calculate cost summary
   */
  calculateCostSummary(costs) {
    if (costs.length === 0) {
      return {
        totalCost: 0,
        totalRequests: 0,
        avgCostPerRequest: 0,
        currency: 'USD'
      };
    }
    
    const totalCost = costs.reduce((sum, c) => sum + (c.cost || 0), 0);
    const totalRequests = costs.reduce((sum, c) => sum + (c.requests || 1), 0);
    
    return {
      totalCost: Math.round(totalCost * 100) / 100,
      totalRequests,
      avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      currency: 'USD'
    };
  }
  
  /**
   * Calculate cost breakdown by time period
   */
  async calculateCostBreakdown(timeframe) {
    const breakdown = {
      daily: {},
      hourly: {},
      byServer: {}
    };
    
    for (const [serverName, costs] of this.costTracking) {
      breakdown.byServer[serverName] = this.calculateCostSummary(costs);
      
      // Group by day and hour
      costs.forEach(cost => {
        const date = cost.timestamp.split('T')[0];
        const hour = new Date(cost.timestamp).getHours();
        
        if (!breakdown.daily[date]) breakdown.daily[date] = 0;
        if (!breakdown.hourly[hour]) breakdown.hourly[hour] = 0;
        
        breakdown.daily[date] += cost.cost || 0;
        breakdown.hourly[hour] += cost.cost || 0;
      });
    }
    
    return breakdown;
  }
  
  /**
   * Calculate cost trends
   */
  async calculateCostTrends(timeframe) {
    // Mock cost trend calculation
    return {
      direction: 'stable',
      percentage: 0,
      period: timeframe,
      forecast: 'stable'
    };
  }
  
  /**
   * Generate cost projections
   */
  async generateCostProjections(costAnalysis) {
    const currentCost = costAnalysis.total.cost;
    const currentRequests = costAnalysis.total.requests;
    
    return {
      nextMonth: {
        estimated: currentCost * 1.1, // 10% growth assumption
        confidence: 'medium',
        basis: 'historical_trend'
      },
      nextQuarter: {
        estimated: currentCost * 3.5, // Slight growth over 3 months
        confidence: 'low',
        basis: 'linear_projection'
      },
      savings: {
        potential: currentCost * 0.15, // 15% potential savings
        recommendations: [
          'Optimize request patterns',
          'Implement caching',
          'Review server configurations'
        ]
      }
    };
  }
  
  /**
   * Calculate system trends
   */
  async calculateSystemTrends(timeframe) {
    // Mock system trends
    return {
      performance: {
        direction: 'improving',
        percentage: 5.2
      },
      reliability: {
        direction: 'stable',
        percentage: 0.1
      },
      cost: {
        direction: 'increasing',
        percentage: 3.1
      },
      usage: {
        direction: 'increasing',
        percentage: 8.5
      }
    };
  }
  
  /**
   * Generate metric alerts
   */
  async generateMetricAlerts(aggregatedMetrics) {
    const alerts = [];
    
    // Check system-wide metrics for alerts
    if (aggregatedMetrics.overview.avgResponseTime > 5000) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `System average response time is high: ${aggregatedMetrics.overview.avgResponseTime}ms`,
        threshold: 5000,
        actual: aggregatedMetrics.overview.avgResponseTime
      });
    }
    
    if (aggregatedMetrics.overview.systemAvailability < 95) {
      alerts.push({
        type: 'reliability',
        severity: 'critical',
        message: `System availability is low: ${aggregatedMetrics.overview.systemAvailability.toFixed(1)}%`,
        threshold: 95,
        actual: aggregatedMetrics.overview.systemAvailability
      });
    }
    
    // Check individual server metrics
    for (const [serverName, serverMetrics] of Object.entries(aggregatedMetrics.byServer)) {
      if (serverMetrics.successRate < 90) {
        alerts.push({
          type: 'reliability',
          severity: 'critical',
          server: serverName,
          message: `${serverName} success rate is low: ${serverMetrics.successRate}%`,
          threshold: 90,
          actual: serverMetrics.successRate
        });
      }
    }
    
    return alerts;
  }
  
  // Helper methods
  
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
  
  calculateTrend(values) {
    if (values.length < 3) {
      return { direction: 'unknown', percentage: 0 };
    }
    
    const first = values.slice(0, Math.floor(values.length / 3)).reduce((sum, v) => sum + v, 0) / Math.floor(values.length / 3);
    const last = values.slice(-Math.floor(values.length / 3)).reduce((sum, v) => sum + v, 0) / Math.floor(values.length / 3);
    
    const change = ((last - first) / first) * 100;
    
    return {
      direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      percentage: Math.abs(change),
      change: change
    };
  }
  
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  calculateThroughput(metrics) {
    if (metrics.length === 0) return 0;
    
    const totalRequests = metrics.reduce((sum, m) => sum + (m.requests || 1), 0);
    const timeSpan = (new Date(metrics[metrics.length - 1].timestamp) - new Date(metrics[0].timestamp)) / (1000 * 60);
    
    return timeSpan > 0 ? totalRequests / timeSpan : 0;
  }
  
  calculatePeakThroughput(metrics) {
    // Find highest throughput in any 5-minute window
    let maxThroughput = 0;
    
    for (let i = 0; i < metrics.length - 5; i++) {
      const window = metrics.slice(i, i + 5);
      const throughput = this.calculateThroughput(window);
      maxThroughput = Math.max(maxThroughput, throughput);
    }
    
    return maxThroughput;
  }
  
  calculateMinThroughput(metrics) {
    // Find lowest throughput in any 5-minute window
    let minThroughput = Infinity;
    
    for (let i = 0; i < metrics.length - 5; i++) {
      const window = metrics.slice(i, i + 5);
      const throughput = this.calculateThroughput(window);
      minThroughput = Math.min(minThroughput, throughput);
    }
    
    return minThroughput === Infinity ? 0 : minThroughput;
  }
  
  calculateServerHealthScore(summary) {
    const responseTimeScore = summary.avgResponseTime <= 1000 ? 100 : 
                             summary.avgResponseTime <= 3000 ? 80 : 
                             summary.avgResponseTime <= 5000 ? 60 : 40;
    
    const reliabilityScore = summary.successRate;
    
    return (responseTimeScore + reliabilityScore) / 2;
  }
  
  calculatePerformanceScore(avgResponseTime) {
    if (avgResponseTime <= 500) return 100;
    if (avgResponseTime <= 1000) return 90;
    if (avgResponseTime <= 2000) return 80;
    if (avgResponseTime <= 3000) return 70;
    if (avgResponseTime <= 5000) return 60;
    return 40;
  }
  
  calculateMTBF(metrics) {
    // Mean Time Between Failures (in minutes)
    // Mock calculation
    return 1440; // 24 hours
  }
  
  calculateMTTR(metrics) {
    // Mean Time To Recovery (in minutes)
    // Mock calculation
    return 15; // 15 minutes
  }
  
  analyzeHourlyUsage(metrics) {
    const hourlyUsage = {};
    
    metrics.forEach(metric => {
      const hour = new Date(metric.timestamp).getHours();
      if (!hourlyUsage[hour]) hourlyUsage[hour] = 0;
      hourlyUsage[hour] += metric.requests || 1;
    });
    
    return hourlyUsage;
  }
  
  analyzeDailyUsage(metrics) {
    const dailyUsage = {};
    
    metrics.forEach(metric => {
      const day = metric.timestamp.split('T')[0];
      if (!dailyUsage[day]) dailyUsage[day] = 0;
      dailyUsage[day] += metric.requests || 1;
    });
    
    return dailyUsage;
  }
  
  analyzePeakUsage(metrics) {
    const hourlyUsage = this.analyzeHourlyUsage(metrics);
    const maxHour = Object.entries(hourlyUsage)
      .reduce((max, [hour, usage]) => usage > max.usage ? { hour, usage } : max, { hour: 0, usage: 0 });
    
    return {
      peakHour: maxHour.hour,
      peakUsage: maxHour.usage,
      offPeakHours: Object.entries(hourlyUsage)
        .filter(([hour, usage]) => usage < maxHour.usage * 0.5)
        .map(([hour]) => hour)
    };
  }
  
  calculateUsageGrowth(metrics) {
    // Mock usage growth calculation
    return {
      direction: 'increasing',
      percentage: 12.5,
      period: 'weekly'
    };
  }
  
  detectSeasonality(metrics) {
    // Mock seasonality detection
    return {
      detected: true,
      pattern: 'weekly',
      confidence: 0.85
    };
  }
  
  detectUsageAnomalies(metrics) {
    // Mock anomaly detection
    return [
      {
        timestamp: new Date().toISOString(),
        type: 'spike',
        severity: 'medium',
        description: 'Unusual traffic spike detected'
      }
    ];
  }
  
  generatePerformanceRecommendations(responseTimes) {
    const avgResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    const recommendations = [];
    
    if (avgResponseTime > 3000) {
      recommendations.push('Consider optimizing database queries');
      recommendations.push('Review server resource allocation');
      recommendations.push('Implement response caching');
    }
    
    if (Math.max(...responseTimes) > 10000) {
      recommendations.push('Investigate outlier requests causing high response times');
    }
    
    return recommendations;
  }
  
  generateUsageRecommendations(hourlyUsage, peakUsage) {
    const recommendations = [];
    
    if (peakUsage.peakUsage > 1000) {
      recommendations.push('Consider load balancing during peak hours');
      recommendations.push('Implement auto-scaling for peak traffic');
    }
    
    if (peakUsage.offPeakHours.length > 12) {
      recommendations.push('Consider scaling down resources during off-peak hours');
    }
    
    return recommendations;
  }
  
  calculateQualityGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 65) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  generateQualityRecommendations(qualityScore) {
    const recommendations = [];
    
    if (qualityScore < 80) {
      recommendations.push('Focus on improving system reliability');
      recommendations.push('Implement comprehensive monitoring');
    }
    
    if (qualityScore < 70) {
      recommendations.push('Review architecture for performance bottlenecks');
      recommendations.push('Consider implementing redundancy for critical components');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const mcpMetricsCollector = new MCPMetricsCollector();