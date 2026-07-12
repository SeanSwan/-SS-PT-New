/**
 * Atomic reviewed-draft endpoint mounted at POST /api/macros/drafts.
 * Authentication is inherited from dailyMacroRoutes before this router mounts.
 */
import express from 'express';
import {
  NutritionDraftConflictError,
  NutritionDraftValidationError,
  saveReviewedNutritionDraft,
} from '../services/nutrition/reviewedNutritionDraftService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const result = await saveReviewedNutritionDraft(req.body, {
      userId: req.user.id,
      loggedByUserId: req.user.id,
    });
    return res.status(result.replayed ? 200 : 201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof NutritionDraftValidationError) {
      return res.status(400).json({
        success: false,
        error: 'Nutrition draft is invalid. Review the entry and try again.',
      });
    }
    if (error instanceof NutritionDraftConflictError) {
      return res.status(409).json({
        success: false,
        error: 'This nutrition draft is already being saved. Try again in a moment.',
      });
    }
    logger.error('[DailyMacroDraftRoutes] Atomic draft save failed', {
      error: error.message,
      userId: req.user?.id,
    });
    return res.status(500).json({
      success: false,
      error: 'Could not save this nutrition draft. No diary entries were added.',
    });
  }
});

export default router;
