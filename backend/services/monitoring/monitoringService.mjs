/**
 * Monitoring Service — Phase 10
 * ===============================
 * Core monitoring service extracted from aiMonitoringRoutes.mjs.
 * Maintains in-memory metrics for fast reads AND persists to DB via async UPSERT.
 *
 * Features:
 * - Dynamic feature registry (auto-creates entries on first call)
 * - Feature name validation (max 50 chars, alphanumeric + underscore)
 * - Dual-write: in-memory + DB (fire-and-forget UPSERT)
 * - Eval/drift/AB integration via disk file reads
 * - 60-second cache for getDriftStatus
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../../utils/logger.mjs';
import sequelize from '../../database.mjs';
import { loadBaseline, compareDrift } from '../../eval/driftDetector.mjs';
import { evaluateThresholds, persistAlerts } from './alertEngine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Paths for eval/drift/AB integration ─────────────────────────────────────
const EVAL_BASELINE_PATH = resolve(__dirname, '../../../docs/qa/AI-PLANNING-VALIDATION-BASELINE.json');
const EVAL_LATEST_PATH = resolve(__dirname, '../../../docs/qa/AI-PLANNING-VALIDATION-LATEST.json');
const AB_REPORT_PATH = resolve(__dirname, '../../../docs/qa/PROVIDER-AB-RESULTS.json');

// ── Alert evaluation throttle ───────────────────────────────────────────────
const ALERT_EVAL_INTERVAL_MS = 30000; // Evaluate alerts at most every 30 seconds
let _lastAlertEvalTime = 0;

// ── Feature name validation ─────────────────────────────────────────────────
const FEATURE_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const MAX_FEATURE_NAME_LEN = 50;

/**
 * Validate feature name to prevent unbounded metric cardinality.
 * @param {string} feature
 * @returns {boolean}
 */
function isValidFeatureName(feature) {
  if (typeof feature !== 'string') return false;
  if (feature.length === 0 || feature.length > MAX_FEATURE_NAME_LEN) return false;
  return FEATURE_NAME_RE.test(feature);
}

// ── In-memory metrics (dynamic registry) ────────────────────────────────────
const metrics = {};
const activeUsers = new Set();
const dailyActiveUsers = new Set();

/**
 * Get or create a feature metrics entry.
 * @param {string} feature
 * @returns {Object}
 */
function ensureFeature(feature) {
  if (!metrics[feature]) {
    metrics[feature] = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null,
      totalTokensUsed: 0,
    };
  }
  return metrics[feature];
}

// ── Bucket time helpers ─────────────────────────────────────────────────────

/**
 * Truncate a Date to the start of its hour.
 * @param {Date} date
 * @returns {Date}
 */
