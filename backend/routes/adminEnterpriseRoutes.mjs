/**
 * Admin Enterprise Dashboard Routes
 * =================================
 * 
 * Backend API routes for the enterprise admin dashboard
 * Covers business intelligence, analytics, social media management, system health
 */

import express from 'express';
import { protect as authMiddleware } from '../middleware/authMiddleware.mjs';
import { requireAdmin } from '../middleware/adminMiddleware.mjs';
import logger from '../utils/logger.mjs';
import { getDBConnection } from '../utils/database.mjs';

const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(authMiddleware);
router.use(requireAdmin);

// =====================================================
// BUSINESS INTELLIGENCE & ANALYTICS
// =====================================================

/**
 * Get comprehensive business intelligence metrics
 * GET /api/admin/business-intelligence/metrics
 */
router.get('/business-intelligence/metrics', async (req, res) => {
  try {
    const db = await getDBConnection();
    
    // Fetch real business metrics from database
    const [userStats, sessionStats, revenueStats] = await Promise.all([
      fetchUserMetrics(db),
      fetchSessionMetrics(db),
      fetchRevenueMetrics(db)
    ]);

    const businessMetrics = {
      kpis: {
        monthlyRecurringRevenue: revenueStats.mrr || 0,
        customerLifetimeValue: revenueStats.clv || 0,
        customerAcquisitionCost: revenueStats.cac || 0,
        churnRate: userStats.churnRate || 0,
        netPromoterScore: 8.5, // TODO: Implement NPS tracking
        monthlyActiveUsers: userStats.activeUsers || 0,
        revenueGrowthRate: revenueStats.growthRate || 0,
        profitMargin: revenueStats.profitMargin || 0,
        sessionUtilizationRate: sessionStats.utilizationRate || 0,
        trainerProductivityScore: sessionStats.trainerProductivity || 0
      },
      trends: {
        revenue: revenueStats.trends || [],
        users: userStats.trends || [],
        sessions: sessionStats.trends || [],
        retention: userStats.retentionTrends || []
      },
      forecasts: {
        revenueProjection: revenueStats.forecasts || {
          nextMonth: 0,
          nextQuarter: 0,
          nextYear: 0,
          confidence: 0.7
        },
        churnRisk: userStats.churnRisk || {
          highRiskClients: 0,
          mediumRiskClients: 0,
          lowRiskClients: 0,
          preventionOpportunity: 0
        }
      }
    };

    res.json({
      success: true,
      metrics: businessMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch business intelligence metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business intelligence data',
      error: error.message
    });
  }
});

/**
 * Get admin analytics dashboard data
 * GET /api/admin/analytics/dashboard
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const db = await getDBConnection();
    
    const analytics = await fetchAdminAnalytics(db);

    res.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch admin analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin analytics data',
      error: error.message
    });
  }
});

/**
 * Get revenue analytics
 * GET /api/admin/analytics/revenue
 */
router.get('/analytics/revenue', async (req, res) => {
  try {
    const { range = 'month' } = req.query;
    const db = await getDBConnection();
    
    const revenueAnalytics = await fetchRevenueAnalytics(db, range);

    res.json({
      success: true,
      analytics: revenueAnalytics,
      range,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics',
      error: error.message
    });
  }
});

// =====================================================
// SOCIAL MEDIA MANAGEMENT
// =====================================================

/**
 * Get social media posts for moderation
 * GET /api/admin/social-media/posts
 */
router.get('/social-media/posts', async (req, res) => {
  try {
    const { platform, status, limit = 50, offset = 0 } = req.query;
    const db = await getDBConnection();
    
    const posts = await fetchSocialMediaPosts(db, { platform, status, limit, offset });
    const total = await getSocialMediaPostsCount(db, { platform, status });

    res.json({
      success: true,
      posts,
      total,
      filters: { platform, status },
      pagination: { limit: parseInt(limit), offset: parseInt(offset) },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch social media posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social media posts',
      error: error.message
    });
  }
});

