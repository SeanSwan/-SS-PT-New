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
import { getClient, query } from '../utils/database.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';
const NOT_IMPLEMENTED = 'not_implemented';

const parseBoundedInteger = (value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
};

const sendFailure = (res, statusCode, message, error = INTERNAL_ERROR) => res.status(statusCode).json({
  success: false,
  message,
  error
});

// Apply authentication and admin middleware to all routes
router.use(authMiddleware);
router.use(requireAdmin);

const ADMIN_ENTERPRISE_FEATURE_FLAGS = Object.freeze({
  mcpServers: false,
  businessIntelligence: true,
  socialMediaManagement: false,
  realTimeMonitoring: false,
  advancedAnalytics: false
});

// =====================================================
// BUSINESS INTELLIGENCE & ANALYTICS
// =====================================================

/**
 * Get comprehensive business intelligence metrics
 * GET /api/admin/business-intelligence/metrics
 */
router.get('/business-intelligence/metrics', async (req, res) => {
  try {
    // Fetch real business metrics from database
    const [userStats, sessionStats, revenueStats] = await Promise.all([
      fetchUserMetrics(),
      fetchSessionMetrics(),
      fetchRevenueMetrics()
    ]);

    const businessMetrics = {
      kpis: {
        monthlyRecurringRevenue: revenueStats.mrr || 0,
        customerLifetimeValue: revenueStats.clv || 0,
        customerAcquisitionCost: revenueStats.cac || 0,
        churnRate: userStats.churnRate || 0,
        netPromoterScore: null, // Not yet tracked — requires NPS survey implementation
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
    sendFailure(res, 500, 'Failed to fetch business intelligence data');
  }
});

/**
 * Get admin analytics dashboard data
 * GET /api/admin/analytics/dashboard
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const analytics = await fetchAdminAnalytics();

    res.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch admin analytics:', error);
    sendFailure(res, 500, 'Failed to fetch admin analytics data');
  }
});

// NOTE: Revenue analytics endpoint removed — canonical version is in analyticsRevenueRoutes.mjs

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
    const parsedLimit = parseBoundedInteger(limit, 50, { min: 1, max: 100 });
    const parsedOffset = parseBoundedInteger(offset, 0, { min: 0, max: 10000 });

    if (parsedLimit === null || parsedOffset === null) {
      return res.status(400).json({
        success: false,
        message: 'Limit and offset must be bounded integers'
      });
    }
    
    const posts = await fetchSocialMediaPosts({ platform, status, limit: parsedLimit, offset: parsedOffset });
    const total = await getSocialMediaPostsCount({ platform, status });

    res.json({
      success: true,
      posts,
      total,
      providerConnected: false,
      source: 'not_connected',
      filters: { platform, status },
      pagination: { limit: parsedLimit, offset: parsedOffset },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch social media posts:', error);
    sendFailure(res, 500, 'Failed to fetch social media posts');
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
    
    logger.info(`Admin ${req.user.id} moderating post ${postId}: ${action}`);
    
    const result = await moderateSocialMediaPost(postId, action, reason, req.user.id);

    res.status(result.statusCode || 200).json(result);

  } catch (error) {
    logger.error(`Failed to moderate post ${req.params.postId}:`, error);
    const statusCode = error.statusCode || 500;
    const isNotImplemented = statusCode === 501;
    sendFailure(
      res,
      statusCode,
      isNotImplemented ? error.message : `Failed to moderate post ${req.params.postId}`,
      isNotImplemented ? NOT_IMPLEMENTED : INTERNAL_ERROR
    );
  }
});

/**
 * Get social media analytics
 * GET /api/admin/social-media/analytics
 */
router.get('/social-media/analytics', async (req, res) => {
  try {
    const analytics = await fetchSocialMediaAnalytics();

    res.json({
      success: true,
      analytics,
      providerConnected: false,
      source: 'not_connected',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch social media analytics:', error);
    sendFailure(res, 500, 'Failed to fetch social media analytics');
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
    sendFailure(res, 500, 'Failed to fetch system health status');
  }
});

// SWA-138 S4: the /alerts/active + /alerts/:id/acknowledge stubs (empty list +
// 501 thrower, zero UI consumers) are RETIRED. Per-admin ack/archive now lives
// at /api/admin/alert-state (adminAlertStateRoutes.mjs); AI-monitoring alerts
// keep their own engine at aiMonitoringRoutes.mjs.

/**
 * Get admin dashboard configuration
 * GET /api/admin/dashboard/config
 */
router.get('/dashboard/config', async (req, res) => {
  try {
    const config = {
      features: ADMIN_ENTERPRISE_FEATURE_FLAGS,
      featureDetails: {
        verificationStatus: 'partially_verified',
        notes: {
          businessIntelligence: 'Backed by database queries in this route.',
          socialMediaManagement: 'Read/moderation provider is not connected.',
          realTimeMonitoring: 'APM and alert store are not connected.',
          advancedAnalytics: 'Advanced analytics instrumentation is not connected.'
        }
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
    sendFailure(res, 500, 'Failed to fetch admin dashboard configuration');
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
      verificationStatus: availability.verificationStatus,
      details: availability.details,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to check features availability:', error);
    sendFailure(res, 500, 'Failed to check admin features availability');
  }
});

// =====================================================
// MCP SERVER MANAGEMENT (decommissioned)
// =====================================================
const retiredMcpManagementResponse = (res) => res.status(410).json({
  success: false,
  status: 'retired',
  message: 'MCP server management is retired. SwanStudios uses first-party APIs instead.',
  replacements: ['/api/workout', '/api/v1/gamification', '/api/social', '/api/client/analytics'],
  timestamp: new Date().toISOString()
});

router.all('/mcp-servers', (_req, res) => retiredMcpManagementResponse(res));
router.all('/mcp-servers/*', (_req, res) => retiredMcpManagementResponse(res));

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function createNotImplementedError(message) {
  const error = new Error(message);
  error.statusCode = 501;
  return error;
}

async function fetchUserMetrics() {
  try {
    // Real user statistics from database
    const result = await query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
        COUNT(CASE WHEN "updatedAt" >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users_7d,
        COUNT(CASE WHEN "updatedAt" < NOW() - INTERVAL '60 days' AND role = 'client' THEN 1 END) as churned_clients,
        COUNT(CASE WHEN role = 'client' THEN 1 END) as total_clients
      FROM "Users"
    `);

    const row = result.rows[0];
    const totalClients = parseInt(row.total_clients) || 1;
    const churned = parseInt(row.churned_clients) || 0;

    // Real churn risk: clients inactive for different periods
    const churnRiskResult = await query(`
      SELECT
        COUNT(CASE WHEN "updatedAt" < NOW() - INTERVAL '30 days' AND "updatedAt" >= NOW() - INTERVAL '60 days' THEN 1 END) as medium_risk,
        COUNT(CASE WHEN "updatedAt" < NOW() - INTERVAL '60 days' THEN 1 END) as high_risk,
        COUNT(CASE WHEN "updatedAt" >= NOW() - INTERVAL '30 days' THEN 1 END) as low_risk
      FROM "Users" WHERE role = 'client'
    `);
    const cr = churnRiskResult.rows[0];

    // Real monthly user trends (last 6 months)
    const trendsResult = await query(`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as new_users
      FROM "Users"
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `);

    return {
      totalUsers: parseInt(row.total_users) || 0,
      newUsers: parseInt(row.new_users_30d) || 0,
      activeUsers: parseInt(row.active_users_7d) || 0,
      churnRate: totalClients > 0 ? Math.round((churned / totalClients) * 10000) / 10000 : 0,
      trends: trendsResult.rows.map(r => ({ month: r.month, newUsers: parseInt(r.new_users) })),
      retentionTrends: [],
      churnRisk: {
        highRiskClients: parseInt(cr.high_risk) || 0,
        mediumRiskClients: parseInt(cr.medium_risk) || 0,
        lowRiskClients: parseInt(cr.low_risk) || 0,
        preventionOpportunity: (parseInt(cr.medium_risk) || 0) + (parseInt(cr.high_risk) || 0)
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

async function fetchSessionMetrics() {
  try {
    const result = await query(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status IN ('completed', 'cancelled', 'scheduled') THEN 1 END) as utilization_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_sessions,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_sessions
      FROM sessions
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    `);

    const row = result.rows[0];
    const total = parseInt(row.total_sessions) || 1;
    const utilizationTotal = parseInt(row.utilization_sessions) || 0;
    const completed = parseInt(row.completed_sessions) || 0;
    const cancelled = parseInt(row.cancelled_sessions) || 0;

    // Real trainer productivity: completed sessions / available sessions per trainer
    const trainerResult = await query(`
      SELECT
        COUNT(DISTINCT t.id) as trainer_count,
        COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed
      FROM "Users" t
      LEFT JOIN sessions s ON s."trainerId" = t.id
        AND s."createdAt" >= NOW() - INTERVAL '30 days'
      WHERE t.role = 'trainer'
    `);
    const tr = trainerResult.rows[0];
    const trainerCount = parseInt(tr.trainer_count) || 1;
    const trainerCompleted = parseInt(tr.completed) || 0;
    // Productivity = avg completed sessions per trainer / expected 20 sessions per month * 100
    const trainerProductivity = Math.round((trainerCompleted / trainerCount / 20) * 100);

    // Session trends (last 6 months)
    const trendsResult = await query(`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM sessions
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `);

    return {
      totalSessions: total,
      completedSessions: completed,
      cancelledSessions: cancelled,
      scheduledSessions: parseInt(row.scheduled_sessions) || 0,
      utilizationRate: utilizationTotal > 0 ? Math.round((completed / utilizationTotal) * 100) : 0,
      trainerProductivity: Math.min(trainerProductivity, 100),
      trends: trendsResult.rows.map(r => ({ month: r.month, total: parseInt(r.total), completed: parseInt(r.completed) }))
    };
  } catch (error) {
    logger.error('Error fetching session metrics:', error);
    return {
      totalSessions: 0,
      completedSessions: 0,
      cancelledSessions: 0,
      scheduledSessions: 0,
      utilizationRate: 0,
      trainerProductivity: 0,
      trends: []
    };
  }
}

async function fetchRevenueMetrics() {
  try {
    // Current month revenue
    const currentResult = await query(`
      SELECT
        COALESCE(SUM(CAST("totalAmount" AS NUMERIC)), 0) as current_revenue,
        COUNT(*) as current_orders
      FROM orders
      WHERE status = 'completed' AND "createdAt" >= DATE_TRUNC('month', NOW())
    `);

    // Previous month revenue (for growth rate)
    const prevResult = await query(`
      SELECT COALESCE(SUM(CAST("totalAmount" AS NUMERIC)), 0) as prev_revenue
      FROM orders
      WHERE status = 'completed'
        AND "createdAt" >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        AND "createdAt" < DATE_TRUNC('month', NOW())
    `);

    // Total lifetime revenue and client count for CLV + CAC
    const lifetimeResult = await query(`
      SELECT
        COALESCE(SUM(CAST("totalAmount" AS NUMERIC)), 0) as lifetime_revenue,
        COUNT(DISTINCT "userId") as paying_clients
      FROM orders
      WHERE status = 'completed'
    `);

    // Pending and refunded
    const pendingResult = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'pending' THEN CAST("totalAmount" AS NUMERIC) ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN CAST("totalAmount" AS NUMERIC) ELSE 0 END), 0) as refunded
      FROM orders
      WHERE "createdAt" >= DATE_TRUNC('month', NOW())
    `);

    // Revenue trends (last 6 months)
    const trendsResult = await query(`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COALESCE(SUM(CAST("totalAmount" AS NUMERIC)), 0) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE status = 'completed' AND "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `);

    const currentRevenue = parseFloat(currentResult.rows[0].current_revenue) || 0;
    const prevRevenue = parseFloat(prevResult.rows[0].prev_revenue) || 1;
    const lifetimeRevenue = parseFloat(lifetimeResult.rows[0].lifetime_revenue) || 0;
    const payingClients = parseInt(lifetimeResult.rows[0].paying_clients) || 1;
    const pending = parseFloat(pendingResult.rows[0].pending) || 0;
    const refunded = parseFloat(pendingResult.rows[0].refunded) || 0;

    const growthRate = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 10000) / 10000 : 0;
    const clv = Math.round((lifetimeRevenue / payingClients) * 100) / 100;
    // CAC = 0 if no paid marketing (organic platform)
    const cac = 0;
    // Profit margin estimate: revenue minus Stripe fees (2.9% + 30c) and hosting (~$50/mo)
    const stripeFees = currentRevenue * 0.029 + (parseInt(currentResult.rows[0].current_orders) || 0) * 0.30;
    const hostingCost = 50;
    const profitMargin = currentRevenue > 0 ? Math.round(((currentRevenue - stripeFees - hostingCost) / currentRevenue) * 10000) / 10000 : 0;

    return {
      mrr: currentRevenue,
      clv,
      cac,
      growthRate,
      profitMargin,
      pendingPayments: pending,
      refunds: refunded,
      trends: trendsResult.rows.map(r => ({ month: r.month, revenue: parseFloat(r.revenue), orders: parseInt(r.orders) })),
      forecasts: {
        nextMonth: Math.round(currentRevenue * (1 + growthRate)),
        nextQuarter: Math.round(currentRevenue * 3 * (1 + growthRate)),
        nextYear: Math.round(currentRevenue * 12 * (1 + growthRate)),
        confidence: trendsResult.rows.length >= 3 ? 0.8 : 0.5
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
      pendingPayments: 0,
      refunds: 0,
      trends: [],
      forecasts: { nextMonth: 0, nextQuarter: 0, nextYear: 0, confidence: 0 }
    };
  }
}

async function fetchAdminAnalytics() {
  try {
    const [userMetrics, sessionMetrics, revenueMetrics] = await Promise.all([
      fetchUserMetrics(),
      fetchSessionMetrics(),
      fetchRevenueMetrics()
    ]);

    // Real role distribution from database
    const roleResult = await query(`
      SELECT role, COUNT(*) as count
      FROM "Users"
      GROUP BY role
    `);
    const totalUsers = userMetrics.totalUsers || 1;
    const distribution = roleResult.rows.map(r => ({
      role: r.role,
      count: parseInt(r.count),
      percentage: Math.round((parseInt(r.count) / totalUsers) * 100)
    }));

    // Real new-today count
    const todayResult = await query(`
      SELECT COUNT(*) as new_today
      FROM "Users"
      WHERE "createdAt" >= DATE_TRUNC('day', NOW())
    `);

    // Real user growth: compare this month's new users vs last month's
    const growthResult = await query(`
      SELECT
        COUNT(CASE WHEN "createdAt" >= DATE_TRUNC('month', NOW()) THEN 1 END) as current_month,
        COUNT(CASE WHEN "createdAt" >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
                    AND "createdAt" < DATE_TRUNC('month', NOW()) THEN 1 END) as prev_month
      FROM "Users"
    `);
    const gr = growthResult.rows[0];
    const currMonthUsers = parseInt(gr.current_month) || 0;
    const prevMonthUsers = parseInt(gr.prev_month) || 1;
    const userGrowth = prevMonthUsers > 0
      ? Math.round(((currMonthUsers - prevMonthUsers) / prevMonthUsers) * 10000) / 10000
      : 0;

    // Real uptime: time since server started (process.uptime())
    const uptimeSeconds = process.uptime();
    const uptimePercent = Math.min(99.99, 100 - (0.01 * Math.max(0, 86400 - uptimeSeconds) / 86400));

    return {
      users: {
        total: userMetrics.totalUsers,
        active: userMetrics.activeUsers,
        newToday: parseInt(todayResult.rows[0].new_today) || 0,
        growth: userGrowth,
        distribution
      },
      sessions: {
        total: sessionMetrics.totalSessions,
        completed: sessionMetrics.completedSessions,
        cancelled: sessionMetrics.cancelledSessions,
        scheduled: sessionMetrics.scheduledSessions,
        revenue: revenueMetrics.mrr
      },
      performance: {
        avgResponseTime: null, // No APM installed — requires middleware instrumentation
        errorRate: null, // No error tracking aggregator — requires middleware instrumentation
        uptime: Math.round(uptimePercent * 100) / 100,
        throughput: null // No request counter — requires middleware instrumentation
      },
      financials: {
        totalRevenue: revenueMetrics.mrr * 12,
        monthlyRevenue: revenueMetrics.mrr,
        pendingPayments: revenueMetrics.pendingPayments,
        refunds: revenueMetrics.refunds
      }
    };
  } catch (error) {
    logger.error('Error fetching admin analytics:', error);
    return {
      users: { total: 0, active: 0, newToday: 0, growth: 0, distribution: [] },
      sessions: { total: 0, completed: 0, cancelled: 0, scheduled: 0, revenue: 0 },
      performance: { avgResponseTime: null, errorRate: null, uptime: 0, throughput: null },
      financials: { totalRevenue: 0, monthlyRevenue: 0, pendingPayments: 0, refunds: 0 }
    };
  }
}

async function fetchSocialMediaPosts(filters) {
  // Provider integration is not connected yet; return an explicitly labeled empty set.
  return [];
}

async function getSocialMediaPostsCount(filters) {
  // Provider integration is not connected yet; return an explicitly labeled empty count.
  return 0;
}

async function moderateSocialMediaPost(postId, action, reason, adminId) {
  throw createNotImplementedError('Social media moderation is not connected to a provider yet.');
}

async function fetchSocialMediaAnalytics() {
  return {
    providerConnected: false,
    source: 'not_connected',
    totalPosts: 0,
    totalEngagement: 0,
    activeUsers: 0,
    growthRate: 0
  };
}

async function checkSystemHealth() {
  try {
    // Test database connection
    const dbStart = Date.now();
    await query('SELECT 1');
    const dbResponseTime = Date.now() - dbStart;

    return {
      overall: dbResponseTime < 100 ? 'partially_verified' : 'degraded',
      healthVerified: false,
      components: {
        database: {
          status: dbResponseTime < 100 ? 'healthy' : 'degraded',
          healthVerified: true,
          responseTime: dbResponseTime,
          message: `Database responding in ${dbResponseTime}ms`
        },
        redis: {
          status: 'not_checked',
          verificationStatus: 'not_checked',
          healthVerified: false,
          responseTime: null,
          message: 'Redis health is not verified by this route.'
        },
        mcpServers: {
          status: 'decommissioned',
          onlineCount: 0,
          totalCount: 0
        },
        api: {
          status: 'not_instrumented',
          verificationStatus: 'not_checked',
          healthVerified: false,
          responseTime: null,
          errorRate: null
        },
        storage: {
          status: 'not_checked',
          verificationStatus: 'not_checked',
          healthVerified: false,
          usage: null,
          available: null
        }
      },
      alerts: [],
      uptime: (() => {
        const secs = Math.floor(process.uptime());
        const days = Math.floor(secs / 86400);
        const hours = Math.floor((secs % 86400) / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        return {
          current: `${days}d ${hours}h ${mins}m`,
          percentage: null,
          verificationStatus: 'not_checked',
          since: new Date(Date.now() - secs * 1000).toISOString()
        };
      })()
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

function getSuperAdminEmails() {
  return new Set(
    (process.env.SUPER_ADMIN_EMAILS || process.env.OWNER_EMAIL || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function getAdminPermissions(user) {
  const email = String(user.email || '').toLowerCase();
  const canAccessFinancials =
    user.role === 'super_admin' ||
    user.permissions?.includes?.('super_admin') ||
    getSuperAdminEmails().has(email);

  return {
    canManageUsers: true,
    canManageServers: true,
    canViewAnalytics: true,
    canModerateContent: true,
    canAccessFinancials
  };
}

async function checkAdminFeaturesAvailability() {
  return {
    allAvailable: false,
    features: ADMIN_ENTERPRISE_FEATURE_FLAGS,
    verificationStatus: 'partially_verified',
    details: {
      businessIntelligence: 'available',
      mcpServers: 'retired',
      socialMediaManagement: 'not_connected',
      realTimeMonitoring: 'not_instrumented',
      advancedAnalytics: 'not_instrumented'
    }
  };
}

export default router;
