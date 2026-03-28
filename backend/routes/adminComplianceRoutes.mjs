/**
 * Admin Compliance & Check-In Routes
 * ───────────────────────────────────
 * Backend API for Client Compliance Dashboard, Business KPIs,
 * and Automated Check-In system.
 */
import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

const router = Router();

// All routes require admin/trainer auth
router.use(protect, authorize(['admin', 'trainer']));

/**
 * GET /api/admin/compliance/at-risk
 * Returns clients sorted by risk level based on workout compliance,
 * session count, last activity, and program expiration.
 */
router.get('/compliance/at-risk', async (req, res) => {
  try {
    let clients = [];
    try {
      const [rows] = await sequelize.query(`
        SELECT
          u.id,
          u."firstName",
          u."lastName",
          u.photo,
          u."availableSessions",
          MAX(dwf."createdAt") AS "lastWorkoutDate",
          COUNT(CASE WHEN dwf."createdAt" >= NOW() - INTERVAL '7 days' THEN 1 END) AS "workouts7d",
          COUNT(CASE WHEN dwf."createdAt" >= NOW() - INTERVAL '30 days' THEN 1 END) AS "workouts30d"
        FROM "Users" u
        LEFT JOIN daily_workout_forms dwf ON dwf."clientId" = u.id
        WHERE u.role = 'client' AND u."isActive" != false
        GROUP BY u.id
        ORDER BY MAX(dwf."createdAt") ASC NULLS FIRST
        LIMIT 50
      `);
      clients = rows || [];
    } catch (queryErr) {
      logger.warn('[Compliance] at-risk query failed (table may not exist): %s', queryErr.message);
      // Return empty if query fails — don't crash the whole endpoint
    }

    const atRisk = clients.map(c => {
      const lastWorkout = c.lastWorkoutDate ? new Date(c.lastWorkoutDate) : null;
      const daysSince = lastWorkout ? Math.floor((Date.now() - lastWorkout.getTime()) / 86400000) : 999;
      const w7d = Number(c.workouts7d || 0);
      const w30d = Number(c.workouts30d || 0);
      // Target: ~3 workouts/week = ~12/month
      const compliance7d = Math.min(100, Math.round((w7d / 3) * 100));
      const compliance30d = Math.min(100, Math.round((w30d / 12) * 100));
      const sessions = Number(c.availableSessions || 0);

      let riskLevel = 'watch';
      let reason = '';
      if (daysSince > 10 || (compliance30d < 30 && w30d < 3)) {
        riskLevel = 'critical';
        reason = daysSince > 10
          ? `No workouts in ${daysSince} days`
          : `Very low compliance (${compliance30d}%) this month`;
        if (sessions <= 2) reason += `, only ${sessions} session${sessions !== 1 ? 's' : ''} remaining`;
      } else if (daysSince > 5 || compliance30d < 50) {
        riskLevel = 'warning';
        reason = `Compliance dropped to ${compliance30d}% (${w30d} workouts in 30 days)`;
      } else if (daysSince > 3 || compliance7d < 66) {
        reason = `Moderate activity — ${w7d} workout${w7d !== 1 ? 's' : ''} this week`;
      } else {
        return null; // healthy, skip
      }

      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        photo: c.photo || null,
        riskLevel,
        reason,
        daysSinceLastWorkout: daysSince === 999 ? 0 : daysSince,
        complianceRate7d: compliance7d,
        complianceRate30d: compliance30d,
        sessionsRemaining: sessions,
      };
    }).filter(Boolean).sort((a, b) => {
      const order = { critical: 0, warning: 1, watch: 2 };
      return (order[a.riskLevel] ?? 3) - (order[b.riskLevel] ?? 3);
    });

    res.json({ clients: atRisk });
  } catch (err) {
    logger.error('[Compliance] at-risk fetch failed: %s', err.message);
    res.status(500).json({ error: 'Failed to fetch compliance data' });
  }
});

/**
 * GET /api/admin/analytics/business-kpis
 * Returns business KPIs: MRR, client counts, churn, utilization, LTV.
 */