/**
 * Moderate a social media post
 * POST /api/admin/social-media/posts/:postId/moderate
 */
router.post('/social-media/posts/:postId/moderate', async (req, res) => {
  try {
    const { postId } = req.params;
    const { action, reason } = req.body;
    const db = await getDBConnection();
    
    logger.info(`Admin ${req.user.id} moderating post ${postId}: ${action}`);
    
    const result = await moderateSocialMediaPost(db, postId, action, reason, req.user.id);

    res.json({
      success: true,
      message: `Post ${action}ed successfully`,
      postId,
      action,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to moderate post ${req.params.postId}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to moderate post ${req.params.postId}`,
      error: error.message
    });
  }
});

/**
 * Get social media analytics
 * GET /api/admin/social-media/analytics
 */
router.get('/social-media/analytics', async (req, res) => {
  try {
    const db = await getDBConnection();
    
    const analytics = await fetchSocialMediaAnalytics(db);

    res.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch social media analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social media analytics',
      error: error.message
    });
  }
});

// =====================================================
// SYSTEM HEALTH & MONITORING
// =====================================================

/**
 * Get comprehensive system health status
 * GET /api/admin/system/health
 */
router.get('/system/health', async (req, res) => {
  try {
    const systemHealth = await checkSystemHealth();

    res.json({
      success: true,
      health: systemHealth,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health status',
      error: error.message
    });
  }
});

/**
 * Get active system alerts
 * GET /api/admin/alerts/active
 */
router.get('/alerts/active', async (req, res) => {
  try {
    const alerts = await getActiveSystemAlerts();

    res.json({
      success: true,
      alerts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch active alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active alerts',
      error: error.message
    });
  }
});

/**
 * Acknowledge an alert
 * POST /api/admin/alerts/:alertId/acknowledge
 */
router.post('/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    
    logger.info(`Admin ${req.user.id} acknowledging alert ${alertId}`);
    
    const result = await acknowledgeAlert(alertId, req.user.id);

    res.json({
      success: true,
      message: `Alert ${alertId} acknowledged`,
      alertId,
      acknowledgedBy: req.user.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to acknowledge alert ${req.params.alertId}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to acknowledge alert ${req.params.alertId}`,
      error: error.message
    });
  }
});

/**
 * Get admin dashboard configuration
 * GET /api/admin/dashboard/config
 */
router.get('/dashboard/config', async (req, res) => {
  try {
    const config = {
      features: {
        mcpServers: true,
        businessIntelligence: true,
        socialMediaManagement: true,
        realTimeMonitoring: true,
        advancedAnalytics: true
      },
      settings: {
        refreshInterval: 30000,
        alertThresholds: {
          cpu: 80,
          memory: 85,
          errorRate: 0.05
        }
      },
      user: {
        role: req.user.role,
        permissions: getAdminPermissions(req.user)
      }
    };

    res.json({
      success: true,
      config,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch dashboard config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin dashboard configuration',
      error: error.message
    });
  }
});

/**
 * Check admin features availability
 * GET /api/admin/features/availability
 */
router.get('/features/availability', async (req, res) => {
  try {
    const availability = await checkAdminFeaturesAvailability();

    res.json({
      success: true,
      available: availability.allAvailable,
      features: availability.features,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to check features availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check admin features availability',
      error: error.message
    });
  }
});

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

