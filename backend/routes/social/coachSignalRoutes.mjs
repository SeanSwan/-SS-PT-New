import express from 'express';
import { Op } from 'sequelize';
import { protect } from '../../middleware/authMiddleware.mjs';
import logger from '../../utils/logger.mjs';
import { createNotification } from '../../controllers/notificationController.mjs';

const router = express.Router();

// Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §4.3
// Coach Signal = rationed coach recognition (max 5 / coach / UTC day, 1 per post,
// coach must hold an ACTIVE assignment to the post author). Model is dedicated —
// never extend the SocialLike reactionType ENUM (schema-drift rule 58).

const DAILY_SIGNAL_CAP = 5;
const NOTE_MAX_LENGTH = 120;
const COACH_ROLES = new Set(['trainer', 'admin']);

// authMiddleware attaches req.user.id as a STRING (toStringId, authMiddleware.mjs:357)
// while Sequelize INTEGER columns surface as JS numbers. Every id comparison in this
// file therefore normalizes to string on both sides — a raw `===` here is always false
// (hostile review F2.1, 2026-09-18).
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

const startOfUtcDay = () => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return start;
};

const loadModels = async () => {
  const [CoachSignal, SocialPost, ClientTrainerAssignment, User] = await Promise.all([
    import('../../models/social/CoachSignal.mjs'),
    import('../../models/social/SocialPost.mjs'),
    import('../../models/ClientTrainerAssignment.mjs'),
    import('../../models/User.mjs'),
  ]);
  return {
    CoachSignal: CoachSignal.default,
    SocialPost: SocialPost.default,
    ClientTrainerAssignment: ClientTrainerAssignment.default,
    User: User.default,
  };
};

/**
 * POST /api/social/coach-signals
 * Body: { postId: number, note?: string }
 * 403 when the caller is not a coach, or does not hold an ACTIVE assignment to
 *   the post author; 404 unknown/most-restricted post; 409 duplicate coach+post;
 *   429 past the daily cap; 422 invalid note.
 */
