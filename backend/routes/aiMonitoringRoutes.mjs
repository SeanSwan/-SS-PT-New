/**
 * AI Monitoring Routes — Phase 10
 * =================================
 * Thin wrapper delegating to monitoringService + alertEngine.
 * Re-exports updateMetrics for backward compatibility with existing callers.
 *
 * Existing endpoints preserved:
 *   GET  /metrics         — Overview + per-feature metrics
 *   GET  /trends/:feature — Historical trends from DB
 *   GET  /health          — System health status
 *   POST /reset           — Reset in-memory metrics (admin only)
 *
 * New admin endpoints (Phase 10):
 *   GET  /alerts                  — Active alerts list
 *   POST /alerts/:id/acknowledge  — Acknowledge an alert
 *   POST /alerts/:id/resolve      — Resolve an alert
 *   GET  /eval-status             — Latest eval results
 *   GET  /drift-status            — Drift comparison
 *   GET  /ab-status               — Latest A/B report
 *   GET  /providers               — Provider breakdown
 *   GET  /digest                  — 24h summary
 */
import express from 'express';
import { protect as authMiddleware, adminOnly } from '../middleware/authMiddleware.mjs';
import {
  getMetricsSnapshot,
  getFeatureTrends,
  getSystemHealth,
  resetMetrics,
  getEvalStatus,
  getDriftStatus,
  getAbStatus,
  getProviderMetrics,
  getDailyDigest,
  isValidFeatureName,
} from '../services/monitoring/monitoringService.mjs';
import {
  evaluateThresholds,
  persistAlerts,
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
} from '../services/monitoring/alertEngine.mjs';
import logger from '../utils/logger.mjs';

// Re-export updateMetrics for backward compatibility
// Callers: aiWorkoutController.mjs, longHorizonController.mjs, mcpRoutes.mjs
export { updateMetrics } from '../services/monitoring/monitoringService.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'INTERNAL_ERROR';

const sendInternalError = (res, message) => res.status(500).json({
  success: false,
  message,
  code: INTERNAL_ERROR,
});

const parsePositiveInteger = (value) => {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

// ── Existing endpoints (backward-compatible) ────────────────────────────────

router.get('/metrics', authMiddleware, (req, res) => {
  try {
    res.json(getMetricsSnapshot());
  } catch (error) {
    logger.error('Error getting AI metrics:', error);
    return sendInternalError(res, 'Failed to retrieve AI metrics');
  }
});

router.get('/trends/:feature', authMiddleware, async (req, res) => {
  try {
    const { feature } = req.params;
    const { timeRange = '24h' } = req.query;

    if (!isValidFeatureName(feature)) {
      return res.status(400).json({ success: false, message: 'Invalid feature name' });
    }

    const trends = await getFeatureTrends(feature, timeRange);
    res.json(trends);
  } catch (error) {
    logger.error('Error getting feature trends:', error);
    return sendInternalError(res, 'Failed to retrieve feature trends');
  }
});

router.get('/health', authMiddleware, (req, res) => {
  try {
    const health = getSystemHealth();
    const statusCode = health.overall.status === 'healthy' ? 200
      : health.overall.status === 'degraded' ? 206 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Error checking AI health:', error);
    return sendInternalError(res, 'Failed to check AI system health');
  }
});

router.post('/reset', authMiddleware, adminOnly, (req, res) => {
  try {
    resetMetrics();
    logger.info('AI metrics reset by admin', { userId: req.user.id });
    res.json({ success: true, message: 'AI metrics reset successfully', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error resetting AI metrics:', error);
    return sendInternalError(res, 'Failed to reset AI metrics');
  }
});

// ── New admin endpoints (Phase 10) ──────────────────────────────────────────

router.get('/alerts', authMiddleware, adminOnly, async (req, res) => {
  try {
    const alerts = await getActiveAlerts();
    res.json({ alerts, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error getting alerts:', error);
    return sendInternalError(res, 'Failed to retrieve alerts');
  }
});

router.post('/alerts/:id/acknowledge', authMiddleware, adminOnly, async (req, res) => {
  try {
    const alertId = parsePositiveInteger(req.params.id);
    if (!alertId) {
      return res.status(400).json({ success: false, message: 'Invalid alert id' });
    }

    await acknowledgeAlert(alertId);
    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    return sendInternalError(res, 'Failed to acknowledge alert');
  }
});

router.post('/alerts/:id/resolve', authMiddleware, adminOnly, async (req, res) => {
  try {
    const alertId = parsePositiveInteger(req.params.id);
    if (!alertId) {
      return res.status(400).json({ success: false, message: 'Invalid alert id' });
    }

    await resolveAlert(alertId);
    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    logger.error('Error resolving alert:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    return sendInternalError(res, 'Failed to resolve alert');
  }
});

router.get('/eval-status', authMiddleware, adminOnly, (req, res) => {
  try {
    const evalData = getEvalStatus();
    res.json({ evalStatus: evalData, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error getting eval status:', error);
    return sendInternalError(res, 'Failed to retrieve eval status');
  }
});

router.get('/drift-status', authMiddleware, adminOnly, (req, res) => {
  try {
    const driftData = getDriftStatus();
    res.json({ driftStatus: driftData, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error getting drift status:', error);
    return sendInternalError(res, 'Failed to retrieve drift status');
  }
});

router.get('/ab-status', authMiddleware, adminOnly, (req, res) => {
  try {
    const abData = getAbStatus();
    res.json({ abStatus: abData, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error getting A/B status:', error);
    return sendInternalError(res, 'Failed to retrieve A/B status');
  }
});

router.get('/providers', authMiddleware, adminOnly, async (req, res) => {
  try {
    const providerData = await getProviderMetrics();
    res.json(providerData);
  } catch (error) {
    logger.error('Error getting provider metrics:', error);
    return sendInternalError(res, 'Failed to retrieve provider metrics');
  }
});

router.get('/digest', authMiddleware, adminOnly, async (req, res) => {
  try {
    const digest = await getDailyDigest();
    res.json(digest);
  } catch (error) {
    logger.error('Error getting daily digest:', error);
    return sendInternalError(res, 'Failed to retrieve daily digest');
  }
});

export default router;