export function truncateToHour(date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

/**
 * Truncate a Date to the start of its day.
 * @param {Date} date
 * @returns {Date}
 */
export function truncateToDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── DB persistence (fire-and-forget) ────────────────────────────────────────

/**
 * Persist a metric event to hourly + daily buckets via raw SQL UPSERT.
 * Fire-and-forget: errors are logged, never thrown.
 */
async function persistToBuckets(feature, success, responseTime, tokensUsed, userId) {
  try {
    const now = new Date();
    const hourStart = truncateToHour(now);
    const dayStart = truncateToDay(now);
    const successInt = success ? 1 : 0;
    const failInt = success ? 0 : 1;

    const upsertSql = `
      INSERT INTO ai_metrics_buckets
        (feature, granularity, "bucketStart", "totalRequests", "successCount", "failCount",
         "totalTokens", "sumResponseTime", "minResponseTime", "maxResponseTime", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $7, $7, NOW(), NOW())
      ON CONFLICT (feature, granularity, "bucketStart")
      DO UPDATE SET
        "totalRequests"   = ai_metrics_buckets."totalRequests" + 1,
        "successCount"    = ai_metrics_buckets."successCount" + $4,
        "failCount"       = ai_metrics_buckets."failCount" + $5,
        "totalTokens"     = ai_metrics_buckets."totalTokens" + $6,
        "sumResponseTime" = ai_metrics_buckets."sumResponseTime" + $7,
        "minResponseTime" = LEAST(ai_metrics_buckets."minResponseTime", $7),
        "maxResponseTime" = GREATEST(ai_metrics_buckets."maxResponseTime", $7),
        "updatedAt"       = NOW()
      RETURNING id;
    `;

    const binds = [feature, 'hourly', hourStart, successInt, failInt, tokensUsed, responseTime];

    // Hourly bucket
    const [hourlyRows] = await sequelize.query(upsertSql, { bind: binds });
    const hourlyBucketId = hourlyRows?.[0]?.id;

    // Daily bucket
    const dailyBinds = [feature, 'daily', dayStart, successInt, failInt, tokensUsed, responseTime];
    const [dailyRows] = await sequelize.query(upsertSql, { bind: dailyBinds });
    const dailyBucketId = dailyRows?.[0]?.id;

    // Track unique users
    if (userId != null) {
      const userSql = `
        INSERT INTO ai_metrics_bucket_users ("bucketId", "userId", "createdAt")
        VALUES ($1, $2, NOW())
        ON CONFLICT ("bucketId", "userId") DO NOTHING;
      `;
      if (hourlyBucketId) {
        await sequelize.query(userSql, { bind: [hourlyBucketId, userId] });
      }
      if (dailyBucketId) {
        await sequelize.query(userSql, { bind: [dailyBucketId, userId] });
      }
    }
  } catch (err) {
    logger.error('monitoringService: DB UPSERT failed (non-blocking)', { error: err.message });
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Update feature metrics. Validates feature name, updates in-memory state,
 * and fires async DB UPSERT (fire-and-forget).
 *
 * @param {string} feature - Feature name (max 50 chars, alphanumeric + underscore)
 * @param {boolean} success - Whether the request succeeded
 * @param {number} responseTime - Response time in ms
 * @param {number} [tokensUsed=0] - Tokens consumed
 * @param {number|null} [userId=null] - User ID for active user tracking
 */
export const updateMetrics = (feature, success, responseTime, tokensUsed = 0, userId = null) => {
  if (!isValidFeatureName(feature)) {
    logger.warn(`monitoringService: Invalid feature name rejected: "${feature}"`);
    return;
  }

  const featureMetrics = ensureFeature(feature);

  featureMetrics.totalRequests++;
  if (success) {
    featureMetrics.successfulRequests++;
  } else {
    featureMetrics.failedRequests++;
  }

  // Running average response time
  featureMetrics.averageResponseTime = (
    (featureMetrics.averageResponseTime * (featureMetrics.totalRequests - 1) + responseTime) /
    featureMetrics.totalRequests
  );

  featureMetrics.lastRequestTime = new Date().toISOString();
  if (tokensUsed) {
    featureMetrics.totalTokensUsed += tokensUsed;
  }

  if (userId) {
    activeUsers.add(userId);
    dailyActiveUsers.add(userId);
  }

  logger.info(`Updated metrics for ${feature}`, {
    success,
    responseTime,
    tokensUsed,
    totalRequests: featureMetrics.totalRequests,
  });

  // Fire-and-forget DB persistence
  persistToBuckets(feature, success, responseTime, tokensUsed || 0, userId);

  // Throttled alert evaluation (fire-and-forget, at most every 30s)
  const now = Date.now();
  if (now - _lastAlertEvalTime >= ALERT_EVAL_INTERVAL_MS) {
    _lastAlertEvalTime = now;
    try {
      const snapshot = getMetricsSnapshot();
      const alerts = evaluateThresholds(snapshot);
      persistAlerts(alerts).catch(err =>
        logger.error('monitoringService: alert persistence failed (non-blocking)', { error: err.message })
      );
    } catch (err) {
      logger.error('monitoringService: alert evaluation failed (non-blocking)', { error: err.message });
    }
  }
};

/**
 * Get current in-memory metrics snapshot.
 * @returns {Object}
 */
export function getMetricsSnapshot() {
  const totalRequests = Object.values(metrics).reduce((sum, m) => sum + m.totalRequests, 0);
  const totalSuccessful = Object.values(metrics).reduce((sum, m) => sum + m.successfulRequests, 0);
  const totalFailed = Object.values(metrics).reduce((sum, m) => sum + m.failedRequests, 0);
  const overallSuccessRate = totalRequests > 0 ? ((totalSuccessful / totalRequests) * 100).toFixed(1) : 0;

  const responseTimeSum = Object.values(metrics).reduce((sum, m) => {
    return sum + (m.averageResponseTime * m.totalRequests);
  }, 0);
  const overallAverageResponseTime = totalRequests > 0 ? (responseTimeSum / totalRequests).toFixed(2) : 0;

  const totalTokens = Object.values(metrics).reduce((sum, m) => sum + (m.totalTokensUsed || 0), 0);

  return {
    timestamp: new Date().toISOString(),
    overview: {
      totalRequests,
      successfulRequests: totalSuccessful,
      failedRequests: totalFailed,
      successRate: `${overallSuccessRate}%`,
      averageResponseTime: `${overallAverageResponseTime}ms`,
      totalTokensUsed: totalTokens,
      activeUsers: activeUsers.size,
      dailyActiveUsers: dailyActiveUsers.size,
    },
    features: { ...metrics },
    systemHealth: {
      status: overallSuccessRate >= 95 ? 'excellent'
        : overallSuccessRate >= 85 ? 'good'
        : overallSuccessRate >= 70 ? 'fair' : 'poor',
      uptime: '99.9%',
      lastIncident: null,
    },
  };
}

/**
 * Get historical trends for a feature from DB buckets.
 * @param {string} feature
 * @param {string} timeRange - '24h', '7d', or '30d'
 * @returns {Promise<Object>}
 */
export async function getFeatureTrends(feature, timeRange = '24h') {
  if (!isValidFeatureName(feature)) {
    return { feature, timeRange, trends: [], current: null };
  }

  try {

    const granularity = timeRange === '24h' ? 'hourly' : 'daily';
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 3600000);

    const [rows] = await sequelize.query(
      `SELECT b.*, (SELECT COUNT(DISTINCT "userId") FROM ai_metrics_bucket_users WHERE "bucketId" = b.id) as "uniqueUserCount"
       FROM ai_metrics_buckets b
       WHERE b.feature = $1 AND b.granularity = $2 AND b."bucketStart" >= $3
       ORDER BY b."bucketStart" ASC`,
      { bind: [feature, granularity, since] }
    );

    const trends = rows.map(r => ({
      time: r.bucketStart,
      requests: r.totalRequests,
      successRate: r.totalRequests > 0 ? (r.successCount / r.totalRequests) * 100 : 0,
      responseTime: r.totalRequests > 0 ? r.sumResponseTime / r.totalRequests : 0,
      uniqueUsers: parseInt(r.uniqueUserCount, 10) || 0,
    }));

    return {
      feature,
      timeRange,
      trends,
      current: metrics[feature] || null,
    };
  } catch (err) {
    logger.error('getFeatureTrends failed', { error: err.message });
    return { feature, timeRange, trends: [], current: metrics[feature] || null };
  }
}

/**
 * Get system health status.
 * @returns {Object}
 */
export function getSystemHealth() {
  const totalRequests = Object.values(metrics).reduce((sum, m) => sum + m.totalRequests, 0);
  const totalSuccessful = Object.values(metrics).reduce((sum, m) => sum + m.successfulRequests, 0);
  const successRate = totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 100;

  return {
    timestamp: new Date().toISOString(),
    overall: {
      status: successRate >= 95 ? 'healthy'
        : successRate >= 85 ? 'degraded' : 'unhealthy',
      successRate: `${successRate.toFixed(1)}%`,
      activeFeatures: Object.keys(metrics).filter(f => metrics[f].totalRequests > 0),
    },
    features: Object.entries(metrics).map(([name, m]) => ({
      name,
      status: m.totalRequests === 0 ? 'unused'
        : m.failedRequests / m.totalRequests < 0.1 ? 'healthy'
        : m.failedRequests / m.totalRequests < 0.25 ? 'degraded' : 'unhealthy',
      requests: m.totalRequests,
      successRate: m.totalRequests > 0
        ? `${((m.successfulRequests / m.totalRequests) * 100).toFixed(1)}%` : 'N/A',
      lastUsed: m.lastRequestTime || 'Never',
    })),
  };
}

/**
 * Reset all in-memory metrics (admin action).
 */
export function resetMetrics() {
  for (const key of Object.keys(metrics)) {
    delete metrics[key];
  }
  activeUsers.clear();
  dailyActiveUsers.clear();
  logger.info('AI monitoring metrics reset');
}

// ── Eval / Drift / AB integration (read-only from disk) ────────────────────

/**
 * Get latest eval baseline results.
 * @returns {Object|null}
 */
export function getEvalStatus() {
  return loadBaseline(EVAL_BASELINE_PATH);
}

// Drift cache (60-second TTL)
let _driftCache = null;
let _driftCacheExpiry = 0;
const DRIFT_CACHE_TTL_MS = 60000;

/**
 * Get drift comparison against baseline. Cached for 60 seconds.
 *
 * Compares the latest eval results (AI-PLANNING-VALIDATION-LATEST.json) against
 * the pinned baseline (AI-PLANNING-VALIDATION-BASELINE.json) using compareDrift.
 * If no separate latest file exists, compares baseline against itself (no drift).
 *
 * @returns {Object|null}
 */
export function getDriftStatus() {
  const now = Date.now();
  if (_driftCache !== null && now < _driftCacheExpiry) {
    return _driftCache;
  }

  const baseline = loadBaseline(EVAL_BASELINE_PATH);
  if (baseline === null) {
    _driftCache = null;
    _driftCacheExpiry = now + DRIFT_CACHE_TTL_MS;
    return null;
  }

  // Load the latest eval results; fall back to baseline if no separate latest file exists
  const latest = loadBaseline(EVAL_LATEST_PATH) || baseline;
  const driftResult = compareDrift(latest, baseline);

  const result = {
    ...driftResult,
    baselineTimestamp: baseline.timestamp || null,
    latestTimestamp: latest.timestamp || null,
    comparedAgainstSelf: latest === baseline,
  };

  _driftCache = result;
  _driftCacheExpiry = now + DRIFT_CACHE_TTL_MS;
  return result;
}

/**
 * Clear the drift cache (for testing).
 */
export function clearDriftCache() {
  _driftCache = null;
  _driftCacheExpiry = 0;
}

/**
 * Get latest A/B test report.
 * @returns {Object|null}
 */
export function getAbStatus() {
  return loadBaseline(AB_REPORT_PATH);
}

/**
 * Get provider metrics from AiInteractionLog (last 24h).
 * @returns {Promise<Object>}
 */
export async function getProviderMetrics() {
  try {

    const since = new Date(Date.now() - 24 * 3600000);

    const [rows] = await sequelize.query(
      `SELECT provider, model, status,
              COUNT(*) as count,
              AVG("durationMs") as "avgDuration",
              SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as "successCount"
       FROM ai_interaction_logs
       WHERE "createdAt" >= $1
       GROUP BY provider, model, status
       ORDER BY provider, model`,
      { bind: [since] }
    );

    return {
      timestamp: new Date().toISOString(),
      period: '24h',
      providers: rows,
    };
  } catch (err) {
    logger.error('getProviderMetrics failed', { error: err.message });
    return { timestamp: new Date().toISOString(), period: '24h', providers: [] };
  }
}

/**
 * Get 24-hour summary digest from hourly buckets.
 * @returns {Promise<Object>}
 */
export async function getDailyDigest() {
  try {

    const since = new Date(Date.now() - 24 * 3600000);

    const [rows] = await sequelize.query(
      `SELECT feature,
              SUM("totalRequests") as "totalRequests",
              SUM("successCount") as "successCount",
              SUM("failCount") as "failCount",
              SUM("totalTokens") as "totalTokens",
              AVG("sumResponseTime" / NULLIF("totalRequests", 0)) as "avgResponseTime",
              MIN("minResponseTime") as "minResponseTime",
              MAX("maxResponseTime") as "maxResponseTime"
       FROM ai_metrics_buckets
       WHERE granularity = 'hourly' AND "bucketStart" >= $1
       GROUP BY feature`,
      { bind: [since] }
    );

    return {
      timestamp: new Date().toISOString(),
      period: '24h',
      features: rows.map(r => ({
        feature: r.feature,
        totalRequests: parseInt(r.totalRequests, 10) || 0,
        successCount: parseInt(r.successCount, 10) || 0,
        failCount: parseInt(r.failCount, 10) || 0,
        totalTokens: parseInt(r.totalTokens, 10) || 0,
        avgResponseTime: parseFloat(r.avgResponseTime) || 0,
        minResponseTime: parseFloat(r.minResponseTime) || null,
        maxResponseTime: parseFloat(r.maxResponseTime) || null,
      })),
    };
  } catch (err) {
    logger.error('getDailyDigest failed', { error: err.message });
    return { timestamp: new Date().toISOString(), period: '24h', features: [] };
  }
}

/**
 * Reset alert evaluation timer (for testing).
 */
export function resetAlertTimer() {
  _lastAlertEvalTime = 0;
}

// ── Exports for testing ─────────────────────────────────────────────────────
export { isValidFeatureName, metrics as _metrics, activeUsers as _activeUsers, dailyActiveUsers as _dailyActiveUsers };
