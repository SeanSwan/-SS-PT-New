/**
 * ============================================================================
 * FILE: trainingPlanProjectionRoutes.mjs
 * PURPOSE: Expose bounded read-only plan projections to authorized schedules.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Serves one protected GET endpoint behind a fail-closed
 * feature flag and returns only trusted validation/access errors.
 * HOW IT FITS IN THE APP: Mounted at /api/training-plan-projections, separate
 * from appointment routes so projections cannot inherit mutation semantics.
 * KEY DECISIONS: No cache and no Session, credit, package, or billing imports.
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import {
  TrainingPlanProjectionError,
  fetchTrainingPlanProjections,
} from '../services/trainingPlanProjectionService.mjs';

const router = express.Router();
const enabled = () => process.env.TRAINING_PLAN_SCHEDULE_PROJECTIONS === 'true';

router.get('/', protect, async (req, res) => {
  if (!enabled()) {
    return res.status(404).json({
      success: false,
      code: 'TRAINING_PLAN_PROJECTIONS_DISABLED',
      message: 'Training plan projections are unavailable',
    });
  }

  try {
    const result = await fetchTrainingPlanProjections({
      actor: req.user,
      query: req.query,
      headerTimeZone: req.get('X-Client-Timezone'),
    });
    res.set('Cache-Control', 'private, no-store');
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error instanceof TrainingPlanProjectionError) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }
    logger.error('[TrainingPlanProjections] Read failed', {
      error: error?.message,
      actorId: req.user?.id,
    });
    return res.status(500).json({
      success: false,
      code: 'TRAINING_PLAN_PROJECTION_FAILED',
      message: 'Failed to load training plan projections',
    });
  }
});

export default router;