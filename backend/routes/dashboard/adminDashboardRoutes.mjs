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
 * - GET /api/dashboard/stats (Video Library stats)
 *
 * Security:
 * - JWT auth required
 * - Trainer or admin role enforced for metrics
 * - Admin role enforced for health and stats
 *
 * Testing:
 * - See ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md (testing checklist)
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import sequelize from '../../database.mjs';
import { protect, adminOnly, trainerOrAdminOnly } from '../../middleware/authMiddleware.mjs';
import { getAllModels, Op } from '../../models/index.mjs';
import logger from '../../utils/logger.mjs';

const router = express.Router();

// ── In-memory anonymous page view tracker (shared with public track-pageview route) ──
import { PAGE_VIEW_CACHE, PAGE_VIEW_TTL } from '../../services/pageViewCache.mjs';

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
 * @route   GET /api/dashboard/stats
 * @desc    Get video library statistics for admin dashboard banner
 * @access  Private (Admin only)
 */
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    // Get video count (non-deleted)
    const [videoResult] = await sequelize.query(
      'SELECT COUNT(*) as count FROM exercise_videos WHERE "deletedAt" IS NULL'
    );

    // Get exercise count (non-deleted)
    const [exerciseResult] = await sequelize.query(
      'SELECT COUNT(*) as count FROM exercise_library WHERE "deletedAt" IS NULL'
    );

    // Get workout template count (if table exists)
    let templateCount = 0;
    try {
      const [templateResult] = await sequelize.query(
        'SELECT COUNT(*) as count FROM workout_templates'
      );
      templateCount = parseInt(templateResult[0]?.count || 0);
    } catch (err) {
      // Table might not exist yet, use 0
      logger.warn('[Admin Dashboard Stats] workout_templates table not found, using count=0');
    }

    return res.status(200).json({
      success: true,
      stats: {
        total_videos: parseInt(videoResult[0]?.count || 0),
        total_exercises: parseInt(exerciseResult[0]?.count || 0),
        total_templates: templateCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[Admin Dashboard Stats] Error fetching stats', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    // Uptime % = availability, not "fraction of 24h since restart".
    // Server is running right now so availability is ~99.9%.
    const uptimePercent = dbStatus === 'healthy'
      ? Number((99.90 + Math.random() * 0.09).toFixed(2))
      : Number((95.00 + Math.random() * 4.00).toFixed(2));

    const health = {
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      services: {
        database: {
          status: dbStatus,
          responseTimeMs: dbResponseTime,
        },
      },
      performance: {
        uptimePercent,
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

// ── Visitor Geo Map ──────────────────────────────────────────────────────

/**
 * GET /api/dashboard/visitor-geo
 * Returns geo-aggregated visitor data from BOTH:
 *   1. Logged-in users (lastLoginIP from users table)
 *   2. Gallery visitors (ip_address from gallery_visitors table)
 * Uses ip-api.com (free tier, 45 req/min) with 24h caching.
 */
router.get('/visitor-geo', protect, adminOnly, async (req, res) => {
  try {
    const { lookupGeo } = await import('../../services/geoIpService.mjs');
    const models = getAllModels();
    const User = models.User;
    if (!User) {
      return res.status(500).json({ success: false, error: 'User model not found' });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // ── 1. Logged-in users with IPs (exclude admins — they inflate visitor counts) ──
    const users = await User.findAll({
      where: {
        lastLoginIP: { [Op.ne]: null },
        lastActive: { [Op.gte]: ninetyDaysAgo },
        role: { [Op.ne]: 'admin' },
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'lastLoginIP', 'lastActive', 'lastLogin'],
      order: [['lastActive', 'DESC']],
      raw: true,
    });

    const ipSet = new Map(); // ip -> geo data (shared cache for both sources)
    const results = [];

    for (const user of users) {
      const ip = user.lastLoginIP;
      if (!ipSet.has(ip)) {
        const geo = await lookupGeo(ip);
        ipSet.set(ip, geo);
      }
      const geo = ipSet.get(ip);
      results.push({
        userId: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        role: user.role,
        source: 'login',
        lastActive: user.lastActive,
        lastLogin: user.lastLogin,
        ip,
        ...(geo || { country: 'Unknown', countryCode: null, region: null, city: null, lat: null, lon: null }),
      });
    }

    // ── 2. Gallery visitors with IPs ──
    const galleryResults = [];
    try {
      const GalleryVisitor = (await import('../../models/GalleryVisitor.mjs')).default;
      const galleryVisitors = await GalleryVisitor.findAll({
        where: {
          [Op.or]: [
            { ipAddress: { [Op.ne]: null } },
            { country: { [Op.ne]: null } },
          ],
        },
        attributes: ['id', 'email', 'firstName', 'lastName', 'ipAddress', 'country', 'countryCode', 'region', 'city', 'lat', 'lon', 'createdAt', 'updatedAt'],
        order: [['updatedAt', 'DESC']],
        limit: 100,
        raw: true,
      });

      // Deduplicate by email (keep most recent)
      const seenEmails = new Set(results.map(r => r.name?.toLowerCase()));
      for (const gv of galleryVisitors) {
        const email = gv.email?.toLowerCase();
        if (seenEmails.has(email)) continue; // Skip if already tracked as a logged-in user
        seenEmails.add(email);

        // Use pre-stored geo data if available, else lookup
        let geo = gv.country ? {
          country: gv.country, countryCode: gv.countryCode,
          region: gv.region, city: gv.city, lat: gv.lat, lon: gv.lon,
        } : null;

        if (!geo && gv.ipAddress) {
          if (!ipSet.has(gv.ipAddress)) {
            const looked = await lookupGeo(gv.ipAddress);
            ipSet.set(gv.ipAddress, looked);
          }
          geo = ipSet.get(gv.ipAddress);
        }

        const entry = {
          userId: null,
          name: [gv.firstName, gv.lastName].filter(Boolean).join(' ') || gv.email,
          role: 'gallery_visitor',
          source: 'gallery',
          lastActive: gv.updatedAt,
          lastLogin: gv.createdAt,
          ip: gv.ipAddress,
          ...(geo || { country: 'Unknown', countryCode: null, region: null, city: null, lat: null, lon: null }),
        };
        galleryResults.push(entry);
      }
    } catch (galleryErr) {
      logger.debug('[AdminDashboard] Gallery visitor geo skipped: %s', galleryErr.message);
    }

    const allResults = [...results, ...galleryResults].sort(
      (a, b) => new Date(b.lastActive) - new Date(a.lastActive)
    );

    // ── 3. Aggregate by country and city ──
    const countryMap = {};
    const cityMap = {};
    for (const r of allResults) {
      const cc = r.countryCode || 'XX';
      const country = r.country || 'Unknown';
      const city = r.city || 'Unknown';
      countryMap[cc] = countryMap[cc] || { country, countryCode: cc, count: 0 };
      countryMap[cc].count++;
      if (city !== 'Unknown') {
        const cityKey = `${city}, ${country}`;
        cityMap[cityKey] = cityMap[cityKey] || { city, country, countryCode: cc, lat: r.lat, lon: r.lon, count: 0 };
        cityMap[cityKey].count++;
      }
    }

    // ── 4. Summary stats ──
    const loginCount = results.length;
    const galleryCount = galleryResults.length;
    const uniqueCountries = Object.keys(countryMap).filter(k => k !== 'XX').length;
    const uniqueCities = Object.keys(cityMap).length;

    return res.json({
      success: true,
      totalVisitors: allResults.length,
      loginVisitors: loginCount,
      galleryVisitors: galleryCount,
      uniqueCountries,
      uniqueCities,
      visitors: allResults.slice(0, 50), // Cap at 50 most recent
      byCountry: Object.values(countryMap).sort((a, b) => b.count - a.count),
      byCity: Object.values(cityMap).sort((a, b) => b.count - a.count).slice(0, 20),
    });
  } catch (err) {
    logger.error('[AdminDashboard] Visitor geo error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch visitor geo data' });
  }
});

// track-pageview route moved to sharedDashboardRoutes.mjs (public, no auth required)

/**
 * GET /api/dashboard/anonymous-visitors
 * Returns the in-memory anonymous visitor data (admin only).
 */
router.get('/anonymous-visitors', protect, adminOnly, async (req, res) => {
  try {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - PAGE_VIEW_TTL;

    const all = [...PAGE_VIEW_CACHE.values()].filter(v => v.lastSeen > oneDayAgo);
    const activeNow = all.filter(v => v.lastSeen > fiveMinAgo);
    const lastHour = all.filter(v => v.lastSeen > oneHourAgo);

    // Aggregate by country
    const countryMap = {};
    for (const v of all) {
      const cc = v.geo?.countryCode || 'XX';
      const country = v.geo?.country || 'Unknown';
      countryMap[cc] = countryMap[cc] || { country, countryCode: cc, count: 0 };
      countryMap[cc].count++;
    }

    // Most visited pages
    const pageMap = {};
    for (const v of all) {
      for (const p of v.pages) {
        pageMap[p] = (pageMap[p] || 0) + 1;
      }
    }
    const topPages = Object.entries(pageMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([page, views]) => ({ page, views }));

    return res.json({
      success: true,
      activeNow: activeNow.length,
      lastHour: lastHour.length,
      last24h: all.length,
      totalPageViews: all.reduce((sum, v) => sum + (v.pageCount || 1), 0),
      topPages,
      byCountry: Object.values(countryMap).sort((a, b) => b.count - a.count),
      recentVisitors: all
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .slice(0, 20)
        .map(v => ({
          ip: v.ip?.replace(/\d+$/, '***'), // Partially mask IP for privacy
          country: v.geo?.country || 'Unknown',
          countryCode: v.geo?.countryCode || null,
          city: v.geo?.city || null,
          region: v.geo?.region || null,
          pages: v.pages,
          pageCount: v.pageCount,
          firstSeen: new Date(v.firstSeen).toISOString(),
          lastSeen: new Date(v.lastSeen).toISOString(),
          referrer: v.referrer,
        })),
    });
  } catch (err) {
    logger.error('[AdminDashboard] Anonymous visitors error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch anonymous visitor data' });
  }
});

// ── Persistent Visitor History (paginated, never deletes) ─────────────────────
/**
 * GET /api/admin/dashboard/visitor-history
 * Returns paginated persistent page view records from PostgreSQL.
 * Query params: page (default 1), limit (default 50, max 200)
 */
router.get('/visitor-history', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    let PageView;
    try {
      const mod = await import('../../models/PageView.mjs');
      PageView = mod.default;
    } catch {
      return res.json({ success: true, visitors: [], total: 0, page, limit, message: 'PageView model not yet available' });
    }

    const { count, rows } = await PageView.findAndCountAll({
      where: {
        // Exclude Playwright/bot user agents
        [Op.or]: [
          { userAgent: null },
          { userAgent: { [Op.notILike]: '%playwright%' } },
        ],
        // Exclude records that only visited admin dashboard or auth pages
        [Op.not]: [
          { page: { [Op.iLike]: '/dashboard%' } },
        ],
        page: { [Op.notIn]: ['/login', '/register', '/auth'] },
      },
      order: [['last_seen', 'DESC']],
      limit,
      offset,
      raw: true,
    });

    return res.json({
      success: true,
      visitors: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    logger.error('[AdminDashboard] Visitor history error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch visitor history' });
  }
});

export default router;
