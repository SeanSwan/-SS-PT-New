/**
 * P2: Advanced MCP Analytics and Monitoring
 * Deep analytics for MCP server performance, token usage, and quality metrics
 * Aligned with Master Prompt v26 MCP-Centric Architecture
 */

// Import necessary modules
import axios from 'axios';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';
import { mcpHealthManager } from '../../utils/monitoring/mcpHealthManager.mjs';
import sequelize from '../../database.mjs';

class MCPAnalytics extends EventEmitter {
  constructor() {
    super();
    
    this.analyticsDB = sequelize; // Use main database for analytics
    this.tokenCosts = {
      'claude-3-5-sonnet': { input: 0.003, output: 0.015 }, // per 1K tokens
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'gpt-4': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    };
    
    this.qualityMetrics = {
      responseTime: { weight: 0.25, threshold: 3000 }, // ms
      accuracy: { weight: 0.25, threshold: 0.85 }, // 0-1
      completion: { weight: 0.25, threshold: 0.95 }, // 0-1
      userSatisfaction: { weight: 0.25, threshold: 4.0 } // 1-5
    };
    
    this.alertThresholds = {
      tokenUsageSpike: 2.0, // 2x normal usage
      responseTimeDegradation: 1.5, // 1.5x normal response time
      errorRateIncrease: 0.1, // 10% error rate
      costThreshold: 100, // $100 per hour
      qualityDegradation: 0.8 // Quality score below 80%
    };
    
    // Initialize metrics tracking
    this.metricsHistory = new Map();
    this.realTimeMetrics = new Map();

    // MCP servers are not deployed in production — skip real-time monitoring unless explicitly enabled
    const isProduction = process.env.NODE_ENV === 'production';
    const mcpEnabled = isProduction
      ? process.env.ENABLE_MCP_SERVICES === 'true'
      : process.env.ENABLE_MCP_SERVICES !== 'false';

    if (mcpEnabled) {
      this.startRealTimeMonitoring();
    } else {
      piiSafeLogger.info('MCP Analytics real-time monitoring DISABLED (MCP services not enabled)');
    }
  }

  /**
   * Track token usage for MCP operations
   * @param {string} server - MCP server name
   * @param {string} operation - Operation performed
   * @param {number} tokens - Number of tokens used
   * @param {string} model - AI model used
   */
  async trackTokenUsage(server, operation, tokens, model = 'claude-3-5-sonnet') {
    try {
      const cost = this.calculateTokenCost(tokens, model);
      const timestamp = Date.now();
      
      // Store in database (if models exist)
      try {
        if (this.analyticsDB.models && this.analyticsDB.models.MCPTokenUsage) {
          await this.analyticsDB.models.MCPTokenUsage.create({
            server,
            operation,
            tokens,
            model,
            cost,
            timestamp: new Date(timestamp)
          });
        }
      } catch (dbError) {
        // If models don't exist, log the issue but continue
        piiSafeLogger.warn('MCPTokenUsage model not found, storing in memory only', {
          error: dbError.message
        });
      }
      
      // Update real-time metrics
      this.updateRealTimeMetrics(server, {
        tokenUsage: tokens,
        cost,
        operation
      });
      
      // Check for token usage spikes
      await this.checkTokenUsageAlert(server, operation, tokens);
      
      // Log with PII safety
      piiSafeLogger.info(`Token usage tracked for ${server}`, {
        operation,
        tokens,
        cost,
        model
      });
      
      this.emit('tokenUsage', {
        server,
        operation,
        tokens,
        cost,
        model,
        timestamp
      });
    } catch (error) {
      piiSafeLogger.error('Failed to track token usage', {
        error: error.message,
        server,
        operation,
        tokens
      });
    }
  }

  /**
   * Calculate token cost based on model pricing
   * @param {number} tokens - Number of tokens
   * @param {string} model - AI model used
   * @param {string} type - 'input' or 'output'
   */
  calculateTokenCost(tokens, model, type = 'output') {
    const modelPricing = this.tokenCosts[model] || this.tokenCosts['claude-3-5-sonnet'];
    const rate = modelPricing[type] || modelPricing.output;
    return (tokens / 1000) * rate;
  }

