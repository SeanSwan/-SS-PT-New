import express from 'express';
import { Op } from 'sequelize';
import { protect } from '../middleware/authMiddleware.mjs';
import { assertAssignmentOrAdmin } from '../middleware/verifyClientAccess.mjs';
import DailyMacroLog from '../models/DailyMacroLog.mjs';
import {
  ESTIMATE_REVIEW_SOURCES,
  addTodayEntry,
  daysBefore,
  emptyClientTriage,
  finalizeClient,
  parseReviewWindowDays,
  parseRosterUserIds,
  parseSingleUserId,
  requestedDateOrDefault,
  reviewQueueEntry,
  timelineEntry,
} from '../services/nutrition/dailyMacroRosterTriageService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

router.use(protect);

const NUTRITION_REVIEW_ROLES = new Set(['admin', 'trainer']);

const requireNutritionReviewer = (req, res, next) => {
  if (!NUTRITION_REVIEW_ROLES.has(req.user?.role)) {
    return res.status(403).json({ success: false, error: 'Nutrition review access denied' });
  }
  return next();
};

router.get('/roster-triage', requireNutritionReviewer, async (req, res) => {
  try {
    const date = requestedDateOrDefault(req.query.date);
    if (!date) {
      return res.status(400).json({ success: false, error: 'Invalid date' });
    }
    const userIds = parseRosterUserIds(req.query.userIds);
    if (!userIds || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid userIds' });
    }

    for (const userId of userIds) {
      const allowed = await assertAssignmentOrAdmin(req.user.id, req.user.role, userId);
      if (!allowed) {
        return res.status(404).json({ success: false, error: 'Macro data not found' });
      }
    }

    const weekStart = daysBefore(date, 6);
    const rows = await DailyMacroLog.findAll({
      where: {
        userId: { [Op.in]: userIds },
        date: { [Op.between]: [weekStart, date] },
      },
      order: [['userId', 'ASC'], ['date', 'ASC'], ['createdAt', 'ASC']],
      limit: userIds.length * 100,
    });

    const byUserId = new Map(userIds.map((userId) => [userId, emptyClientTriage(userId)]));
    const weeklyDatesByUserId = new Map(userIds.map((userId) => [userId, new Set()]));

    for (const entry of rows) {
      const userId = Number(entry.userId);
      const client = byUserId.get(userId);
      const weeklyDates = weeklyDatesByUserId.get(userId);
      if (!client || !weeklyDates || !entry.date) continue;

      weeklyDates.add(entry.date);
      if (entry.date === date) addTodayEntry(client, entry);
    }

    const clients = userIds.map((userId) =>
      finalizeClient(byUserId.get(userId), weeklyDatesByUserId.get(userId))
    );

    return res.json({ success: true, date, weekStart, clients });
  } catch (err) {
    logger.error('[DailyMacroRosterTriageRoutes] Get roster triage error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get roster nutrition triage' });
  }
});

router.patch('/client-timeline/:entryId/verify', requireNutritionReviewer, async (req, res) => {
  try {
    const entryId = parseSingleUserId(req.params.entryId);
    if (!entryId) {
      return res.status(400).json({ success: false, error: 'Invalid entryId' });
    }

    const entry = await DailyMacroLog.findOne({ where: { id: entryId } });
    if (!entry || !Number.isSafeInteger(Number(entry.userId))) {
      return res.status(404).json({ success: false, error: 'Macro data not found' });
    }

    const targetUserId = Number(entry.userId);
    const allowed = await assertAssignmentOrAdmin(req.user.id, req.user.role, targetUserId);
    if (!allowed) {
      return res.status(404).json({ success: false, error: 'Macro data not found' });
    }

    const updatedEntry = await entry.update({ verified: true });
    return res.json({ success: true, entry: timelineEntry(updatedEntry || entry) });
  } catch (err) {
    logger.error('[DailyMacroRosterTriageRoutes] Verify client timeline entry error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to verify nutrition entry' });
  }
});

router.get('/review-queue', requireNutritionReviewer, async (req, res) => {
  try {
    const date = requestedDateOrDefault(req.query.date);
    if (!date) {
      return res.status(400).json({ success: false, error: 'Invalid date' });
    }
    const userIds = parseRosterUserIds(req.query.userIds);
    if (!userIds || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid userIds' });
    }
    const days = parseReviewWindowDays(req.query.days);
    if (!days) {
      return res.status(400).json({ success: false, error: 'Invalid days' });
    }

    for (const userId of userIds) {
      const allowed = await assertAssignmentOrAdmin(req.user.id, req.user.role, userId);
      if (!allowed) {
        return res.status(404).json({ success: false, error: 'Macro data not found' });
      }
    }

    const startDate = daysBefore(date, days - 1);
    const rows = await DailyMacroLog.findAll({
      where: {
        userId: { [Op.in]: userIds },
        date: { [Op.between]: [startDate, date] },
        verified: false,
        source: { [Op.in]: ESTIMATE_REVIEW_SOURCES },
      },
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: 50,
    });

    return res.json({
      success: true,
      date,
      startDate,
      days,
      entries: rows.map(reviewQueueEntry),
    });
  } catch (err) {
    logger.error('[DailyMacroRosterTriageRoutes] Get nutrition review queue error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get nutrition review queue' });
  }
});

router.get('/client-timeline', requireNutritionReviewer, async (req, res) => {
  try {
    const date = requestedDateOrDefault(req.query.date);
    if (!date) {
      return res.status(400).json({ success: false, error: 'Invalid date' });
    }
    const userId = parseSingleUserId(req.query.userId);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Invalid userId' });
    }

    const allowed = await assertAssignmentOrAdmin(req.user.id, req.user.role, userId);
    if (!allowed) {
      return res.status(404).json({ success: false, error: 'Macro data not found' });
    }

    const rows = await DailyMacroLog.findAll({
      where: { userId, date },
      order: [['createdAt', 'ASC']],
      limit: 100,
    });

    return res.json({
      success: true,
      date,
      userId,
      entries: rows.map(timelineEntry),
    });
  } catch (err) {
    logger.error('[DailyMacroRosterTriageRoutes] Get client timeline error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get client nutrition timeline' });
  }
});

export default router;
