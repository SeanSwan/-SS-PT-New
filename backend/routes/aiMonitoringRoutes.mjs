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

// ── Existing endpoints (backward-compatible) ────────────────────────────────

router.get('/metrics', authMiddleware, (req, res) => {
  try {
    res.json(getMetricsSnapshot());
  } catch (error) {
    logger.error('Error getting AI metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve AI metrics', error: error.message });
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
    res.status(500).json({ success: false, message: 'Failed to retrieve feature trends', error: error.message });
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
    res.status(500).json({ success: false, message: 'Failed to check AI system health', error: error.message });
  }
});

router.post('/reset', authMiddleware, adminOnly, (req, res) => {
  try {
    resetMetrics();
    logger.info('AI metrics reset by admin', { userId: req.user.id });
    res.json({ success: true, message: 'AI metrics reset successfully', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error resetting AI metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to reset AI metrics', error: error.message });
  }
});

// ── New admin endpoints (Phase 10) ──────────────────────────────────────────

router.get('/alerts', authMiddleware, adminOnly, async (req, res) => {
  try {
    const alerts = await getActiveAlerts();
    res.json({ alerts, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error getting alerts:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve alerts', error: error.message });
  }
});

router.post('/alerts/:id/acknowledge', authMiddleware, adminOnly, async (req, res) => {
  try {
    await acknowledgeAlert(parseInt(req.params.id, 10));
    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
});

router.post('/alerts/:id/resolve', authMiddleware, adminOnly, async (req, res) => {
  try {
    await resolveAlert(parseInt(req.params.id, 10));
    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    logger.error('Error resolving alert:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
});

router.get('/eval-status', authMiddleware, adminOnly, (req, res) => {
  try {
    const evalData = getEvalStatus();
    res.json({ evalStatus: evalData, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error getting eval status:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve eval status', error: error.message });
  }
});

router.get('/drift-status', authMiddleware, adminOnly, (req, res) => {
  try {
    const driftData = getDriftStatus();
    res.json({ driftStatus: driftData, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error getting drift status:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve drift status', error: error.message });
  }
});

router.get('/ab-status', authMiddleware, adminOnly, (req, res) => {
  try {
    const abData = getAbStatus();
    res.json({ abStatus: abData, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error getting A/B status:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve A/B status', error: error.message });
  }
});

router.get('/providers', authMiddleware, adminOnly, async (req, res) => {
  try {
    const providerData = await getProviderMetrics();
    res.json(providerData);
  } catch (error) {
    logger.error('Error getting provider metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve provider metrics', error: error.message });
  }
});

router.get('/digest', authMiddleware, adminOnly, async (req, res) => {
  try {
    const digest = await getDailyDigest();
    res.json(digest);
  } catch (error) {
    logger.error('Error getting daily digest:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve daily digest', error: error.message });
  }
});

export default router;