router.get('/analytics/business-kpis', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const days = period === '12m' ? 365 : period === '90d' ? 90 : 30;

    // Each query wrapped individually — if a table doesn't exist or query fails, we fallback to zero
    let revData = { totalRevenue: 0, mrr: 0 };
    let clientData = { activeClients: 0, newClients: 0, churnedClients: 0 };
    let sessionData = { sessionsThisMonth: 0, sessionsLastMonth: 0 };

    try {
      const [revRows] = await sequelize.query(`
        SELECT
          COALESCE(SUM(CASE WHEN "createdAt" >= NOW() - INTERVAL '${days} days' THEN "totalAmount" END), 0) AS "totalRevenue",
          COALESCE(SUM(CASE WHEN "createdAt" >= NOW() - INTERVAL '30 days' THEN "totalAmount" END), 0) AS "mrr"
        FROM orders WHERE status IN ('completed', 'paid')
      `);
      if (revRows?.[0]) revData = revRows[0];
    } catch (e) {
      logger.warn('[BusinessKPI] Revenue query failed (table may not exist): %s', e.message);
    }

    try {
      const [clientRows] = await sequelize.query(`
        SELECT
          COUNT(CASE WHEN "isActive" != false THEN 1 END) AS "activeClients",
          COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '${days} days' AND "isActive" != false THEN 1 END) AS "newClients",
          COUNT(CASE WHEN "isActive" = false AND "updatedAt" >= NOW() - INTERVAL '${days} days' THEN 1 END) AS "churnedClients"
        FROM "Users" WHERE role = 'client'
      `);
      if (clientRows?.[0]) clientData = clientRows[0];
    } catch (e) {
      logger.warn('[BusinessKPI] Client query failed: %s', e.message);
    }

    try {
      const [sessionRows] = await sequelize.query(`
        SELECT
          COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '30 days' THEN 1 END) AS "sessionsThisMonth",
          COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '60 days' AND "createdAt" < NOW() - INTERVAL '30 days' THEN 1 END) AS "sessionsLastMonth"
        FROM daily_workout_forms
      `);
      if (sessionRows?.[0]) sessionData = sessionRows[0];
    } catch (e) {
      logger.warn('[BusinessKPI] Session query failed: %s', e.message);
    }

    const active = Number(clientData?.activeClients || 0);
    const newC = Number(clientData?.newClients || 0);
    const churned = Number(clientData?.churnedClients || 0);
    const mrr = Number(revData?.mrr || 0);
    const totalRev = Number(revData?.totalRevenue || 0);

    res.json({
      data: {
        mrr: Math.round(mrr),
        mrrChange: active > 0 ? ((newC - churned) / (active || 1)) * 100 : 0,
        totalRevenue: Math.round(totalRev),
        revenueChange: 0,
        activeClients: active,
        newClients: newC,
        churnedClients: churned,
        churnRate: active > 0 ? Number(((churned / active) * 100).toFixed(1)) : 0,
        sessionUtilization: 78, // placeholder until session scheduling is wired
        avgLTV: active > 0 ? Math.round(totalRev / active) : 0,
        avgRevenuePerClient: active > 0 ? Math.round(mrr / active) : 0,
        sessionsThisMonth: Number(sessionData?.sessionsThisMonth || 0),
        sessionsLastMonth: Number(sessionData?.sessionsLastMonth || 0),
        revenueSparkline: [],
        clientSparkline: [],
      },
    });
  } catch (err) {
    logger.error('[BusinessKPI] fetch failed: %s', err.message);
    res.status(500).json({ error: 'Failed to fetch business KPIs' });
  }
});

/**
 * GET /api/admin/check-ins/dashboard
 * Returns check-in schedules, habit summaries, and automation triggers.
 */
router.get('/check-ins/dashboard', async (req, res) => {
  try {
    // For now, return structure that frontend can work with.
    // These will be populated as the check-in scheduling system is built out.
    res.json({
      checkIns: [],
      habits: [],
      triggers: [],
    });
  } catch (err) {
    logger.error('[CheckIns] dashboard fetch failed: %s', err.message);
    res.status(500).json({ error: 'Failed to fetch check-in data' });
  }
});

export default router;
