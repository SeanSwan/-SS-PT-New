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
import {
  buildAtRiskComplianceClient,
  buildAtRiskComplianceQuery,
  sortAtRiskClients,
} from '../utils/adminComplianceHelpers.mjs';

const router = Router();
const BUSINESS_KPI_PERIOD_DAYS = Object.freeze({
  '30d': 30,
  '90d': 90,
  '12m': 365,
});

function validateBusinessKpiPeriod(req, res, next) {
  const period = req.query.period || '30d';
  if (!Object.prototype.hasOwnProperty.call(BUSINESS_KPI_PERIOD_DAYS, period)) {
    return res.status(400).json({
      success: false,
      error: 'invalid_period',
      message: 'Invalid business KPI period',
    });
  }
  next();
}
export { buildAtRiskComplianceClient };

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
      const { sql, replacements } = buildAtRiskComplianceQuery({
        user: req.user,
        limit: req.query.limit,
      });
      const [rows] = await sequelize.query(sql, { replacements });
      clients = rows || [];
    } catch (queryErr) {
      logger.warn('[Compliance] at-risk query failed (table may not exist): %s', queryErr.message);
      // Return empty if query fails — don't crash the whole endpoint
    }

    const atRisk = sortAtRiskClients(clients.map(buildAtRiskComplianceClient).filter(Boolean));

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
router.get('/analytics/business-kpis', validateBusinessKpiPeriod, authorize(['admin']), async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const days = BUSINESS_KPI_PERIOD_DAYS[period];

    // Each query wrapped individually — if a table doesn't exist or query fails, we fallback to zero
    let revData = { totalRevenue: 0, mrr: 0 };
    let clientData = { activeClients: 0, newClients: 0, churnedClients: 0 };
    let sessionData = { sessionsThisMonth: 0, sessionsLastMonth: 0, bookedSessionsThisMonth: 0 };

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
          COUNT(CASE
            WHEN "sessionDate" >= DATE_TRUNC('month', NOW())
             AND "sessionDate" < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
             AND status = 'completed'
            THEN 1 END) AS "sessionsThisMonth",
          COUNT(CASE
            WHEN "sessionDate" >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
             AND "sessionDate" < DATE_TRUNC('month', NOW())
             AND status = 'completed'
            THEN 1 END) AS "sessionsLastMonth",
          COUNT(CASE
            WHEN "sessionDate" >= DATE_TRUNC('month', NOW())
             AND "sessionDate" < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
             AND status IN ('scheduled', 'confirmed', 'completed', 'cancelled')
            THEN 1 END) AS "bookedSessionsThisMonth"
        FROM sessions
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
    const sessionsThisMonth = Number(sessionData?.sessionsThisMonth || 0);
    const bookedSessionsThisMonth = Number(sessionData?.bookedSessionsThisMonth || 0);
    const sessionUtilization = bookedSessionsThisMonth > 0
      ? Math.round((sessionsThisMonth / bookedSessionsThisMonth) * 100)
      : 0;

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
        sessionUtilization,
        avgLTV: active > 0 ? Math.round(totalRev / active) : 0,
        avgRevenuePerClient: active > 0 ? Math.round(mrr / active) : 0,
        sessionsThisMonth,
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
