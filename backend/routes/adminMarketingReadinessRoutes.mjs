/**
 * ROUTES: Admin Marketing Readiness
 * =================================
 * Prefix: /api/admin/marketing-readiness
 * Auth: protect + adminOnly
 *
 * Single read-only endpoint that reports the real operational state of every
 * marketing subsystem (social publishing, automation, email, lead capture,
 * calendar) plus an honest labs/demo flag for the not-yet-wired content tools.
 * No mutations, no sends — pure aggregation via marketingReadinessService.
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { getMarketingReadiness } from '../services/marketingReadinessService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/', async (_req, res) => {
  try {
    const data = await getMarketingReadiness();
    return res.json({ success: true, data });
  } catch (err) {
    logger.error('Marketing readiness aggregation failed:', err?.message);
    return res.status(500).json({ success: false, message: 'Failed to load marketing readiness' });
  }
});

export default router;
