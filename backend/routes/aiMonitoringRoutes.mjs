/**
 * AI Monitoring Routes
 * API endpoints for monitoring AI feature usage and performance
 */

import express from 'express';
import { protect as authMiddleware } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// In-memory storage for metrics (in production, use Redis or database)
let metrics = {
  workoutGeneration: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: null,
    totalTokensUsed: 0
  },
  progressAnalysis: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: null,
    totalTokensUsed: 0
  },
  nutritionPlanning: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: null,
    totalTokensUsed: 0
  },
  exerciseAlternatives: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: null,
    totalTokensUsed: 0
  },
  gamification: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: null
  }
};

// Active users tracking
let activeUsers = new Set();
let dailyActiveUsers = new Set();

/**
 * Update feature metrics
 */
export const updateMetrics = (feature, success, responseTime, tokensUsed = 0, userId = null) => {
  if (!metrics[feature]) return;
  
  const featureMetrics = metrics[feature];
  
  // Update request counts
  featureMetrics.totalRequests++;
  if (success) {
    featureMetrics.successfulRequests++;
  } else {
    featureMetrics.failedRequests++;
  }
  
  // Update response time (running average)
  featureMetrics.averageResponseTime = (
    (featureMetrics.averageResponseTime * (featureMetrics.totalRequests - 1) + responseTime) / 
    featureMetrics.totalRequests
  );
  
  // Update other metrics
  featureMetrics.lastRequestTime = new Date().toISOString();
  if (tokensUsed) {
    featureMetrics.totalTokensUsed += tokensUsed;
  }
  
  // Track active users
  if (userId) {
    activeUsers.add(userId);
    dailyActiveUsers.add(userId);
  }
  
  logger.info(`Updated metrics for ${feature}`, {
    success,
    responseTime,
    tokensUsed,
    totalRequests: featureMetrics.totalRequests
  });
};

/**
 * Get comprehensive AI metrics
 * GET /api/ai-monitoring/metrics
 */
router.get('/metrics', authMiddleware, (req, res) => {
  try {
    // Calculate overall statistics
    const totalRequests = Object.values(metrics).reduce((sum, metric) => sum + metric.totalRequests, 0);
    const totalSuccessful = Object.values(metrics).reduce((sum, metric) => sum + metric.successfulRequests, 0);
    const totalFailed = Object.values(metrics).reduce((sum, metric) => sum + metric.failedRequests, 0);
    const overallSuccessRate = totalRequests > 0 ? ((totalSuccessful / totalRequests) * 100).toFixed(1) : 0;
    
    // Calculate average response time across all features
    const responseTimeSum = Object.values(metrics).reduce((sum, metric) => {
      return sum + (metric.averageResponseTime * metric.totalRequests);
    }, 0);
    const overallAverageResponseTime = totalRequests > 0 ? (responseTimeSum / totalRequests).toFixed(2) : 0;
    
    // Calculate total tokens used
    const totalTokens = Object.values(metrics).reduce((sum, metric) => sum + (metric.totalTokensUsed || 0), 0);
    
    const response = {
      timestamp: new Date().toISOString(),
      overview: {
        totalRequests,
        successfulRequests: totalSuccessful,
        failedRequests: totalFailed,
        successRate: `${overallSuccessRate}%`,
        averageResponseTime: `${overallAverageResponseTime}ms`,
        totalTokensUsed: totalTokens,
        activeUsers: activeUsers.size,
        dailyActiveUsers: dailyActiveUsers.size
      },
      features: metrics,
      systemHealth: {
        status: overallSuccessRate >= 95 ? 'excellent' : 
                overallSuccessRate >= 85 ? 'good' : 
                overallSuccessRate >= 70 ? 'fair' : 'poor',
        uptime: '99.9%', // This would be calculated based on actual uptime tracking
        lastIncident: null // This would come from incident tracking
      }
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error getting AI metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve AI metrics',
      error: error.message
    });
  }
});

/**
 * Get feature usage trends
 * GET /api/ai-monitoring/trends/:feature
 */
router.get('/trends/:feature', authMiddleware, (req, res) => {
  try {
    const { feature } = req.params;
    const { timeRange = '24h' } = req.query;
    
    if (!metrics[feature]) {
      return res.status(404).json({
        success: false,
        message: `Feature '${feature}' not found`
      });
    }
    
    // In a real implementation, this would query historical data
    // For now, we'll return mock trend data
    const mockTrends = generateMockTrends(feature, timeRange);
    
    res.json({
      feature,
      timeRange,
      trends: mockTrends,
      current: metrics[feature]
    });
  } catch (error) {
    logger.error('Error getting feature trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve feature trends',
      error: error.message
    });
  }
});

