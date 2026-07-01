import express from 'express';
import { protect, rateLimiter } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import {
  awardUnityWeaverProsocialXP,
  getUnityWeaverProsocialEvents,
} from '../services/unityWeaver/prosocialXPService.mjs';

const router = express.Router();

const prosocialAwardLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 40,
  message: 'Too many good-energy XP actions. Please slow down and try again later.',
});

router.use(protect);

router.get('/prosocial-events', async (_req, res) => {
  return res.json({
    success: true,
    events: getUnityWeaverProsocialEvents(),
  });
});

router.post('/prosocial-events/award', prosocialAwardLimiter, async (req, res) => {
  try {
    const result = await awardUnityWeaverProsocialXP({
      actorUserId: req.user.id,
      eventId: req.body?.eventId,
      targetUserId: req.body?.targetUserId,
      contextType: req.body?.contextType || 'dashboard',
      contextId: req.body?.contextId,
    });

    if (result.error) {
      return res.status(result.error.status || 400).json({
        success: false,
        message: result.error.message || 'Unable to award prosocial XP',
      });
    }

    const statusCode = result.status === 'requires_validation' ? 202 : 200;
    return res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Unity Weaver prosocial XP award failed', {
      userId: req.user?.id,
      eventId: req.body?.eventId,
      error: error.message,
    });

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Failed to process prosocial XP action',
    });
  }
});

export default router;
