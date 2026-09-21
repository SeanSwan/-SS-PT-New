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
 * `revision` is projected as of 2026-09-20 (hostile review D9 / R2-04) and is not an engagement
 * metric — see the note on the attribute itself. Ban #2 is about social reaction counts.
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
        'publishedAt',
        // `revision` ADDED 2026-09-20 (hostile review D9 / R2-04). R2's measurement request is
        // "has this Spotlight changed since I last saw it", and the read path could not answer it:
        // the projection omitted the one field that carries that fact, so a client could only
        // compare content and guess. This is NOT a ban #2 violation — ban #2 forbids like /
        // comment / share-count fields, and a monotonic version counter is not an engagement
        // metric. It is a plain integer already stored on the row (`SwanSpotlight.mjs`), so this
        // is additive to the response and changes no existing consumer.
        //
        // The client-side DTO that consumes it belongs to R2's own slice; this is the backend
        // precondition, landed early so R2 is not blocked on it.
        'revision'
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
