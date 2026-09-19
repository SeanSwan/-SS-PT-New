import express from 'express';
import { Op } from 'sequelize';
import { protect } from '../../middleware/authMiddleware.mjs';
import logger from '../../utils/logger.mjs';

const router = express.Router();

// Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §4.4
// S2 Proof Card. Zero new tables — this is an aggregate view over `workout_sessions`
// (backend/models/WorkoutSession.mjs) plus the display name off "Users".
//
// PRIVACY (rule 8 / blueprint ban #7): the card is OWN-STATS ONLY. A session that is not
// the caller's is reported as 404, never 403 — a 403 would confirm that someone else's
// session id exists. No other member's id, name, or metric ever appears in the payload.

const STREAK_LOOKBACK_DAYS = 60;

const toUtcDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const dayKeyOffset = (dayKey, offset) => {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

/**
 * Consecutive-day streak ending today or yesterday.
 * Yesterday is allowed so a streak is not shown as broken before the member trains today.
 */
export const computeStreakDays = (dayKeys, todayKey) => {
  const unique = new Set(dayKeys.filter(Boolean));
  if (unique.size === 0) return 0;

  let cursor = unique.has(todayKey) ? todayKey : dayKeyOffset(todayKey, -1);
  if (!unique.has(cursor)) return 0;

  let streak = 0;
  while (unique.has(cursor)) {
    streak += 1;
    cursor = dayKeyOffset(cursor, -1);
  }
  return streak;
};

const finite = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const loadModels = async () => {
  const [WorkoutSession, User] = await Promise.all([
    import('../../models/WorkoutSession.mjs'),
    import('../../models/User.mjs'),
  ]);
  return { WorkoutSession: WorkoutSession.default, User: User.default };
};

/**
 * Build the proof-card payload for ONE already-authorised session.
 * `session` must already be confirmed to belong to `userId` and to be completed.
 */
const buildProofCardPayload = async (session, userId) => {
  const { WorkoutSession, User } = await loadModels();

  const member = await User.findByPk(userId, {
    attributes: ['id', 'firstName', 'lastName', 'username'],
  });
  const memberDisplayName =
    (member && (member.username || [member.firstName, member.lastName].filter(Boolean).join(' '))) ||
    'Athlete';

  // Streak is computed from the caller's own completed sessions only.
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - STREAK_LOOKBACK_DAYS);
  const recent = await WorkoutSession.findAll({
    where: { userId, status: 'completed', date: { [Op.gte]: since } },
    attributes: ['date'],
    raw: true,
  });
  const streakDays = computeStreakDays(recent.map((row) => toUtcDayKey(row.date)), toUtcDayKey(new Date()));

  // Honest mini-bar baseline: the member's OWN recent typical session, so the card can
  // say "this vs your usual" with real numbers. Excludes the session being shown.
  // (The blueprint's "Victory mini-bar for sets" needs a comparable series; sets-per-
  // exercise lives behind workout_exercises -> a set-level join, so v1 compares against
  // the member's own baseline rather than drawing a decorative chart.)
  const baselineSince = new Date();
  baselineSince.setUTCDate(baselineSince.getUTCDate() - 30);
  const baselineRows = await WorkoutSession.findAll({
    where: {
      userId,
      status: 'completed',
      date: { [Op.gte]: baselineSince },
      id: { [Op.ne]: session.id },
    },
    attributes: ['totalSets', 'totalWeight'],
    raw: true,
  });
  const avg = (rows, field) => {
    const values = rows.map((row) => finite(row[field])).filter((value) => value > 0);
    if (values.length === 0) return 0;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  };

  return {
    sessionId: session.id,
    memberDisplayName,
    workoutName: session.title || 'Training session',
    date: toUtcDayKey(session.date),
    durationMin: finite(session.duration),
    totalVolume: finite(session.totalWeight),
    totalReps: finite(session.totalReps),
    setsCount: finite(session.totalSets),
    xpEarned: finite(session.experiencePoints),
    streakDays,
    baseline: {
      windowDays: 30,
      sampleSize: baselineRows.length,
      avgSets: avg(baselineRows, 'totalSets'),
      avgVolume: avg(baselineRows, 'totalWeight'),
    },
  };
};

/**
 * GET /api/social/proof-card/latest
 * The member's most recent completed session. Registered BEFORE '/:sessionId' so the
 * literal path is not swallowed by the parameter route.
 * 200 { proofCard } | 204 no completed session yet (the caller renders nothing).
 */
router.get('/latest', protect, async (req, res) => {
  try {
    const { WorkoutSession } = await loadModels();
    const session = await WorkoutSession.findOne({
      where: { userId: req.user.id, status: 'completed' },
      order: [['date', 'DESC']],
    });
    if (!session) {
      // No proof yet is a normal state, not an error — the surface self-hides.
      return res.status(204).end();
    }
    return res.status(200).json({ success: true, proofCard: await buildProofCardPayload(session, req.user.id) });
  } catch (error) {
    logger.error('Latest proof card load failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error while building the proof card.' });
  }
});

/**
 * GET /api/social/proof-card/:sessionId
 * 200 { success, proofCard: {...} } — the caller's own completed session.
 * 404 unknown session OR a session belonging to someone else (no existence leak).
 * 409 session exists but is not completed (nothing to prove yet).
 * 422 malformed id.
 */
router.get('/:sessionId', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
      return res.status(422).json({ success: false, message: 'A valid sessionId is required.' });
    }

    const { WorkoutSession } = await loadModels();

    const session = await WorkoutSession.findOne({
      where: { id: sessionId, userId: req.user.id },
    });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Workout session not found.' });
    }
    if (session.status !== 'completed') {
      return res.status(409).json({ success: false, message: 'Only completed workouts have a proof card.' });
    }

    return res.status(200).json({ success: true, proofCard: await buildProofCardPayload(session, req.user.id) });
  } catch (error) {
    logger.error('Proof card load failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error while building the proof card.' });
  }
});

export default router;
