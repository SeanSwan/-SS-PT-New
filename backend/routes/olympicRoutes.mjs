/**
 * ┌─── ROUTES: Virtual Olympics ──────────────────────────────────┐
 * │ PURPOSE: Ghost Racing competitive events — Pull-ups, Push-ups,│
 * │          Sprint. Users race against other users' recordings.  │
 * │ CEO RULING: Async Ghost Racing, NOT real-time multiplayer.    │
 * │ BASE PATH: /api/olympics                                      │
 * └───────────────────────────────────────────────────────────────┘
 */

import express from 'express';
import { Op } from 'sequelize';

const router = express.Router();

// ── Lazy model loader ──
async function getModels() {
  const OlympicEvent = (await import('../models/OlympicEvent.mjs')).default;
  const Gamification = (await import('../models/Gamification.mjs')).default;
  const User = (await import('../models/User.mjs')).default;
  return { OlympicEvent, Gamification, User };
}

// ── Auth middleware (imported lazily) ──
let protect;
async function ensureAuth(req, res, next) {
  if (!protect) {
    const mod = await import('../middleware/auth.mjs');
    protect = mod.protect || mod.default;
  }
  return protect(req, res, next);
}

const VALID_EVENTS = ['pullups', 'pushups', 'sprint'];

const XP_AWARDS = {
  participation: 25,
  personal_best: 75,
  top_10: 50,
  top_3: 100,
  first_place: 200,
};

// ── GET /api/olympics/events — List available events + user stats ──
router.get('/events', ensureAuth, async (req, res) => {
  try {
    const { OlympicEvent } = await getModels();
    const userId = req.user.id;

    const events = await Promise.all(
      VALID_EVENTS.map(async (eventType) => {
        const userBest = await OlympicEvent.findOne({
          where: { userId, eventType, isPersonalBest: true },
          order: [['score', eventType === 'sprint' ? 'ASC' : 'DESC']],
        });
        const totalAttempts = await OlympicEvent.count({
          where: { userId, eventType },
        });
        const totalParticipants = await OlympicEvent.count({
          where: { eventType },
          distinct: true,
          col: 'userId',
        });
        return {
          eventType,
          label: eventType === 'pullups' ? 'Pull-ups' : eventType === 'pushups' ? 'Push-ups' : 'Sprint',
          metric: eventType === 'sprint' ? 'seconds (lower is better)' : 'reps (higher is better)',
          userBest: userBest ? { score: userBest.score, date: userBest.createdAt } : null,
          totalAttempts,
          totalParticipants,
        };
      })
    );

    return res.json({ success: true, data: events });
  } catch (err) {
    console.error('Olympics events error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load events' });
  }
});

// ── POST /api/olympics/submit — Record a performance ──
router.post('/submit', ensureAuth, async (req, res) => {
  try {
    const { OlympicEvent, Gamification } = await getModels();
    const userId = req.user.id;
    const { eventType, score, timeSeries, duration, metadata } = req.body;

    if (!VALID_EVENTS.includes(eventType)) {
      return res.status(400).json({ success: false, error: `Invalid event. Must be: ${VALID_EVENTS.join(', ')}` });
    }
    if (typeof score !== 'number' || score <= 0) {
      return res.status(400).json({ success: false, error: 'Score must be a positive number' });
    }
    if (!duration || duration <= 0) {
      return res.status(400).json({ success: false, error: 'Duration must be a positive number' });
    }

    // Check if this is a personal best
    const isHigherBetter = eventType !== 'sprint';
    const previousBest = await OlympicEvent.findOne({
      where: { userId, eventType, isPersonalBest: true },
    });
    const isPersonalBest = !previousBest || (isHigherBetter ? score > previousBest.score : score < previousBest.score);

    // Clear old PB flag if new PB
    if (isPersonalBest && previousBest) {
      await previousBest.update({ isPersonalBest: false });
    }

    // Calculate XP
    let xpAwarded = XP_AWARDS.participation;
    if (isPersonalBest) xpAwarded += XP_AWARDS.personal_best;

    // Check leaderboard position
    const betterCount = await OlympicEvent.count({
      where: {
        eventType,
        isPersonalBest: true,
        score: isHigherBetter ? { [Op.gt]: score } : { [Op.lt]: score },
      },
    });
    const rank = betterCount + 1;
    if (rank === 1) xpAwarded += XP_AWARDS.first_place;
    else if (rank <= 3) xpAwarded += XP_AWARDS.top_3;
    else if (rank <= 10) xpAwarded += XP_AWARDS.top_10;

    const event = await OlympicEvent.create({
      userId,
      eventType,
      score,
      timeSeries: timeSeries || null,
      duration,
      isPersonalBest,
      xpAwarded,
      metadata: metadata || null,
    });

    // Award XP to gamification (best effort)
    try {
      const gam = await Gamification.findOne({ where: { userId } });
      if (gam) {
        await gam.update({
          experience: (gam.experience || 0) + xpAwarded,
          totalXP: (gam.totalXP || 0) + xpAwarded,
        });
      }
    } catch (xpErr) {
      console.error('Olympics XP award error:', xpErr.message);
    }

    return res.status(201).json({
      success: true,
      data: {
        id: event.id,
        eventType,
        score,
        duration,
        isPersonalBest,
        xpAwarded,
        rank,
      },
    });
  } catch (err) {
    console.error('Olympics submit error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to record performance' });
  }
});

