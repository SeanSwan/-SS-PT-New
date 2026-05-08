/**
 * coachIntakeRoutes.mjs
 * =====================
 * Canonical Swan Coach intake queue API:
 *   POST /api/coach/intake        - create encrypted typed/narrative intake
 *   GET  /api/coach/intake/queue  - list unified Coach + PLAUD queue metadata
 */
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import {
  confirmCoachIntakeAudioOrderHandler,
  createCoachTextIntakeHandler,
  listCoachIntakeHandler,
} from '../controllers/coachIntakeController.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

router.use(protect);
router.use(authorize(['admin', 'trainer']));
router.use(express.json({ limit: '256kb' }));

router.post('/', createCoachTextIntakeHandler);
router.get('/queue', listCoachIntakeHandler);
router.post('/:id/audio-order/confirm', confirmCoachIntakeAudioOrderHandler);

router.use((err, _req, res, _next) => {
  logger.error('[coachIntakeRoutes] unhandled error: %s', err.message);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

export default router;