router.post('/', protect, async (req, res) => {
  try {
    const { postId, note } = req.body ?? {};

    if (!COACH_ROLES.has(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Only coaches can send signals.' });
    }

    const parsedPostId = Number.parseInt(postId, 10);
    if (!Number.isInteger(parsedPostId) || parsedPostId < 1) {
      return res.status(422).json({ success: false, message: 'A valid postId is required.' });
    }

    // Over-length notes are REJECTED, never silently truncated (hostile review F2.4).
    // Silent mutation of user input is worse than an honest 422.
    let trimmedNote = null;
    if (typeof note === 'string') {
      const candidate = note.trim();
      if (candidate.length === 0) {
        return res.status(422).json({ success: false, message: 'Note cannot be blank when provided.' });
      }
      if (candidate.length > NOTE_MAX_LENGTH) {
        return res.status(422).json({
          success: false,
          message: `Note must be ${NOTE_MAX_LENGTH} characters or fewer.`,
        });
      }
      trimmedNote = candidate;
    }

    const { CoachSignal, SocialPost, ClientTrainerAssignment, User } = await loadModels();

    const post = await SocialPost.findOne({
      where: {
        id: parsedPostId,
        // moderationStatus is ENUM NOT NULL default 'approved' (SocialPost.mjs:33-38),
        // so NULL can never occur; only approved posts are signalable.
        moderationStatus: 'approved',
      },
      attributes: ['id', 'userId'],
    });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    if (sameId(post.userId, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Coaches cannot signal their own posts.' });
    }

    // Real assignment columns: clientId / trainerId / status ('active'|'inactive'|'pending').
    // No boolean active column exists in the DB — status is the source of truth (rule 58).
    // status is STRING allowNull:true with default 'active', so a NULL status from a legacy
    // raw-SQL row must still count as active (hostile review F2.3).
    const assignment = await ClientTrainerAssignment.findOne({
      where: {
        trainerId: req.user.id,
        clientId: post.userId,
        // SQL NULL never matches `IN (...)`, so NULL is expressed explicitly.
        [Op.or]: [{ status: 'active' }, { status: { [Op.is]: null } }],
      },
      attributes: ['id'],
    });
    if (!assignment) {
      return res.status(403).json({ success: false, message: 'You are not the active coach for this member.' });
    }

    const duplicate = await CoachSignal.findOne({
      where: { coachId: req.user.id, postId: parsedPostId },
      attributes: ['id'],
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'You already signaled this post.' });
    }

    // Quota admission is serialized PER COACH, with the count and the insert in ONE
    // transaction (hostile review D2 / F05). Counting and then inserting as two statements let
    // two concurrent requests for distinct posts both observe 4 and both insert — six signals
    // against a cap of five. The lock is a PostgreSQL advisory lock taken INSIDE the
    // transaction, so it is released on commit or rollback and holds across processes:
    // `06-bans.md` #42 forbids an in-memory-only quota, which is why this is not a local mutex.
    const sequelize = CoachSignal.sequelize;
    const admission = await sequelize.transaction(async (transaction) => {
      await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:key))', {
        replacements: { key: `coach-signal-quota:${req.user.id}` },
        transaction,
      });

      const sentToday = await CoachSignal.count({
        where: { coachId: req.user.id, createdAt: { [Op.gte]: startOfUtcDay() } },
        transaction,
      });
      if (sentToday >= DAILY_SIGNAL_CAP) return { capped: true };

      const created = await CoachSignal.create({
        coachId: req.user.id,
        memberId: post.userId,
        postId: parsedPostId,
        note: trimmedNote || null,
      }, { transaction });
      return { capped: false, signal: created };
    });

    if (admission.capped) {
      return res.status(429).json({
        success: false,
        message: `Daily signal limit reached (${DAILY_SIGNAL_CAP}). Signals stay precious.`,
      });
    }

    const signal = admission.signal;

    try {
      const coach = await User.findByPk(req.user.id, {
        attributes: ['id', 'firstName', 'lastName', 'username'],
      });
      const coachName = coach
        ? (coach.username || [coach.firstName, coach.lastName].filter(Boolean).join(' ') || 'Your coach')
        : 'Your coach';
      await createNotification({
        userId: post.userId,
        senderId: req.user.id,
        type: 'coach_signal',
        title: 'Coach Signal',
        message: trimmedNote
          ? `${coachName} sent you a signal: "${trimmedNote}"`
          : `${coachName} recognized your post. Keep it up!`,
      });
    } catch (notificationError) {
      // Signal persists even if the bell entry fails — the feed banner is the source of truth.
      logger.warn('Coach signal notification failed (non-fatal):', notificationError?.message);
    }

    return res.status(201).json({
      success: true,
      signal: { id: signal.id, postId: signal.postId, memberId: signal.memberId, note: signal.note, createdAt: signal.createdAt },
    });
  } catch (error) {
    // Postgres unique-violation race (double tap): treat as the duplicate path.
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'You already signaled this post.' });
    }
    logger.error('Coach signal creation failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error while sending signal.' });
  }
});

/**
 * GET /api/social/coach-signals/received — signals for the signed-in member (today backwards, 50 max).
 */
router.get('/received', protect, async (req, res) => {
  try {
    const { CoachSignal, User } = await loadModels();
    const signals = await CoachSignal.findAll({
      where: { memberId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
      attributes: ['id', 'postId', 'note', 'createdAt', 'coachId'],
    });
    const coachIds = [...new Set(signals.map((s) => s.coachId))];
    const coaches = coachIds.length
      ? await User.findAll({ where: { id: { [Op.in]: coachIds } }, attributes: ['id', 'firstName', 'lastName', 'username', 'photo'] })
      : [];
    const coachById = new Map(coaches.map((c) => [c.id, c]));
    return res.status(200).json({
      success: true,
      signals: signals.map((s) => {
        const coach = coachById.get(s.coachId);
        const plain = s.toJSON();
        return {
          ...plain,
          coach: coach
            ? { id: coach.id, displayName: coach.username || [coach.firstName, coach.lastName].filter(Boolean).join(' '), photo: coach.photo }
            : null,
        };
      }),
    });
  } catch (error) {
    logger.error('Coach signal listing failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error while loading signals.' });
  }
});

export default router;