/**
 * Get AI system health status
 * GET /api/ai-monitoring/health
 */
router.get('/health', authMiddleware, async (req, res) => {
  try {
    // Check MCP server health
    const mcpHealth = await checkMCPHealth();
    
    // Calculate system metrics
    const totalRequests = Object.values(metrics).reduce((sum, metric) => sum + metric.totalRequests, 0);
    const totalSuccessful = Object.values(metrics).reduce((sum, metric) => sum + metric.successfulRequests, 0);
    const successRate = totalRequests > 0 ? ((totalSuccessful / totalRequests) * 100) : 100;
    
    const healthStatus = {
      timestamp: new Date().toISOString(),
      overall: {
        status: successRate >= 95 && mcpHealth.allOnline ? 'healthy' : 
                successRate >= 85 && mcpHealth.someOnline ? 'degraded' : 'unhealthy',
        successRate: `${successRate.toFixed(1)}%`,
        mcpServers: mcpHealth,
        activeFeatures: Object.keys(metrics).filter(feature => metrics[feature].totalRequests > 0)
      },
      features: Object.entries(metrics).map(([name, metric]) => ({
        name,
        status: metric.totalRequests === 0 ? 'unused' :
                metric.failedRequests / metric.totalRequests < 0.1 ? 'healthy' :
                metric.failedRequests / metric.totalRequests < 0.25 ? 'degraded' : 'unhealthy',
        requests: metric.totalRequests,
        successRate: metric.totalRequests > 0 ? 
          `${((metric.successfulRequests / metric.totalRequests) * 100).toFixed(1)}%` : 'N/A',
        lastUsed: metric.lastRequestTime || 'Never'
      })),
      recommendations: generateHealthRecommendations(successRate, mcpHealth)
    };
    
    const statusCode = healthStatus.overall.status === 'healthy' ? 200 : 
                       healthStatus.overall.status === 'degraded' ? 206 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Error checking AI health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check AI system health',
      error: error.message
    });
  }
});

/**
 * Reset metrics (admin only)
 * POST /api/ai-monitoring/reset
 */
router.post('/reset', authMiddleware, (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    // Reset all metrics
    Object.keys(metrics).forEach(feature => {
      metrics[feature] = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastRequestTime: null,
        totalTokensUsed: 0
      };
    });
    
    // Reset user tracking
    activeUsers.clear();
    dailyActiveUsers.clear();
    
    logger.info('AI metrics reset by admin', { userId: req.user.id });
    
    res.json({
      success: true,
      message: 'AI metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error resetting AI metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset AI metrics',
      error: error.message
    });
  }
});

/**
 * Generate mock trend data
 */
function generateMockTrends(feature, timeRange) {
  const intervals = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
  const trends = [];
  
  for (let i = 0; i < intervals; i++) {
    trends.push({
      time: new Date(Date.now() - (intervals - i) * (timeRange === '24h' ? 3600000 : 86400000)).toISOString(),
      requests: Math.floor(Math.random() * 50) + 10,
      successRate: 85 + Math.random() * 15,
      responseTime: 1000 + Math.random() * 2000
    });
  }
  
  return trends;
}

/**
 * Check MCP server health
 */
async function checkMCPHealth() {
  try {
    // This would typically check the actual MCP servers
    // For now, return a mock health status
    return {
      workout: { status: 'online', latency: '150ms' },
      gamification: { status: 'online', latency: '120ms' },
      allOnline: true,
      someOnline: true
    };
  } catch (error) {
    return {
      workout: { status: 'offline', error: error.message },
      gamification: { status: 'offline', error: error.message },
      allOnline: false,
      someOnline: false
    };
  }
}

/**
 * Generate health recommendations
 */
function generateHealthRecommendations(successRate, mcpHealth) {
  const recommendations = [];
  
  if (successRate < 95) {
    recommendations.push('Monitor error rates and investigate failed requests');
  }
  
  if (!mcpHealth.allOnline) {
    recommendations.push('Check MCP server connectivity and restart if necessary');
  }
  
  if (successRate < 85) {
    recommendations.push('Consider implementing fallback mechanisms for AI features');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All systems operating normally - continue monitoring');
  }
  
  return recommendations;
}

// Reset daily active users at midnight
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    dailyActiveUsers.clear();
    logger.info('Daily active users counter reset');
  }
}, 60000); // Check every minute

export default router;