// ── GET /api/olympics/ghosts/:eventType — Get ghost recordings to race against ──
router.get('/ghosts/:eventType', ensureAuth, async (req, res) => {
  try {
    const { OlympicEvent, User } = await getModels();
    const { eventType } = req.params;
    const userId = req.user.id;

    if (!VALID_EVENTS.includes(eventType)) {
      return res.status(400).json({ success: false, error: 'Invalid event type' });
    }

    const isHigherBetter = eventType !== 'sprint';

    // Get top 5 personal bests (excluding self) for ghost racing
    const ghosts = await OlympicEvent.findAll({
      where: {
        eventType,
        isPersonalBest: true,
        userId: { [Op.ne]: userId },
        timeSeries: { [Op.ne]: null },
      },
      order: [['score', isHigherBetter ? 'DESC' : 'ASC']],
      limit: 5,
      include: [{ model: User, as: 'athlete', attributes: ['id', 'firstName'] }],
    });

    // Also get user's own best as self-ghost
    const selfBest = await OlympicEvent.findOne({
      where: { userId, eventType, isPersonalBest: true, timeSeries: { [Op.ne]: null } },
    });

    return res.json({
      success: true,
      data: {
        ghosts: ghosts.map((g) => ({
          id: g.id,
          athleteId: g.userId,
          athleteName: g.athlete?.firstName || 'Anonymous',
          score: g.score,
          timeSeries: g.timeSeries,
          duration: g.duration,
          createdAt: g.createdAt,
        })),
        selfGhost: selfBest
          ? { id: selfBest.id, score: selfBest.score, timeSeries: selfBest.timeSeries, duration: selfBest.duration }
          : null,
      },
    });
  } catch (err) {
    console.error('Olympics ghosts error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load ghosts' });
  }
});

// ── GET /api/olympics/leaderboard/:eventType — Global leaderboard ──
router.get('/leaderboard/:eventType', ensureAuth, async (req, res) => {
  try {
    const { OlympicEvent, User } = await getModels();
    const { eventType } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    if (!VALID_EVENTS.includes(eventType)) {
      return res.status(400).json({ success: false, error: 'Invalid event type' });
    }

    const isHigherBetter = eventType !== 'sprint';

    const entries = await OlympicEvent.findAll({
      where: { eventType, isPersonalBest: true },
      order: [['score', isHigherBetter ? 'DESC' : 'ASC']],
      limit,
      include: [{ model: User, as: 'athlete', attributes: ['id', 'firstName'] }],
    });

    // Get requesting user's rank
    const userId = req.user.id;
    const userBest = await OlympicEvent.findOne({
      where: { userId, eventType, isPersonalBest: true },
    });
    let userRank = null;
    if (userBest) {
      const betterCount = await OlympicEvent.count({
        where: {
          eventType,
          isPersonalBest: true,
          score: isHigherBetter ? { [Op.gt]: userBest.score } : { [Op.lt]: userBest.score },
        },
      });
      userRank = betterCount + 1;
    }

    return res.json({
      success: true,
      data: {
        leaderboard: entries.map((e, i) => ({
          rank: i + 1,
          athleteId: e.userId,
          athleteName: e.athlete?.firstName || 'Anonymous',
          score: e.score,
          date: e.createdAt,
        })),
        userRank,
        userBestScore: userBest?.score || null,
      },
    });
  } catch (err) {
    console.error('Olympics leaderboard error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load leaderboard' });
  }
});

// ── GET /api/olympics/recovery-status — Check if recovery day logged today ──
router.get('/recovery-status', ensureAuth, async (req, res) => {
  try {
    const { Gamification } = await getModels();
    const userId = req.user.id;
    const gam = await Gamification.findOne({ where: { userId } });
    const today = new Date().toISOString().split('T')[0];
    const doneToday = !!(gam?.activityLog || []).find(
      (entry) => entry.type === 'recovery_day' && entry.date === today
    );
    return res.json({
      success: true,
      data: {
        doneToday,
        wisdomXP: gam?.wisdomXP || 0,
        recoveryDaysCompleted: gam?.recoveryDaysCompleted || 0,
      },
    });
  } catch (err) {
    console.error('Recovery status error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to check recovery status' });
  }
});

// ── POST /api/olympics/recovery-day — Complete a Recovery Day for Wisdom XP ──
router.post('/recovery-day', ensureAuth, async (req, res) => {
  try {
    const { Gamification } = await getModels();
    const userId = req.user.id;
    const RECOVERY_DAY_XP = 50;

    const gam = await Gamification.findOne({ where: { userId } });
    if (!gam) {
      return res.status(404).json({ success: false, error: 'Gamification profile not found' });
    }

    // Idempotency: check if recovery day already logged today
    const today = new Date().toISOString().split('T')[0];
    const lastRecovery = gam.activityLog?.find(
      (entry) => entry.type === 'recovery_day' && entry.date === today
    );
    if (lastRecovery) {
      return res.status(409).json({ success: false, error: 'Recovery day already logged today' });
    }

    // Award Wisdom XP + full daily XP
    const newLog = [...(gam.activityLog || []), { type: 'recovery_day', date: today, xp: RECOVERY_DAY_XP }];
    await gam.update({
      wisdomXP: (gam.wisdomXP || 0) + RECOVERY_DAY_XP,
      recoveryDaysCompleted: (gam.recoveryDaysCompleted || 0) + 1,
      experience: (gam.experience || 0) + RECOVERY_DAY_XP,
      totalXP: (gam.totalXP || 0) + RECOVERY_DAY_XP,
      activityLog: newLog,
    });

    return res.json({
      success: true,
      data: {
        wisdomXP: (gam.wisdomXP || 0) + RECOVERY_DAY_XP,
        recoveryDaysCompleted: (gam.recoveryDaysCompleted || 0) + 1,
        xpAwarded: RECOVERY_DAY_XP,
        message: 'Recovery day complete — Wisdom XP earned!',
      },
    });
  } catch (err) {
    console.error('Recovery day error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to log recovery day' });
  }
});

export default router;
