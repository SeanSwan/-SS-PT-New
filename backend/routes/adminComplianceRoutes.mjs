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

const COMPLIANCE_UNAVAILABLE = 'COMPLIANCE_DATA_UNAVAILABLE';

function unavailableError(message = 'Compliance data is temporarily unavailable.') {
  const error = new Error(message);
  error.code = COMPLIANCE_UNAVAILABLE;
  return error;
}

function sendUnavailable(res) {
  return res.status(503).json({
    success: false,
    error: 'compliance_unavailable',
    message: 'Compliance data is temporarily unavailable. Please retry.',
  });
}

async function selectRequiredRows(sql, replacements, label) {
  try {
    const result = await sequelize.query(sql, replacements ? { replacements } : undefined);
    const rows = result?.[0];
    if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
      throw unavailableError(`${label} returned an invalid response`);
    }
    return rows;
  } catch (error) {
    logger.warn('[%s] required query unavailable', label);
    if (error?.code === COMPLIANCE_UNAVAILABLE) throw error;
    throw unavailableError();
  }
}

function requireAggregateRow(rows, fields, label) {
  const row = rows[0];
  const valid = row && fields.every((field) => {
    const value = row[field];
    if (typeof value !== 'number' && typeof value !== 'string') return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return Number.isFinite(Number(value));
  });
  if (!valid) throw unavailableError(`${label} returned an invalid aggregate`);
  return row;
}

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

function requireComplianceRows(rows) {
  const isCount = value => (
    (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)))
    && Number.isSafeInteger(Number(value)) && Number(value) >= 0
  );
  const valid = rows.every(row => (
    Number.isSafeInteger(row.id) && row.id > 0
    && typeof row.firstName === 'string' && typeof row.lastName === 'string'
    && ['workouts7d', 'workouts30d', 'recovery14d'].every(field => isCount(row[field]))
    && (row.availableSessions === null || isCount(row.availableSessions))
    && (row.lastWorkoutDate === null || (
      (row.lastWorkoutDate instanceof Date || typeof row.lastWorkoutDate === 'string')
      && Number.isFinite(new Date(row.lastWorkoutDate).getTime())
    ))
  ));
  if (!valid) throw unavailableError();
  return rows;
}

async function getAtRiskCompliance(req, res) {
  try {
    const { sql, replacements } = buildAtRiskComplianceQuery({
      user: req.user,
      limit: req.query.limit,
    });
    const rows = requireComplianceRows(await selectRequiredRows(sql, replacements, 'Compliance'));
    const atRisk = sortAtRiskClients(rows.map(buildAtRiskComplianceClient).filter(Boolean));
    return res.json({ clients: atRisk });
  } catch (err) {
    if (err?.code === COMPLIANCE_UNAVAILABLE) return sendUnavailable(res);
    logger.error('[Compliance] at-risk fetch failed: %s', err?.message || 'unknown error');
    return res.status(500).json({ error: 'Failed to fetch compliance data' });
  }
}

// All routes require admin/trainer auth
router.use(protect, authorize(['admin', 'trainer']));

// Narrow router exported for the mounted trainer surface. It must be mounted
// before the global /api/admin router; only this route is intentionally
// reachable by trainers.
const atRiskComplianceRoutes = Router();
atRiskComplianceRoutes.use(protect, authorize(['admin', 'trainer']));
atRiskComplianceRoutes.get('/', getAtRiskCompliance);

/**
 * GET /api/admin/compliance/at-risk
 * Returns clients sorted by risk level based on workout compliance,
 * session count, last activity, and program expiration.
 */
router.get('/compliance/at-risk', getAtRiskCompliance);

/**
 * GET /api/admin/analytics/business-kpis
 * Returns business KPIs: MRR, client counts, churn, utilization, LTV.
 */
router.get('/analytics/business-kpis', validateBusinessKpiPeriod, authorize(['admin']), async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const days = BUSINESS_KPI_PERIOD_DAYS[period];

    const [revData, clientData, sessionData] = await Promise.all([
      selectRequiredRows(`
        SELECT
          COALESCE(SUM(CASE WHEN "createdAt" >= NOW() - INTERVAL '${days} days' THEN "totalAmount" END), 0) AS "totalRevenue",
          COALESCE(SUM(CASE WHEN "createdAt" >= NOW() - INTERVAL '30 days' THEN "totalAmount" END), 0) AS "mrr"
        FROM orders WHERE status = 'completed'
      `, undefined, 'BusinessKPI:revenue')
        .then((rows) => requireAggregateRow(rows, ['totalRevenue', 'mrr'], 'BusinessKPI:revenue')),
      selectRequiredRows(`
        SELECT
          COUNT(CASE WHEN "isActive" != false THEN 1 END) AS "activeClients",
          COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '${days} days' AND "isActive" != false THEN 1 END) AS "newClients",
          COUNT(CASE WHEN "isActive" = false AND "updatedAt" >= NOW() - INTERVAL '${days} days' THEN 1 END) AS "churnedClients"
        FROM "Users" WHERE role = 'client'
      `, undefined, 'BusinessKPI:clients')
        .then((rows) => requireAggregateRow(rows, ['activeClients', 'newClients', 'churnedClients'], 'BusinessKPI:clients')),
      selectRequiredRows(`
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
      `, undefined, 'BusinessKPI:sessions')
        .then((rows) => requireAggregateRow(rows, ['sessionsThisMonth', 'sessionsLastMonth', 'bookedSessionsThisMonth'], 'BusinessKPI:sessions')),
    ]);

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
    if (err?.code === COMPLIANCE_UNAVAILABLE) return sendUnavailable(res);
    logger.error('[BusinessKPI] fetch failed: %s', err?.message || 'unknown error');
    return res.status(500).json({ error: 'Failed to fetch business KPIs' });
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

export { atRiskComplianceRoutes };
export default router;
