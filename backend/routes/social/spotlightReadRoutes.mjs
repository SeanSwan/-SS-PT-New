import express from 'express';
import { Op } from 'sequelize';
import { protect } from '../../middleware/authMiddleware.mjs';
import logger from '../../utils/logger.mjs';

/**
 * Client-facing read path for the Swan Spotlight rail.
 * Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §6 S3
 *
 * Editorial, not social: this endpoint returns headline/dek/attribution only. There is no
 * like, comment, or share-count field, and none may be added (blueprint ban #2).
 *
 * Flag-gated: SPOTLIGHT_ENABLED=false returns an empty list rather than an error, so the
 * rail simply disappears and no client has to handle a failure state.
 */
const router = express.Router();

export const SPOTLIGHT_RAIL_LIMIT = 3;

export const isSpotlightEnabled = (env = process.env) => env.SPOTLIGHT_ENABLED === 'true';

router.get('/', protect, async (req, res) => {
  if (!isSpotlightEnabled()) {
    return res.status(200).json({ success: true, enabled: false, spotlights: [] });
  }

  try {
    const SwanSpotlight = (await import('../../models/social/SwanSpotlight.mjs')).default;
    const rows = await SwanSpotlight.findAll({
      where: {
        retracted: false,
        [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }]
      },
      order: [['sortWeight', 'DESC'], ['publishedAt', 'DESC']],
      limit: SPOTLIGHT_RAIL_LIMIT,
      attributes: [
        'itemId',
        'headline',
        'dek',
        'imageUrl',
        'sourceName',
        'sourceUrl',
        'curatorNote',
        'publishedAt'
      ],
      raw: true
    });

    return res.status(200).json({ success: true, enabled: true, spotlights: rows });
  } catch (error) {
    logger.error('Spotlight rail load failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error while loading spotlights.' });
  }
});

export default router;
