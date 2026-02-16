/**
 * Streak Routes - Dedicated Streak Management
 * ============================================
 * Endpoints for streak tracking, freeze mechanics, and history.
 *
 * Endpoints:
 * - GET    /api/streaks                (get user's streaks)
 * - POST   /api/streaks/record         (record daily activity)
 * - POST   /api/streaks/freeze         (use a freeze day)
 * - GET    /api/streaks/leaderboard    (top streaks)
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import getModels from '../models/associations.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
router.use(protect);

// ─── GET USER STREAKS ────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const models = await getModels();
    const { Streak } = models;

    const streaks = await Streak.findAll({
      where: { userId: req.user.id },
      order: [['streakType', 'ASC']],
    });

    return res.json({ success: true, streaks });
  } catch (err) {
    logger.error('Error fetching streaks', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch streaks' });
  }
});

// ─── RECORD DAILY ACTIVITY ──────────────────────────────────────────────────

router.post('/record', async (req, res) => {
  try {
    const models = await getModels();
    const { Streak } = models;
    const { streakType } = req.body;
    const type = streakType || 'workout';

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Find or create streak for this type
    let [streak] = await Streak.findOrCreate({
      where: { userId: req.user.id, streakType: type },
      defaults: {
        userId: req.user.id,
        streakType: type,
        currentCount: 0,
        longestCount: 0,
        isActive: true,
        history: [],
      },
    });

    // Already recorded today?
    if (streak.lastActivityDate === today) {
      return res.json({ success: true, streak, message: 'Already recorded today' });
    }

    // Check if streak continues (yesterday) or resets
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let newCount;
    if (streak.lastActivityDate === yesterdayStr || !streak.lastActivityDate) {
      // Streak continues
      newCount = streak.currentCount + 1;
    } else if (streak.lastFreezeDate === yesterdayStr) {
      // Freeze was used, streak continues
      newCount = streak.currentCount + 1;
    } else {
      // Streak broken, restart
      newCount = 1;
      streak.brokenAt = new Date();
      streak.brokenReason = 'missed';
    }

    // XP reward: 10 base + 5 per consecutive day (capped at 100)
    const xpGained = Math.min(100, 10 + (newCount - 1) * 5);

    streak.currentCount = newCount;
    streak.longestCount = Math.max(streak.longestCount, newCount);
    streak.lastActivityDate = today;
    streak.isActive = true;
    streak.xpEarnedFromStreak += xpGained;

    // Add to history
    const history = streak.history || [];
    history.push({ date: today, action: 'record', count: newCount, xp: xpGained });
    if (history.length > 365) history.shift(); // Keep last year
    streak.history = history;

    await streak.save();

    return res.json({
      success: true,
      streak,
      xpGained,
      message: newCount === 1 ? 'Streak started!' : `${newCount}-day streak!`,
    });
  } catch (err) {
    logger.error('Error recording streak', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to record activity' });
  }
});

// ─── USE FREEZE DAY ─────────────────────────────────────────────────────────

router.post('/freeze', async (req, res) => {
  try {
    const models = await getModels();
    const { Streak } = models;
    const { streakType } = req.body;
    const type = streakType || 'workout';

    const streak = await Streak.findOne({
      where: { userId: req.user.id, streakType: type },
    });

    if (!streak) {
      return res.status(404).json({ success: false, message: 'No streak found' });
    }

    if (streak.freezesRemaining <= 0) {
      return res.status(400).json({ success: false, message: 'No freezes remaining' });
    }

    const today = new Date().toISOString().slice(0, 10);

    streak.freezesRemaining -= 1;
    streak.freezesUsed += 1;
    streak.lastFreezeDate = today;

    const history = streak.history || [];
    history.push({ date: today, action: 'freeze', count: streak.currentCount });
    streak.history = history;

    await streak.save();

    return res.json({ success: true, streak, message: 'Freeze day used!' });
  } catch (err) {
    logger.error('Error using streak freeze', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to use freeze' });
  }
});

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────

router.get('/leaderboard', async (req, res) => {
  try {
    const models = await getModels();
    const { Streak, User } = models;
    const { streakType, sortBy } = req.query;
    const type = streakType || 'workout';
    const sort = sortBy === 'longest' ? 'longestCount' : 'currentCount';
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const leaderboard = await Streak.findAll({
      where: { streakType: type, isActive: true },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'username', 'photo'] }],
      order: [[sort, 'DESC']],
      limit,
    });

    return res.json({
      success: true,
      leaderboard: leaderboard.map((s, i) => ({
        rank: i + 1,
        user: s.user,
        currentCount: s.currentCount,
        longestCount: s.longestCount,
        lastActivityDate: s.lastActivityDate,
      })),
    });
  } catch (err) {
    logger.error('Error fetching streak leaderboard', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
});

export default router;