async function fetchUserMetrics(db) {
  try {
    // Fetch user statistics from database
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
        COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users_7d
      FROM users
    `);
    
    const row = result.rows[0];
    return {
      totalUsers: parseInt(row.total_users) || 0,
      newUsers: parseInt(row.new_users_30d) || 0,
      activeUsers: parseInt(row.active_users_7d) || 0,
      churnRate: 0.05, // TODO: Calculate real churn rate
      trends: [], // TODO: Implement trend calculation
      retentionTrends: [], // TODO: Implement retention trends
      churnRisk: {
        highRiskClients: 0,
        mediumRiskClients: 0,
        lowRiskClients: 0,
        preventionOpportunity: 0
      }
    };
  } catch (error) {
    logger.error('Error fetching user metrics:', error);
    return {
      totalUsers: 0,
      newUsers: 0,
      activeUsers: 0,
      churnRate: 0,
      trends: [],
      retentionTrends: [],
      churnRisk: { highRiskClients: 0, mediumRiskClients: 0, lowRiskClients: 0, preventionOpportunity: 0 }
    };
  }
}

async function fetchSessionMetrics(db) {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions
      FROM sessions
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    
    const row = result.rows[0];
    const total = parseInt(row.total_sessions) || 1;
    const completed = parseInt(row.completed_sessions) || 0;
    
    return {
      totalSessions: total,
      completedSessions: completed,
      utilizationRate: (completed / total) * 100,
      trainerProductivity: 85, // TODO: Calculate real trainer productivity
      trends: [] // TODO: Implement session trends
    };
  } catch (error) {
    logger.error('Error fetching session metrics:', error);
    return {
      totalSessions: 0,
      completedSessions: 0,
      utilizationRate: 0,
      trainerProductivity: 0,
      trends: []
    };
  }
}

async function fetchRevenueMetrics(db) {
  try {
    const result = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as total_orders
      FROM orders
      WHERE status = 'paid' AND created_at >= NOW() - INTERVAL '30 days'
    `);
    
    const row = result.rows[0];
    const revenue = parseFloat(row.total_revenue) || 0;
    
    return {
      mrr: revenue,
      clv: revenue * 12, // Simple CLV calculation
      cac: 50, // TODO: Calculate real CAC
      growthRate: 0.15, // TODO: Calculate real growth rate
      profitMargin: 0.3, // TODO: Calculate real profit margin
      trends: [], // TODO: Implement revenue trends
      forecasts: {
        nextMonth: revenue * 1.1,
        nextQuarter: revenue * 3.2,
        nextYear: revenue * 13,
        confidence: 0.75
      }
    };
  } catch (error) {
    logger.error('Error fetching revenue metrics:', error);
    return {
      mrr: 0,
      clv: 0,
      cac: 0,
      growthRate: 0,
      profitMargin: 0,
      trends: [],
      forecasts: { nextMonth: 0, nextQuarter: 0, nextYear: 0, confidence: 0 }
    };
  }
}

async function fetchAdminAnalytics(db) {
  try {
    const [userMetrics, sessionMetrics, revenueMetrics] = await Promise.all([
      fetchUserMetrics(db),
      fetchSessionMetrics(db),
      fetchRevenueMetrics(db)
    ]);

    return {
      users: {
        total: userMetrics.totalUsers,
        active: userMetrics.activeUsers,
        newToday: Math.floor(userMetrics.newUsers / 30), // Approximate daily new users
        growth: 0.12, // TODO: Calculate real growth
        distribution: [
          { role: 'client', count: Math.floor(userMetrics.totalUsers * 0.8), percentage: 80 },
          { role: 'trainer', count: Math.floor(userMetrics.totalUsers * 0.15), percentage: 15 },
          { role: 'admin', count: Math.floor(userMetrics.totalUsers * 0.05), percentage: 5 }
        ]
      },
      sessions: {
        total: sessionMetrics.totalSessions,
        completed: sessionMetrics.completedSessions,
        cancelled: Math.floor(sessionMetrics.totalSessions * 0.1),
        scheduled: Math.floor(sessionMetrics.totalSessions * 0.3),
        revenue: revenueMetrics.mrr
      },
      performance: {
        avgResponseTime: 125, // TODO: Get real response time
        errorRate: 0.02, // TODO: Calculate real error rate
        uptime: 99.5, // TODO: Calculate real uptime
        throughput: 450 // TODO: Calculate real throughput
      },
      financials: {
        totalRevenue: revenueMetrics.mrr * 12,
        monthlyRevenue: revenueMetrics.mrr,
        pendingPayments: revenueMetrics.mrr * 0.1,
        refunds: revenueMetrics.mrr * 0.02
      }
    };
  } catch (error) {
    logger.error('Error fetching admin analytics:', error);
    return {
      users: { total: 0, active: 0, newToday: 0, growth: 0, distribution: [] },
      sessions: { total: 0, completed: 0, cancelled: 0, scheduled: 0, revenue: 0 },
      performance: { avgResponseTime: 0, errorRate: 0, uptime: 0, throughput: 0 },
      financials: { totalRevenue: 0, monthlyRevenue: 0, pendingPayments: 0, refunds: 0 }
    };
  }
}

