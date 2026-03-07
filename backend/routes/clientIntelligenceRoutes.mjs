/**
 * Client Intelligence Routes -- Phase 9a
 * =======================================
 * REST API for the Cross-Component Intelligence Layer.
 *
 * GET /api/client-intelligence/:clientId  -- Full client context
 * GET /api/admin/intelligence/overview    -- Admin dashboard overview
 */

import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.mjs';
import { getClientContext, getAdminIntelligenceOverview } from '../services/clientIntelligenceService.mjs';
import logger from '../utils/logger.mjs';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * GET /api/client-intelligence/:clientId
 * Returns unified context for a specific client.
 * Trainers can only access their own clients; admins can access any.
 */
router.get('/:clientId', authorize('admin', 'trainer'), async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    if (isNaN(clientId) || clientId < 1) {
      return res.status(400).json({ success: false, error: 'Valid clientId is required' });
    }

    const trainerId = req.user.id;
    const context = await getClientContext(clientId, trainerId);

    return res.json({
      success: true,
      context,
    });
  } catch (err) {
    logger.error('[ClientIntelligence] Context fetch failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load client context' });
  }
});

/**
 * GET /api/admin/intelligence/overview
 * Returns admin-level overview for dashboard widgets.
 */
router.get('/', authorize('admin', 'trainer'), async (req, res) => {
  try {
    const trainerId = req.user.id;
    const overview = await getAdminIntelligenceOverview(trainerId);

    return res.json({
      success: true,
      overview,
    });
  } catch (err) {
    logger.error('[ClientIntelligence] Overview fetch failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load intelligence overview' });
  }
});

export default router;
