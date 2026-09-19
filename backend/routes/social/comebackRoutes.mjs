import express from 'express';
import { Op } from 'sequelize';
import { protect } from '../../middleware/authMiddleware.mjs';
import logger from '../../utils/logger.mjs';

/**
 * Comeback Moment — a welcome-back recognition after a real absence.
 * Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §6 S4
 *
 * DESIGN DECISION (deliberate, and testable): this endpoint does NOT return the length of
 * the absence, nor the previous session date. It returns only a boolean and a cheer count.
 * If the gap is not in the payload, no client can ever render "you were gone 9 days" —
 * the shame-free requirement is enforced by the data contract instead of by copy review.
 *
 * The 💪 counter deliberately counts EXISTING SocialLike reactions rather than introducing a
 * new reaction type: extending the SocialLike ENUM is blueprint ban #3 (schema-drift class).
 */
const router = express.Router();

const ABSENCE_DAYS = 7;
const RECENT_WINDOW_DAYS = 7;
const CHEER_WINDOW_DAYS = 7;

const daysBetween = (later, earlier) =>
  Math.floor((later.getTime() - earlier.getTime()) / 86400000);

/**
 * Pure predicate — exported so the rule can be unit-tested without a database.
 * `dates` is a list of completed-session Dates in any order.
 * True when the newest session happened after a real absence, and recently enough to still
 * be worth acknowledging.
 */
export const isComebackMoment = (dates, now = new Date()) => {
  const times = dates
    .map((value) => (value instanceof Date ? value.getTime() : Date.parse(value)))
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => b - a);
  if (times.length < 2) return false;

  const newest = new Date(times[0]);
  const previous = new Date(times[1]);
  if (daysBetween(now, newest) > RECENT_WINDOW_DAYS) return false;
  return daysBetween(newest, previous) >= ABSENCE_DAYS;
};

/**
 * GET /api/social/comeback
 * 200 { success, celebrate: bool, cheers: number }
 * Nothing else — by design (see the file header).
 */
router.get('/', protect, async (req, res) => {
  try {
    const WorkoutSession = (await import('../../models/WorkoutSession.mjs')).default;
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 120);

    const sessions = await WorkoutSession.findAll({
      where: { userId: req.user.id, status: 'completed', date: { [Op.gte]: since } },
      attributes: ['date'],
      order: [['date', 'DESC']],
      raw: true
    });

    const celebrate = isComebackMoment(sessions.map((row) => row.date));
    if (!celebrate) {
      return res.status(200).json({ success: true, celebrate: false, cheers: 0 });
    }

    // Cheers: reactions on the member's OWN recent posts. Existing reaction types only.
    let cheers = 0;
    try {
      const [SocialPost, SocialLike] = await Promise.all([
        import('../../models/social/SocialPost.mjs'),
        import('../../models/social/SocialLike.mjs')
      ]);
      const cheerSince = new Date();
      cheerSince.setUTCDate(cheerSince.getUTCDate() - CHEER_WINDOW_DAYS);
      const posts = await SocialPost.findAll({
        where: { userId: req.user.id, createdAt: { [Op.gte]: cheerSince } },
        attributes: ['id'],
        raw: true
      });
      const postIds = posts.map((post) => post.id);
      if (postIds.length > 0) {
        cheers = await SocialLike.default.count({
          where: { targetType: 'post', targetId: { [Op.in]: postIds } }
        });
      }
    } catch (cheerError) {
      // The moment still fires without a count — the count is garnish, not the point.
      logger.warn('Comeback cheer count failed (non-fatal):', cheerError?.message);
    }

    return res.status(200).json({ success: true, celebrate: true, cheers });
  } catch (error) {
    logger.error('Comeback check failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error while checking for a comeback.' });
  }
});

export default router;