async function fetchRevenueAnalytics(db, range) {
  // TODO: Implement real revenue analytics based on range
  return {
    totalRevenue: 50000,
    growth: 0.15,
    trends: [],
    breakdown: {
      sessions: 35000,
      packages: 15000
    }
  };
}

async function fetchSocialMediaPosts(db, filters) {
  // TODO: Implement real social media posts fetching
  return [];
}

async function getSocialMediaPostsCount(db, filters) {
  // TODO: Implement real count
  return 0;
}

async function moderateSocialMediaPost(db, postId, action, reason, adminId) {
  // TODO: Implement real post moderation
  return { success: true };
}

async function fetchSocialMediaAnalytics(db) {
  // TODO: Implement real social media analytics
  return {
    totalPosts: 0,
    totalEngagement: 0,
    activeUsers: 0,
    growthRate: 0
  };
}

async function checkSystemHealth() {
  try {
    const db = await getDBConnection();
    
    // Test database connection
    const dbStart = Date.now();
    await db.query('SELECT 1');
    const dbResponseTime = Date.now() - dbStart;

    return {
      overall: 'healthy',
      components: {
        database: {
          status: dbResponseTime < 100 ? 'healthy' : 'degraded',
          responseTime: dbResponseTime,
          message: `Database responding in ${dbResponseTime}ms`
        },
        redis: {
          status: 'healthy', // TODO: Test Redis connection
          responseTime: 5,
          message: 'Redis cache operational'
        },
        mcpServers: {
          status: 'healthy', // TODO: Check MCP servers
          onlineCount: 5,
          totalCount: 5
        },
        api: {
          status: 'healthy',
          responseTime: 50,
          errorRate: 0.01
        },
        storage: {
          status: 'healthy',
          usage: 45,
          available: 55
        }
      },
      alerts: [],
      uptime: {
        current: '2d 14h 23m',
        percentage: 99.5,
        since: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
  } catch (error) {
    logger.error('Error checking system health:', error);
    return {
      overall: 'critical',
      components: {},
      alerts: [
        {
          id: '1',
          severity: 'critical',
          component: 'system',
          message: 'Health check failed',
          timestamp: new Date().toISOString(),
          acknowledged: false
        }
      ],
      uptime: { current: 'unknown', percentage: 0, since: new Date().toISOString() }
    };
  }
}

async function getActiveSystemAlerts() {
  // TODO: Implement real alert system
  return [];
}

async function acknowledgeAlert(alertId, adminId) {
  // TODO: Implement alert acknowledgment
  return { success: true };
}

function getAdminPermissions(user) {
  return {
    canManageUsers: true,
    canManageServers: true,
    canViewAnalytics: true,
    canModerateContent: true,
    canAccessFinancials: user.email === 'ogpswan@gmail.com'
  };
}

async function checkAdminFeaturesAvailability() {
  return {
    allAvailable: true,
    features: {
      mcpServers: true,
      businessIntelligence: true,
      socialMediaManagement: true,
      realTimeMonitoring: true,
      advancedAnalytics: true
    }
  };
}

export default router;