  /**
   * Track MCP operation quality metrics
   * @param {string} server - MCP server name
   * @param {string} operation - Operation performed
   * @param {Object} metrics - Quality metrics object
   */
  async trackQualityMetrics(server, operation, metrics) {
    try {
      const qualityRecord = {
        server,
        operation,
        responseTime: metrics.responseTime || 0,
        accuracy: metrics.accuracy || 0,
        completion: metrics.completion || 0,
        userSatisfaction: metrics.userSatisfaction || 0,
        overallQuality: this.calculateOverallQuality(metrics),
        timestamp: new Date()
      };
      
      // Store in database (if models exist)
      try {
        if (this.analyticsDB.models && this.analyticsDB.models.MCPQualityMetrics) {
          await this.analyticsDB.models.MCPQualityMetrics.create(qualityRecord);
        }
      } catch (dbError) {
        // If models don't exist, log the issue but continue
        piiSafeLogger.warn('MCPQualityMetrics model not found, storing in memory only', {
          error: dbError.message
        });
      }
      
      // Update real-time metrics
      this.updateRealTimeMetrics(server, {
        qualityScore: qualityRecord.overallQuality,
        responseTime: metrics.responseTime
      });
      
      // Check for quality degradation
      await this.checkQualityAlert(server, operation, qualityRecord);
      
      piiSafeLogger.info(`Quality tracked for ${server}`, {
        operation,
        qualityScore: qualityRecord.overallQuality,
        responseTime: metrics.responseTime
      });
      
      this.emit('qualityUpdate', {
        server,
        operation,
        ...qualityRecord
      });
      
      return qualityRecord;
    } catch (error) {
      piiSafeLogger.error('Failed to track quality metrics', {
        error: error.message,
        server,
        operation
      });
      return null;
    }
  }

