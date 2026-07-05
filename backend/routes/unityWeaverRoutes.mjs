import express from 'express';
import { protect, rateLimiter } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import {
  UNITY_WEAVER_PROSOCIAL_EVENTS,
  awardUnityWeaverProsocialXP,
  getUnityWeaverProsocialEvents,
} from '../services/unityWeaver/prosocialXPService.mjs';

const router = express.Router();

const prosocialAwardLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 40,
  message: 'Too many good-energy XP actions. Please slow down and try again later.',
});

function getEventRule(eventId) {
  if (typeof eventId !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(UNITY_WEAVER_PROSOCIAL_EVENTS, eventId)
    ? UNITY_WEAVER_PROSOCIAL_EVENTS[eventId]
    : null;
}

router.use(protect);

router.get('/prosocial-events', async (_req, res) => {
  return res.json({
    success: true,
    events: getUnityWeaverProsocialEvents(),
  });
});

router.post('/prosocial-events/award', prosocialAwardLimiter, async (req, res) => {
  try {
    const eventId = req.body?.eventId;
    const eventRule = getEventRule(eventId);

    if (!eventRule) {
      return res.status(400).json({
        success: false,
        message: 'Unknown prosocial event',
      });
    }

    if (!eventRule.requiresHumanOrSystemValidation) {
      return res.status(403).json({
        success: false,
        message: 'This prosocial event is awarded automatically after a verified social action, not through direct requests.',
      });
    }

    const result = await awardUnityWeaverProsocialXP({
      actorUserId: req.user.id,
      eventId,
      targetUserId: req.body?.targetUserId,
      contextType: req.body?.contextType || 'moderation_review',
      contextId: req.body?.contextId,
    });

    if (result.error) {
      return res.status(result.error.status || 400).json({
        success: false,
        message: result.error.message || 'Unable to process prosocial event',
      });
    }

    return res.status(202).json(result);
  } catch (error) {
    logger.error('Unity Weaver prosocial XP award failed', {
      userId: req.user?.id,
      eventId: req.body?.eventId,
      error: error.message,
    });

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Failed to process prosocial event',
    });
  }
});

export default router;
