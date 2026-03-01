/**
 * Alert Engine — Phase 10
 * ========================
 * Threshold-based alerting for AI monitoring metrics.
 * Evaluates feature metrics against configurable thresholds,
 * creates/resolves alerts in the AiMonitoringAlert table.
 *
 * Default thresholds are configurable via environment variables.
 */
import logger from '../../utils/logger.mjs';

// ── Configurable thresholds (env var overrides) ─────────────────────────────

function envFloat(key, defaultVal) {
  const v = process.env[key];
  if (v == null) return defaultVal;
  const parsed = parseFloat(v);
  return Number.isFinite(parsed) ? parsed : defaultVal;
}

export const THRESHOLDS = {
  high_error_rate: envFloat('AI_MONITOR_HIGH_ERROR_RATE', 0.25),
  elevated_error_rate: envFloat('AI_MONITOR_ELEVATED_ERROR_RATE', 0.10),
  high_latency: envFloat('AI_MONITOR_HIGH_LATENCY_MS', 5000),
  critical_latency: envFloat('AI_MONITOR_CRITICAL_LATENCY_MS', 10000),
  token_budget: envFloat('AI_MONITOR_TOKEN_BUDGET', 1000000),
};

// ── Threshold evaluation ────────────────────────────────────────────────────

/**
 * Evaluate metrics snapshot against thresholds.
 * Returns an array of alert descriptors for any threshold violations.
 *
 * @param {Object} metricsSnapshot - Output of getMetricsSnapshot()
 * @returns {Array<{alertType: string, severity: string, feature: string|null, message: string, metadata: Object}>}
 */
export function evaluateThresholds(metricsSnapshot) {
  const alerts = [];
  const features = metricsSnapshot?.features || {};

  for (const [feature, m] of Object.entries(features)) {
    if (m.totalRequests === 0) continue;

    const errorRate = m.failedRequests / m.totalRequests;

    // Critical error rate
    if (errorRate > THRESHOLDS.high_error_rate) {
      alerts.push({
        alertType: 'high_error_rate',
        severity: 'critical',
        feature,
        message: `${feature}: error rate ${(errorRate * 100).toFixed(1)}% exceeds critical threshold ${(THRESHOLDS.high_error_rate * 100).toFixed(0)}%`,
        metadata: { errorRate, threshold: THRESHOLDS.high_error_rate, totalRequests: m.totalRequests },
      });
    } else if (errorRate > THRESHOLDS.elevated_error_rate) {
      // Warning error rate (only if not already critical)
      alerts.push({
        alertType: 'elevated_error_rate',
        severity: 'warning',
        feature,
        message: `${feature}: error rate ${(errorRate * 100).toFixed(1)}% exceeds warning threshold ${(THRESHOLDS.elevated_error_rate * 100).toFixed(0)}%`,
        metadata: { errorRate, threshold: THRESHOLDS.elevated_error_rate, totalRequests: m.totalRequests },
      });
    }

    // Critical latency
    if (m.averageResponseTime > THRESHOLDS.critical_latency) {
      alerts.push({
        alertType: 'critical_latency',
        severity: 'critical',
        feature,
        message: `${feature}: avg response time ${m.averageResponseTime.toFixed(0)}ms exceeds critical threshold ${THRESHOLDS.critical_latency}ms`,
        metadata: { avgResponseTime: m.averageResponseTime, threshold: THRESHOLDS.critical_latency },
      });
    } else if (m.averageResponseTime > THRESHOLDS.high_latency) {
      // Warning latency (only if not already critical)
      alerts.push({
        alertType: 'high_latency',
        severity: 'warning',
        feature,
        message: `${feature}: avg response time ${m.averageResponseTime.toFixed(0)}ms exceeds warning threshold ${THRESHOLDS.high_latency}ms`,
        metadata: { avgResponseTime: m.averageResponseTime, threshold: THRESHOLDS.high_latency },
      });
    }

    // Token budget
    if ((m.totalTokensUsed || 0) > THRESHOLDS.token_budget) {
      alerts.push({
        alertType: 'token_budget',
        severity: 'warning',
        feature,
        message: `${feature}: total tokens ${m.totalTokensUsed} exceeds budget ${THRESHOLDS.token_budget}`,
        metadata: { totalTokensUsed: m.totalTokensUsed, threshold: THRESHOLDS.token_budget },
      });
    }
  }

  return alerts;
}

// ── DB operations ───────────────────────────────────────────────────────────

/** @returns {Promise<import('../../models/AiMonitoringAlert.mjs').default>} */
async function getAlertModel() {
  const { getAiMonitoringAlert } = await import('../../models/index.mjs');
  return getAiMonitoringAlert();
}

/**
 * Persist new alerts to DB and auto-resolve cleared ones.
 *
 * - Creates new alerts for threshold violations not already active
 * - Auto-resolves active alerts whose condition has cleared
 *
 * @param {Array} currentAlerts - Output of evaluateThresholds()
 */
export async function persistAlerts(currentAlerts) {
  try {
    const AiMonitoringAlert = await getAlertModel();

    // Get all currently active alerts
    const activeAlerts = await AiMonitoringAlert.findAll({
      where: { status: 'active' },
    });

    // Build a set of current violation keys
    const currentKeys = new Set(
      currentAlerts.map(a => `${a.alertType}:${a.feature || 'system'}`)
    );

    // Auto-resolve alerts whose condition has cleared
    for (const active of activeAlerts) {
      const key = `${active.alertType}:${active.feature || 'system'}`;
      if (!currentKeys.has(key)) {
        await active.update({
          status: 'resolved',
          resolvedAt: new Date(),
        });
        logger.info(`Alert auto-resolved: ${active.alertType} for ${active.feature || 'system'}`);
      }
    }

    // Create new alerts (skip if already active for same type+feature)
    const activeKeys = new Set(
      activeAlerts.map(a => `${a.alertType}:${a.feature || 'system'}`)
    );

    for (const alert of currentAlerts) {
      const key = `${alert.alertType}:${alert.feature || 'system'}`;
      if (!activeKeys.has(key)) {
        await AiMonitoringAlert.create(alert);
        logger.info(`New alert created: ${alert.alertType} for ${alert.feature || 'system'} (${alert.severity})`);
      }
    }
  } catch (err) {
    logger.error('persistAlerts failed', { error: err.message });
  }
}

/**
 * Get all active alerts.
 * @returns {Promise<Array>}
 */
export async function getActiveAlerts() {
  try {
    const AiMonitoringAlert = await getAlertModel();
    return await AiMonitoringAlert.findAll({
      where: { status: 'active' },
      order: [['createdAt', 'DESC']],
    });
  } catch (err) {
    logger.error('getActiveAlerts failed', { error: err.message });
    return [];
  }
}

/**
 * Acknowledge an alert.
 * @param {number} alertId
 */
export async function acknowledgeAlert(alertId) {
  const AiMonitoringAlert = await getAlertModel();
  const alert = await AiMonitoringAlert.findByPk(alertId);
  if (!alert) throw new Error(`Alert ${alertId} not found`);
  await alert.update({ status: 'acknowledged' });
}

/**
 * Resolve an alert.
 * @param {number} alertId
 */
export async function resolveAlert(alertId) {
  const AiMonitoringAlert = await getAlertModel();
  const alert = await AiMonitoringAlert.findByPk(alertId);
  if (!alert) throw new Error(`Alert ${alertId} not found`);
  await alert.update({ status: 'resolved', resolvedAt: new Date() });
}
