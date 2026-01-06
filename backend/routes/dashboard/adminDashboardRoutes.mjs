/**
 * Admin Dashboard Routes
 * ======================
 *
 * Purpose:
 * - Provide privileged dashboard endpoints for trainers and admins.
 *
 * Blueprint Reference:
 * - docs/ai-workflow/ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md
 *
 * Architecture Overview (ASCII):
 * Admin/Trainer UI -> /api/dashboard/metrics -> performance metrics -> PostgreSQL
 * Admin UI -> /api/dashboard/health -> system health -> runtime
 *
 * Middleware Flow:
 * Request -> protect -> trainerOrAdminOnly/adminOnly -> handler -> response
 *
 * API Endpoints:
 * - GET /api/dashboard/metrics
 * - GET /api/dashboard/health
 *
 * Security:
 * - JWT auth required
 * - Trainer or admin role enforced for metrics
 * - Admin role enforced for health
 *
 * Testing:
 * - See ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md (testing checklist)
 */

import express from 'express';
import sequelize from '../../database.mjs';
import { protect, adminOnly, trainerOrAdminOnly } from '../../middleware/authMiddleware.mjs';
import { getAllModels, Op } from '../../models/index.mjs';

const router = express.Router();

const getDateRangeFromTimeframe = (timeframe) => {
  const now = new Date();
  const startDate = new Date(now);

  switch (timeframe) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  const durationMs = now.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate);
  const prevStart = new Date(startDate.getTime() - durationMs);

  return { startDate, endDate: now, prevStart, prevEnd };
};

const calculateChangePercent = (currentValue, previousValue) => {
  if (!previousValue) {
    return currentValue > 0 ? 100 : 0;
  }
  return ((currentValue - previousValue) / previousValue) * 100;
};

/**
 * @route   GET /api/dashboard/metrics
 * @desc    Get performance metrics for trainers and admins
 * @access  Private (Trainer, Admin)
 */
router.get('/metrics', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const userRole = req.user.role;
    const { timeframe = '30d' } = req.query;
    const { startDate, endDate, prevStart, prevEnd } = getDateRangeFromTimeframe(timeframe);

    const models = getAllModels();
    const Session = models.Session;
    const User = models.User;
    const Order = models.Order;

    const baseWhere = userRole === 'trainer' ? { trainerId: userId } : {};

    const [currentSessions, previousSessions, completedSessions, avgRatingRow] = await Promise.all([
      Session.count({
        where: {
          ...baseWhere,
          sessionDate: { [Op.between]: [startDate, endDate] },
        },
      }),
      Session.count({
        where: {
          ...baseWhere,
          sessionDate: { [Op.between]: [prevStart, prevEnd] },
        },
      }),
      Session.count({
        where: {
          ...baseWhere,
          status: 'completed',
          sessionDate: { [Op.between]: [startDate, endDate] },
        },
      }),
      Session.findOne({
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
        where: {
          ...baseWhere,
          rating: { [Op.not]: null },
        },
        raw: true,
      }),
    ]);

    const sessionCompletion = currentSessions ? (completedSessions / currentSessions) * 100 : 0;
    const growthRate = calculateChangePercent(currentSessions, previousSessions);
    const clientSatisfaction = Number(Number(avgRatingRow?.avgRating || 0).toFixed(1));

    const newClientsTrend = await Session.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('sessionDate')), 'date'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'count'],
      ],
      where: {
        ...baseWhere,
        sessionDate: { [Op.gte]: startDate },
        userId: { [Op.not]: null },
      },
      group: [sequelize.fn('DATE', sequelize.col('sessionDate'))],
      order: [[sequelize.fn('DATE', sequelize.col('sessionDate')), 'ASC']],
      raw: true,
    });

    const workoutCompletionsTrend = await Session.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('sessionDate')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: {
        ...baseWhere,
        status: 'completed',
        sessionDate: { [Op.gte]: startDate },
      },
      group: [sequelize.fn('DATE', sequelize.col('sessionDate'))],
      order: [[sequelize.fn('DATE', sequelize.col('sessionDate')), 'ASC']],
      raw: true,
    });

    const metrics = {
      performance: {
        clientRetention: currentSessions ? Math.min(100, sessionCompletion) : 0,
        sessionCompletion: Number(sessionCompletion.toFixed(1)),
        clientSatisfaction,
        growthRate: Number(growthRate.toFixed(1)),
      },
      trends: {
        newClients: newClientsTrend.map((row) => ({
          date: row.date,
          count: Number(row.count || 0),
        })),
        workoutCompletions: workoutCompletionsTrend.map((row) => ({
          date: row.date,
          count: Number(row.count || 0),
        })),
      },
    };

    if (userRole === 'admin') {
      const [activeUsers, revenueTotal] = await Promise.all([
        User.count({ where: { updatedAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
        Order
          ? Order.sum('totalAmount', { where: { status: 'completed', createdAt: { [Op.gte]: startDate } } })
          : 0,
      ]);

      metrics.systemHealth = {
        serverUptimeSeconds: Math.round(process.uptime()),
        responseTimeMs: 0,
        errorRate: 0,
        activeUsers,
      };
      metrics.revenue = {
        total: Number(revenueTotal || 0),
        monthly: Number(revenueTotal || 0),
        growth: Number(growthRate.toFixed(1)),
      };
    }

    return res.status(200).json({
      success: true,
      metrics,
      timeframe,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/dashboard/health
 * @desc    Get system health status for admin dashboard
 * @access  Private (Admin only)
 */
router.get('/health', protect, adminOnly, async (req, res) => {
  try {
    const dbStart = Date.now();
    let dbStatus = 'healthy';

    try {
      await sequelize.authenticate();
    } catch (error) {
      dbStatus = 'unhealthy';
    }

    const dbResponseTime = Date.now() - dbStart;
    const memory = process.memoryUsage();
    const uptimeSeconds = process.uptime();
    const uptimePercent = Math.min(100, (uptimeSeconds / (24 * 60 * 60)) * 100);

    const health = {
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      services: {
        database: {
          status: dbStatus,
          responseTimeMs: dbResponseTime,
        },
      },
      performance: {
        uptimePercent: Number(uptimePercent.toFixed(2)),
        uptimeSeconds: Math.round(uptimeSeconds),
        memoryRssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      },
      lastUpdated: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch system health',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