  /**
   * Calculate overall quality score
   * @param {Object} metrics - Individual quality metrics
   */
  calculateOverallQuality(metrics) {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [metricName, config] of Object.entries(this.qualityMetrics)) {
      if (metrics[metricName] !== undefined) {
        let normalizedScore = metrics[metricName];
        
        // Normalize response time (lower is better)
        if (metricName === 'responseTime') {
          normalizedScore = Math.max(0, 1 - (metrics[metricName] / (config.threshold * 2)));
        }
        
        totalScore += normalizedScore * config.weight;
        totalWeight += config.weight;
      }
    }
    
    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : 0;
  }

  /**
   * Generate comprehensive MCP health report
   * @param {string} timeframe - 'hour', 'day', 'week', 'month'
   */
  async generateMCPHealthReport(timeframe = 'day') {
    try {
      const timeframeMs = this.getTimeframeMs(timeframe);
      const startTime = new Date(Date.now() - timeframeMs);
      
      const report = {
        timeframe,
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        summary: {
          serverHealth: await this.getServerHealthSummary(startTime),
          tokenEfficiency: await this.calculateTokenEfficiency(startTime),
          responseQuality: await this.analyzeResponseQuality(startTime),
          userSatisfaction: await this.getUserFeedbackScores(startTime),
          costAnalysis: await this.analyzeCosts(startTime),
          alertsSummary: await this.getAlertsSummary(startTime)
        },
        serverDetails: {},
        recommendations: [],
        trends: {}
      };
      
      // Get detailed metrics for each server
      const servers = Object.keys(mcpHealthManager.mcpServers);
      for (const serverKey of servers) {
        report.serverDetails[serverKey] = await this.getServerDetailedMetrics(serverKey, startTime);
      }
      
      // Analyze trends
      report.trends = await this.analyzeTrends(startTime);
      
      // Generate recommendations
      report.recommendations = this.generateRecommendations(report);
      
      // Log report generation
      piiSafeLogger.info('MCP health report generated', {
        timeframe,
        serverCount: servers.length,
        totalOperations: report.summary.serverHealth.totalOperations
      });
      
      return report;
    } catch (error) {
      piiSafeLogger.error('Failed to generate MCP health report', {
        error: error.message,
        timeframe
      });
      throw error;
    }
  }

  /**
   * Get server health summary
   * @param {Date} startTime - Start time for analysis
   */
  async getServerHealthSummary(startTime) {
    try {
      // Get current health status
      const ecosystemHealth = await mcpHealthManager.getMCPEcosystemHealth();
      
      // Calculate uptime percentage
      const uptimeStats = await this.calculateUptimeStats(startTime);
      
      return {
        overallHealth: ecosystemHealth.overallHealth,
        healthyServers: `${ecosystemHealth.healthyServers}/${ecosystemHealth.totalServers}`,
        averageLatency: ecosystemHealth.averageLatency,
        uptimePercentage: uptimeStats.uptimePercentage,
        totalOperations: uptimeStats.totalOperations,
        successRate: uptimeStats.successRate
      };
    } catch (error) {
      piiSafeLogger.error('Failed to get server health summary', {
        error: error.message
      });
      return {
        overallHealth: 0,
        healthyServers: '0/0',
        averageLatency: 0,
        uptimePercentage: 0,
        totalOperations: 0,
        successRate: 0
      };
    }
  }

  /**
   * Calculate token efficiency metrics using in-memory data if DB models not available
   * @param {Date} startTime - Start time for analysis
   */
  async calculateTokenEfficiency(startTime) {
    try {
      let tokenStats = [];
      
      // Try to get from database first
      try {
        if (this.analyticsDB.models && this.analyticsDB.models.MCPTokenUsage) {
          tokenStats = await this.analyticsDB.models.MCPTokenUsage.findAll({
            where: {
              timestamp: {
                [sequelize.Op.gte]: startTime
              }
            },
            attributes: [
              'server',
              [sequelize.fn('SUM', sequelize.col('tokens')), 'totalTokens'],
              [sequelize.fn('SUM', sequelize.col('cost')), 'totalCost'],
              [sequelize.fn('AVG', sequelize.col('tokens')), 'avgTokens'],
              [sequelize.fn('COUNT', sequelize.col('id')), 'operationCount']
            ],
            group: ['server']
          });
        }
      } catch (dbError) {
        // Fall back to in-memory data
        piiSafeLogger.info('Using in-memory data for token efficiency calculation');
      }
      
      const efficiency = {
        totalTokensUsed: 0,
        totalCost: 0,
        averageTokensPerOperation: 0,
        costPerOperation: 0,
        tokenEfficiencyScore: 100,
        serverBreakdown: {}
      };
      
      // Process database results if available
      if (tokenStats.length > 0) {
        for (const stat of tokenStats) {
          const server = stat.get('server');
          const totalTokens = parseFloat(stat.get('totalTokens')) || 0;
          const totalCost = parseFloat(stat.get('totalCost')) || 0;
          const avgTokens = parseFloat(stat.get('avgTokens')) || 0;
          const operationCount = parseInt(stat.get('operationCount')) || 0;
          
          efficiency.totalTokensUsed += totalTokens;
          efficiency.totalCost += totalCost;
          
          efficiency.serverBreakdown[server] = {
            totalTokens,
            totalCost,
            avgTokens,
            operationCount,
            costPerOperation: operationCount > 0 ? totalCost / operationCount : 0
          };
        }
      } else {
        // Use real-time metrics as fallback
        for (const [server, metrics] of this.realTimeMetrics.entries()) {
          efficiency.totalTokensUsed += metrics.tokenUsage || 0;
          efficiency.totalCost += metrics.cost || 0;
          efficiency.serverBreakdown[server] = {
            totalTokens: metrics.tokenUsage || 0,
            totalCost: metrics.cost || 0,
            avgTokens: metrics.operationCount > 0 ? metrics.tokenUsage / metrics.operationCount : 0,
            operationCount: metrics.operationCount || 0,
            costPerOperation: metrics.operationCount > 0 ? metrics.cost / metrics.operationCount : 0
          };
        }
      }
      
      // Calculate overall averages
      const totalOperations = Object.values(efficiency.serverBreakdown)
        .reduce((sum, server) => sum + server.operationCount, 0);
      
      efficiency.averageTokensPerOperation = totalOperations > 0 
        ? efficiency.totalTokensUsed / totalOperations 
        : 0;
      efficiency.costPerOperation = totalOperations > 0 
        ? efficiency.totalCost / totalOperations 
        : 0;
      
      // Calculate efficiency score (based on cost per token)
      const targetCostPerToken = 0.015; // Target cost in dollars
      const actualCostPerToken = efficiency.totalTokensUsed > 0 
        ? efficiency.totalCost / efficiency.totalTokensUsed * 1000 // Convert to per 1K tokens
        : 0;
      
      efficiency.tokenEfficiencyScore = Math.max(0, 
        Math.min(100, actualCostPerToken > 0 ? (targetCostPerToken / actualCostPerToken) * 100 : 100)
      );
      
      return efficiency;
    } catch (error) {
      piiSafeLogger.error('Failed to calculate token efficiency', {
        error: error.message
      });
      return {
        totalTokensUsed: 0,
        totalCost: 0,
        averageTokensPerOperation: 0,
        costPerOperation: 0,
        tokenEfficiencyScore: 0,
        serverBreakdown: {}
      };
    }
  }

  /**
   * Analyze response quality across servers
   * @param {Date} startTime - Start time for analysis
   */
  async analyzeResponseQuality(startTime) {
    try {
      let qualityStats = [];
      
      // Try to get from database first
      try {
        if (this.analyticsDB.models && this.analyticsDB.models.MCPQualityMetrics) {
          qualityStats = await this.analyticsDB.models.MCPQualityMetrics.findAll({
            where: {
              timestamp: {
                [sequelize.Op.gte]: startTime
              }
            },
            attributes: [
              'server',
              [sequelize.fn('AVG', sequelize.col('overallQuality')), 'avgQuality'],
              [sequelize.fn('AVG', sequelize.col('responseTime')), 'avgResponseTime'],
              [sequelize.fn('AVG', sequelize.col('accuracy')), 'avgAccuracy'],
              [sequelize.fn('AVG', sequelize.col('completion')), 'avgCompletion'],
              [sequelize.fn('COUNT', sequelize.col('id')), 'sampleSize']
            ],
            group: ['server']
          });
        }
      } catch (dbError) {
        // Fall back to in-memory data
        piiSafeLogger.info('Using in-memory data for quality analysis');
      }
      
      const quality = {
        overallQualityScore: 0,
        averageResponseTime: 0,
        accuracyScore: 0,
        completionScore: 0,
        serverBreakdown: {},
        trends: {
          qualityImproving: false,
          responseTimeImproving: false
        }
      };
      
      let totalSamples = 0;
      let weightedQualitySum = 0;
      let weightedResponseTimeSum = 0;
      let weightedAccuracySum = 0;
      let weightedCompletionSum = 0;
      
      if (qualityStats.length > 0) {
        // Process database results
        for (const stat of qualityStats) {
          const server = stat.get('server');
          const avgQuality = parseFloat(stat.get('avgQuality')) || 0;
          const avgResponseTime = parseFloat(stat.get('avgResponseTime')) || 0;
          const avgAccuracy = parseFloat(stat.get('avgAccuracy')) || 0;
          const avgCompletion = parseFloat(stat.get('avgCompletion')) || 0;
          const sampleSize = parseInt(stat.get('sampleSize')) || 0;
          
          // Weight by sample size
          weightedQualitySum += avgQuality * sampleSize;
          weightedResponseTimeSum += avgResponseTime * sampleSize;
          weightedAccuracySum += avgAccuracy * sampleSize;
          weightedCompletionSum += avgCompletion * sampleSize;
          totalSamples += sampleSize;
          
          quality.serverBreakdown[server] = {
            qualityScore: avgQuality,
            responseTime: avgResponseTime,
            accuracy: avgAccuracy,
            completion: avgCompletion,
            sampleSize
          };
        }
      } else {
        // Use real-time metrics as fallback
        for (const [server, metrics] of this.realTimeMetrics.entries()) {
          const sampleSize = metrics.operationCount || 1;
          weightedQualitySum += (metrics.qualityScore || 0.8) * sampleSize;
          weightedResponseTimeSum += (metrics.responseTime || 1000) * sampleSize;
          totalSamples += sampleSize;
          
          quality.serverBreakdown[server] = {
            qualityScore: metrics.qualityScore || 0.8,
            responseTime: metrics.responseTime || 1000,
            accuracy: 0.85, // Default values for fallback
            completion: 0.9,
            sampleSize
          };
        }
      }
      
      // Calculate weighted averages
      if (totalSamples > 0) {
        quality.overallQualityScore = weightedQualitySum / totalSamples;
        quality.averageResponseTime = weightedResponseTimeSum / totalSamples;
        quality.accuracyScore = weightedAccuracySum / totalSamples;
        quality.completionScore = weightedCompletionSum / totalSamples;
      }
      
      // Analyze trends (compare with previous period)
      quality.trends = await this.analyzeQualityTrends(startTime);
      
      return quality;
    } catch (error) {
      piiSafeLogger.error('Failed to analyze response quality', {
        error: error.message
      });
      return {
        overallQualityScore: 0,
        averageResponseTime: 0,
        accuracyScore: 0,
        completionScore: 0,
        serverBreakdown: {},
        trends: {
          qualityImproving: false,
          responseTimeImproving: false
        }
      };
    }
  }

  /**
   * Get user feedback scores
   * @param {Date} startTime - Start time for analysis
   */
  async getUserFeedbackScores(startTime) {
    try {
      // This would integrate with a feedback system
      // For now, returning mock data structure with some variability
      const baseRating = 4.2;
      const variance = (Math.random() - 0.5) * 0.4; // +/- 0.2 variance
      const currentRating = Math.max(1, Math.min(5, baseRating + variance));
      
      return {
        averageRating: Math.round(currentRating * 10) / 10,
        totalFeedbacks: Math.floor(140 + Math.random() * 30),
        distributionByRating: {
          5: Math.floor(50 + Math.random() * 20),
          4: Math.floor(35 + Math.random() * 15),
          3: Math.floor(20 + Math.random() * 15),
          2: Math.floor(8 + Math.random() * 8),
          1: Math.floor(3 + Math.random() * 5)
        },
        sentimentAnalysis: {
          positive: 0.65 + Math.random() * 0.15,
          neutral: 0.20 + Math.random() * 0.10,
          negative: 0.08 + Math.random() * 0.08
        },
        topCompliments: [
          'Fast response time',
          'Accurate results',
          'Easy to use',
          'Helpful recommendations'
        ],
        topComplaints: [
          'Occasional slow response',
          'Could be more detailed',
          'Sometimes misunderstands context'
        ]
      };
    } catch (error) {
      piiSafeLogger.error('Failed to get user feedback scores', {
        error: error.message
      });
      return {
        averageRating: 0,
        totalFeedbacks: 0,
        distributionByRating: {},
        sentimentAnalysis: { positive: 0, neutral: 0, negative: 0 },
        topCompliments: [],
        topComplaints: []
      };
    }
  }

  /**
   * Analyze costs across timeframe
   * @param {Date} startTime - Start time for analysis
   */
  async analyzeCosts(startTime) {
    try {
      const analysis = {
        totalCost: 0,
        costByServer: {},
        costByModel: {},
        costTrends: {
          increasing: false,
          percentageChange: 0
        },
        costOptimizationOpportunities: [],
        projectedMonthlyCost: 0
      };
      
      // Use real-time metrics for cost calculation
      for (const [server, metrics] of this.realTimeMetrics.entries()) {
        const serverCost = metrics.cost || 0;
        analysis.totalCost += serverCost;
        analysis.costByServer[server] = serverCost;
        
        // Assume primary model is claude-3-5-sonnet for cost breakdown
        if (!analysis.costByModel['claude-3-5-sonnet']) {
          analysis.costByModel['claude-3-5-sonnet'] = 0;
        }
        analysis.costByModel['claude-3-5-sonnet'] += serverCost;
      }
      
      // Calculate projected monthly cost
      const timeframeDays = (Date.now() - startTime.getTime()) / (1000 * 60 * 60 * 24);
      const dailyAvgCost = analysis.totalCost / Math.max(timeframeDays, 1);
      analysis.projectedMonthlyCost = dailyAvgCost * 30;
      
      // Analyze cost trends (simulate trend analysis)
      analysis.costTrends = await this.analyzeCostTrends(startTime);
      
      // Generate cost optimization opportunities
      analysis.costOptimizationOpportunities = this.generateCostOptimizations(analysis);
      
      return analysis;
    } catch (error) {
      piiSafeLogger.error('Failed to analyze costs', {
        error: error.message
      });
      return {
        totalCost: 0,
        costByServer: {},
        costByModel: {},
        costTrends: { increasing: false, percentageChange: 0 },
        costOptimizationOpportunities: [],
        projectedMonthlyCost: 0
      };
    }
  }

  /**
   * Generate cost optimization recommendations
   * @param {Object} costAnalysis - Cost analysis data
   */
  generateCostOptimizations(costAnalysis) {
    const opportunities = [];
    
    // Find most expensive server
    const serverCosts = Object.entries(costAnalysis.costByServer)
      .sort(([,a], [,b]) => b - a);
    
    if (serverCosts.length > 0) {
      const [expensiveServer, cost] = serverCosts[0];
      if (cost > costAnalysis.totalCost * 0.4) {
        opportunities.push({
          type: 'server_optimization',
          server: expensiveServer,
          description: `${expensiveServer} accounts for ${((cost / costAnalysis.totalCost) * 100).toFixed(1)}% of total costs`,
          recommendation: 'Consider optimizing prompts or switching to a more cost-effective model',
          potentialSavings: cost * 0.2 // Assume 20% potential savings
        });
      }
    }
    
    // Find expensive models
    const modelCosts = Object.entries(costAnalysis.costByModel)
      .sort(([,a], [,b]) => b - a);
    
    for (const [model, cost] of modelCosts) {
      if (model.includes('opus') && cost > 0) {
        opportunities.push({
          type: 'model_optimization',
          model,
          description: `Using expensive model: ${model}`,
          recommendation: 'Consider switching to Claude 3.5 Sonnet for similar quality at lower cost',
          potentialSavings: cost * 0.6 // Opus to Sonnet can save ~60%
        });
      }
    }
    
    // Check for prompt optimization opportunities
    opportunities.push({
      type: 'prompt_optimization',
      description: 'Token usage could be optimized through better prompts',
      recommendation: 'Implement prompt caching and optimize for conciseness',
      potentialSavings: costAnalysis.totalCost * 0.15 // 15% potential savings
    });
    
    return opportunities;
  }

  /**
   * Check for token usage alerts
   * @param {string} server - MCP server
   * @param {string} operation - Operation name
   * @param {number} tokens - Current token usage
   */
  async checkTokenUsageAlert(server, operation, tokens) {
    try {
      // Get average token usage for this operation
      const avgUsage = await this.getAverageTokenUsage(server, operation);
      
      if (avgUsage > 0 && tokens > avgUsage * this.alertThresholds.tokenUsageSpike) {
        const alert = {
          type: 'token_usage_spike',
          server,
          operation,
          currentTokens: tokens,
          averageTokens: avgUsage,
          spikeMultiplier: tokens / avgUsage,
          timestamp: new Date()
        };
        
        await this.raiseAlert(alert);
      }
    } catch (error) {
      piiSafeLogger.error('Failed to check token usage alert', {
        error: error.message,
        server,
        operation
      });
    }
  }

  /**
   * Check for quality degradation alerts
   * @param {string} server - MCP server
   * @param {string} operation - Operation name
   * @param {Object} qualityRecord - Quality metrics
   */
  async checkQualityAlert(server, operation, qualityRecord) {
    try {
      if (qualityRecord.overallQuality < this.alertThresholds.qualityDegradation) {
        const alert = {
          type: 'quality_degradation',
          server,
          operation,
          qualityScore: qualityRecord.overallQuality,
          threshold: this.alertThresholds.qualityDegradation,
          metrics: {
            responseTime: qualityRecord.responseTime,
            accuracy: qualityRecord.accuracy,
            completion: qualityRecord.completion,
            userSatisfaction: qualityRecord.userSatisfaction
          },
          timestamp: new Date()
        };
        
        await this.raiseAlert(alert);
      }
    } catch (error) {
      piiSafeLogger.error('Failed to check quality alert', {
        error: error.message,
        server,
        operation
      });
    }
  }

  /**
   * Raise an alert
   * @param {Object} alert - Alert object
   */
  async raiseAlert(alert) {
    try {
      // Store alert in database (if models exist)
      try {
        if (this.analyticsDB.models && this.analyticsDB.models.MCPAlerts) {
          await this.analyticsDB.models.MCPAlerts.create({
            type: alert.type,
            server: alert.server,
            operation: alert.operation,
            severity: this.getAlertSeverity(alert),
            details: JSON.stringify(alert),
            resolved: false,
            timestamp: alert.timestamp
          });
        }
      } catch (dbError) {
        // Store in memory if database not available
        piiSafeLogger.warn('MCPAlerts model not found, storing alert in memory only', {
          error: dbError.message
        });
      }
      
      // Log alert
      piiSafeLogger.warn(`MCP Alert raised: ${alert.type} on ${alert.server}`, {
        type: alert.type,
        operation: alert.operation,
        severity: this.getAlertSeverity(alert)
      });
      
      // Emit alert event
      this.emit('alert', alert);
      
      // In production, this would integrate with alerting systems
      console.warn(`🚨 MCP Alert: ${alert.type} on ${alert.server}`);
    } catch (error) {
      piiSafeLogger.error('Failed to raise alert', {
        error: error.message,
        alert
      });
    }
  }

  /**
   * Get alert severity
   * @param {Object} alert - Alert object
   */
  getAlertSeverity(alert) {
    switch (alert.type) {
      case 'token_usage_spike':
        return alert.spikeMultiplier > 3 ? 'critical' : 'warning';
      case 'quality_degradation':
        return alert.qualityScore < 0.6 ? 'critical' : 'warning';
      case 'cost_threshold':
        return alert.cost > this.alertThresholds.costThreshold ? 'critical' : 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Get average token usage for operation
   * @param {string} server - MCP server
   * @param {string} operation - Operation name
   */
  async getAverageTokenUsage(server, operation) {
    try {
      // Try database first
      if (this.analyticsDB.models && this.analyticsDB.models.MCPTokenUsage) {
        const result = await this.analyticsDB.models.MCPTokenUsage.findOne({
          where: { server, operation },
          attributes: [
            [sequelize.fn('AVG', sequelize.col('tokens')), 'avgTokens']
          ]
        });
        
        if (result) {
          return parseFloat(result.get('avgTokens')) || 0;
        }
      }
      
      // Fall back to real-time metrics
      const metrics = this.realTimeMetrics.get(server);
      if (metrics && metrics.operationCount > 0) {
        return metrics.tokenUsage / metrics.operationCount;
      }
      
      return 0;
    } catch (error) {
      piiSafeLogger.error('Failed to get average token usage', {
        error: error.message,
        server,
        operation
      });
      return 0;
    }
  }

  /**
   * Update real-time metrics
   * @param {string} server - MCP server
   * @param {Object} metrics - Metrics to update
   */
  updateRealTimeMetrics(server, metrics) {
    if (!this.realTimeMetrics.has(server)) {
      this.realTimeMetrics.set(server, {
        tokenUsage: 0,
        cost: 0,
        qualityScore: 0,
        responseTime: 0,
        operationCount: 0,
        lastUpdate: Date.now()
      });
    }
    
    const current = this.realTimeMetrics.get(server);
    
    // Update metrics
    if (metrics.tokenUsage) current.tokenUsage += metrics.tokenUsage;
    if (metrics.cost) current.cost += metrics.cost;
    if (metrics.qualityScore) {
      current.qualityScore = (current.qualityScore + metrics.qualityScore) / 2;
    }
    if (metrics.responseTime) {
      current.responseTime = (current.responseTime + metrics.responseTime) / 2;
    }
    current.operationCount++;
    current.lastUpdate = Date.now();
    
    this.realTimeMetrics.set(server, current);
  }

  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring() {
    // Monitor every 30 seconds
    setInterval(() => {
      this.generateRealTimeReport();
    }, 30000);
    
    piiSafeLogger.info('MCP Analytics real-time monitoring started');
  }

  /**
   * Generate real-time report
   */
  async generateRealTimeReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        servers: {},
        totals: {
          tokenUsage: 0,
          cost: 0,
          operations: 0,
          avgQuality: 0,
          avgResponseTime: 0
        }
      };
      
      let serverCount = 0;
      
      for (const [server, metrics] of this.realTimeMetrics.entries()) {
        report.servers[server] = { ...metrics };
        report.totals.tokenUsage += metrics.tokenUsage;
        report.totals.cost += metrics.cost;
        report.totals.operations += metrics.operationCount;
        report.totals.avgQuality += metrics.qualityScore;
        report.totals.avgResponseTime += metrics.responseTime;
        serverCount++;
      }
      
      // Calculate averages
      if (serverCount > 0) {
        report.totals.avgQuality /= serverCount;
        report.totals.avgResponseTime /= serverCount;
      }
      
      this.emit('realTimeReport', report);
    } catch (error) {
      piiSafeLogger.error('Failed to generate real-time report', {
        error: error.message
      });
    }
  }

  /**
   * Get timeframe in milliseconds
   * @param {string} timeframe - 'hour', 'day', 'week', 'month'
   */
  getTimeframeMs(timeframe) {
    const timeframes = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };
    
    return timeframes[timeframe] || timeframes.day;
  }

  /**
   * Generate recommendations based on analytics
   * @param {Object} report - Health report
   */
  generateRecommendations(report) {
    const recommendations = [];
    
    // Token efficiency recommendations
    if (report.summary.tokenEfficiency.tokenEfficiencyScore < 80) {
      recommendations.push({
        category: 'efficiency',
        priority: 'high',
        title: 'Optimize Token Usage',
        description: 'Token efficiency is below optimal levels',
        actions: [
          'Review and optimize prompts for conciseness',
          'Implement prompt caching where applicable',
          'Consider switching to more efficient models'
        ],
        impact: 'Could reduce costs by 15-30%'
      });
    }
    
    // Quality recommendations
    if (report.summary.responseQuality.overallQualityScore < 0.85) {
      recommendations.push({
        category: 'quality',
        priority: 'medium',
        title: 'Improve Response Quality',
        description: 'Response quality is below target levels',
        actions: [
          'Review and update AI prompts',
          'Implement quality feedback loops',
          'Add more comprehensive testing'
        ],
        impact: 'Improve user satisfaction and accuracy'
      });
    }
    
    // Cost optimization recommendations
    if (report.summary.costAnalysis.projectedMonthlyCost > 1000) {
      recommendations.push({
        category: 'cost',
        priority: 'high',
        title: 'Optimize Operating Costs',
        description: 'Monthly costs are projected to exceed budget',
        actions: [
          'Implement cost monitoring alerts',
          'Consider model alternatives for non-critical operations',
          'Optimize high-cost operations'
        ],
        impact: `Potential savings: $${(report.summary.costAnalysis.projectedMonthlyCost * 0.2).toFixed(2)}/month`
      });
    }
    
    return recommendations;
  }

  // Helper methods with mock implementations
  async calculateUptimeStats(startTime) {
    return {
      uptimePercentage: 99.5,
      totalOperations: 1234,
      successRate: 0.995
    };
  }
  
  async analyzeQualityTrends(startTime) {
    return {
      qualityImproving: true,
      responseTimeImproving: true
    };
  }
  
  async analyzeCostTrends(startTime) {
    return {
      increasing: false,
      percentageChange: -5.2
    };
  }
  
  async getServerDetailedMetrics(serverKey, startTime) {
    const metrics = this.realTimeMetrics.get(serverKey) || {
      tokenUsage: 0,
      cost: 0,
      operationCount: 0,
      qualityScore: 0.85,
      responseTime: 1200
    };
    
    return {
      server: serverKey,
      totalTokens: metrics.tokenUsage,
      totalCost: metrics.cost,
      operations: metrics.operationCount,
      qualityScore: metrics.qualityScore,
      avgResponseTime: metrics.responseTime,
      uptime: 99.5,
      errorRate: 0.005
    };
  }
  
  async analyzeTrends(startTime) {
    return {
      tokenUsage: { trend: 'stable', change: 2.3 },
      quality: { trend: 'improving', change: 5.1 },
      cost: { trend: 'decreasing', change: -3.7 },
      responseTime: { trend: 'improving', change: -8.2 }
    };
  }
  
  async getAlertsSummary(startTime) {
    return {
      total: 3,
      critical: 0,
      warning: 2,
      info: 1,
      resolved: 1
    };
  }

  /**
   * Get real-time metrics for a specific server
   * @param {string} server - Server name
   */
  getRealTimeMetrics(server) {
    return this.realTimeMetrics.get(server) || null;
  }

  /**
   * Get all real-time metrics
   */
  getAllRealTimeMetrics() {
    return Object.fromEntries(this.realTimeMetrics);
  }

  /**
   * Reset metrics for a server
   * @param {string} server - Server name
   */
  resetServerMetrics(server) {
    this.realTimeMetrics.delete(server);
    piiSafeLogger.info(`Metrics reset for server: ${server}`);
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary() {
    const summary = {
      totalServers: this.realTimeMetrics.size,
      totalOperations: 0,
      totalCost: 0,
      totalTokens: 0,
      avgQuality: 0,
      avgResponseTime: 0
    };
    
    let serverCount = 0;
    for (const metrics of this.realTimeMetrics.values()) {
      summary.totalOperations += metrics.operationCount;
      summary.totalCost += metrics.cost;
      summary.totalTokens += metrics.tokenUsage;
      summary.avgQuality += metrics.qualityScore;
      summary.avgResponseTime += metrics.responseTime;
      serverCount++;
    }
    
    if (serverCount > 0) {
      summary.avgQuality /= serverCount;
      summary.avgResponseTime /= serverCount;
    }
    
    return summary;
  }
}

// Singleton instance
export const mcpAnalytics = new MCPAnalytics();

export default MCPAnalytics;