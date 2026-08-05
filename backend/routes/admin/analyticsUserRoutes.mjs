/**
 * Admin Analytics User Routes
 * ===========================
 *
 * Purpose:
 * - Provide user analytics and activity statistics for admin dashboards.
 *
 * Blueprint Reference:
 * - docs/ai-workflow/ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md
 *
 * Architecture Overview (ASCII):
 * Admin UI -> /api/admin/analytics/users -> User analytics -> PostgreSQL
 * Admin UI -> /api/admin/analytics/statistics/users -> User stats -> PostgreSQL
 * Admin UI -> /api/admin/analytics/statistics/workouts -> Session stats -> PostgreSQL
 *
 * Middleware Flow:
 * Request -> authenticateToken -> authorizeAdmin -> rateLimit -> handler -> response
 *
 * API Endpoints:
 * - GET /api/admin/analytics/users
 * - GET /api/admin/analytics/live-users
 * - GET /api/admin/analytics/statistics/users
 * - GET /api/admin/analytics/statistics/workouts
 *
 * Security:
 * - JWT auth required
 * - Admin role enforced
 * - Rate limiting applied
 *
 * Testing:
 * - See ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md (testing checklist)
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { Op } from 'sequelize';

import { authenticateToken, authorizeAdmin } from '../../middleware/auth.mjs';
import sequelize from '../../database.mjs';
import User from '../../models/User.mjs';
import {
  generateUserAnalytics,
  generateWorkoutStatistics,
} from '../../services/adminUserAnalyticsService.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';

const analyticsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many analytics requests. Please try again later.',
  },
});

router.use(authenticateToken);
router.use(authorizeAdmin);
router.use(analyticsRateLimit);

const getDateRangeFromTimeRange = (timeRange) => {
  const now = new Date();
  const startDate = new Date(now);

  switch (timeRange) {
    case '24h':
      startDate.setDate(now.getDate() - 1);
      break;
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
  if (!previousValue) return currentValue > 0 ? 100 : 0;
  return ((currentValue - previousValue) / previousValue) * 100;
};

// =====================================================
// STATISTICS ALIAS ENDPOINTS (frontend expects /statistics/*)
// =====================================================

router.get('/statistics/users', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const { startDate, endDate, prevStart, prevEnd } = getDateRangeFromTimeRange(timeRange);

    const [totalUsers, activeUsers, previousActiveUsers, trendRows] = await Promise.all([
      User.count({ where: { role: 'client' } }),
      User.count({
        where: {
          role: 'client',
          isActive: true,
        },
      }),
      User.count({
        where: {
          role: 'client',
          updatedAt: { [Op.between]: [prevStart, prevEnd] },
        },
      }),
      User.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: {
          createdAt: { [Op.between]: [startDate, endDate] },
        },
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
        raw: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        changePercent: Number(
          calculateChangePercent(activeUsers, previousActiveUsers).toFixed(1)
        ),
        trend: trendRows.map((item) => Number(item.count || 0)),
        // SWA-138 S6: the old target was the metric itself +15%/+10% — a synthetic
        // self-referential 'goal' that always rendered ~87-91% progress. Until a real
        // stored business goal exists, no target is reported (UI hides the bar).
        target: null,
      },
    });
  } catch (error) {
    console.error('Statistics users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user statistics' });
  }
});

router.get('/statistics/workouts', async (req, res) => {
  try {
    res.json({
      success: true,
      data: await generateWorkoutStatistics(),
    });
  } catch (error) {
    console.error('Statistics workouts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch workout statistics' });
  }
});

// =====================================================
// USER ANALYTICS ENDPOINT
// =====================================================

router.get('/users', async (req, res) => {
  try {
    console.log('User analytics API called');

    const userAnalytics = await generateUserAnalytics();

    res.json({
      success: true,
      data: userAnalytics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user analytics',
      error: INTERNAL_ERROR,
    });
  }
});

// =====================================================
// LIVE USERS ENDPOINT
// =====================================================

router.get('/live-users', async (req, res) => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const liveUsers = await User.count({
      where: {
        updatedAt: {
          [Op.gte]: tenMinutesAgo,
        },
      },
    });

    res.json({
      success: true,
      liveUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Live users error:', error);
    res.status(500).json({
      success: false,
      liveUsers: 0,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
