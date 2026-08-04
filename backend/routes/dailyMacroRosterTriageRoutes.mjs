import express from 'express';
import { Op } from 'sequelize';
import { protect } from '../middleware/authMiddleware.mjs';
import { assertAssignmentOrAdmin } from '../middleware/verifyClientAccess.mjs';
import DailyMacroLog from '../models/DailyMacroLog.mjs';
import { recordMacroLogRevision } from '../services/nutrition/nutritionLogRevisionService.mjs';
import {
  ESTIMATE_REVIEW_SOURCES,
  addTodayEntry,
  daysBefore,
  emptyClientTriage,
  finalizeClient,
  parseReviewWindowDays,
  parseRosterUserIds,
  parseSingleUserId,
  resolveRequestedDate,
  reviewQueueEntry,
  timelineEntry,
} from '../services/nutrition/dailyMacroRosterTriageService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

router.use(protect);

const NUTRITION_REVIEW_ROLES = new Set(['admin', 'trainer']);
const REVIEW_QUEUE_DEFAULT_LIMIT = 50;
const REVIEW_QUEUE_MAX_LIMIT = 100;
const REVIEW_QUEUE_MAX_OFFSET = 10000;
const TRIAGE_MACRO_ATTRIBUTES = [
  'userId', 'date', 'mealType', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'createdAt',
];
const REVIEW_MACRO_ATTRIBUTES = [
  'id', 'userId', 'date', 'mealType', 'description', 'calories', 'protein', 'carbs', 'fat',
  'fiber', 'sugar', 'sodium', 'source', 'verified', 'contractVersion', 'draftId',
  'workoutProximity', 'servingBasis', 'servingQuantity', 'servingUnit',
  'caloriesReported', 'caloriesCalculated', 'reconciliationStatus',
  'confidenceScore', 'reviewStatus', 'reviewReason', 'reviewedByUserId', 'reviewedAt', 'createdAt',
];

const requireNutritionReviewer = (req, res, next) => {
  if (!NUTRITION_REVIEW_ROLES.has(req.user?.role)) {
    return res.status(403).json({ success: false, error: 'Nutrition review access denied' });
  }
  return next();
};

const parseQueueInteger = (value, fallback, max, allowZero = false) => {
  if (typeof value === 'undefined') return fallback;
  const pattern = allowZero ? /^\d+$/ : /^[1-9]\d*$/;
  if (typeof value !== 'string' || !pattern.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= max ? parsed : null;
};

router.get('/roster-triage', requireNutritionReviewer, async (req, res) => {
  try {
    const dateResult = resolveRequestedDate(req.query.date);
    if (dateResult.status) {
      return res.status(dateResult.status).json({ success: false, error: dateResult.error });
    }
    const date = dateResult.date;
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
      attributes: TRIAGE_MACRO_ATTRIBUTES,
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

    const entry = await DailyMacroLog.findOne({
      attributes: REVIEW_MACRO_ATTRIBUTES,
      where: { id: entryId },
    });
    if (!entry || !Number.isSafeInteger(Number(entry.userId))) {
      return res.status(404).json({ success: false, error: 'Macro data not found' });
    }

    const targetUserId = Number(entry.userId);
    const allowed = await assertAssignmentOrAdmin(req.user.id, req.user.role, targetUserId);
    if (!allowed) {
      return res.status(404).json({ success: false, error: 'Macro data not found' });
    }

    if (entry.verified && entry.reviewStatus === 'verified' && entry.reviewedByUserId && entry.reviewedAt) {
      return res.json({ success: true, entry: timelineEntry(entry) });
    }

    // S0.5: verify flips are trainer/admin actions on a client's record —
    // capture the before-state first (best-effort, never blocks the verify).
    await recordMacroLogRevision({
      entry, action: 'verify', actorUserId: req.user.id, actorRole: req.user.role,
    });
    const updatedEntry = await entry.update({
      verified: true,
      reviewStatus: 'verified',
      reviewedByUserId: req.user.id,
      reviewedAt: new Date(),
    });
    return res.json({ success: true, entry: timelineEntry(updatedEntry || entry) });
  } catch (err) {
    logger.error('[DailyMacroRosterTriageRoutes] Verify client timeline entry error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to verify nutrition entry' });
  }
});

router.get('/review-queue', requireNutritionReviewer, async (req, res) => {
  try {
    const dateResult = resolveRequestedDate(req.query.date);
    if (dateResult.status) {
      return res.status(dateResult.status).json({ success: false, error: dateResult.error });
    }
    const date = dateResult.date;
    const userIds = parseRosterUserIds(req.query.userIds);
    if (!userIds || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid userIds' });
    }
    const days = parseReviewWindowDays(req.query.days);
    if (!days) {
      return res.status(400).json({ success: false, error: 'Invalid days' });
    }
    const limit = parseQueueInteger(
      req.query.limit,
      REVIEW_QUEUE_DEFAULT_LIMIT,
      REVIEW_QUEUE_MAX_LIMIT,
    );
    const offset = parseQueueInteger(req.query.offset, 0, REVIEW_QUEUE_MAX_OFFSET, true);
    if (limit === null || offset === null) {
      return res.status(400).json({ success: false, error: 'Invalid pagination' });
    }

    for (const userId of userIds) {
      const allowed = await assertAssignmentOrAdmin(req.user.id, req.user.role, userId);
      if (!allowed) {
        return res.status(404).json({ success: false, error: 'Macro data not found' });
      }
    }

    const startDate = daysBefore(date, days - 1);
    const { count, rows } = await DailyMacroLog.findAndCountAll({
      attributes: REVIEW_MACRO_ATTRIBUTES,
      where: {
        userId: { [Op.in]: userIds },
        date: { [Op.between]: [startDate, date] },
        verified: false,
        [Op.or]: [
          { reviewStatus: 'needs_review' },
          {
            reviewStatus: null,
            source: { [Op.in]: ESTIMATE_REVIEW_SOURCES },
          },
        ],
      },
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit,
      offset,
    });

    return res.json({
      success: true,
      date,
      startDate,
      days,
      entries: rows.map(reviewQueueEntry),
      total: count,
      limit,
      offset,
      hasMore: offset + rows.length < count,
    });
  } catch (err) {
    logger.error('[DailyMacroRosterTriageRoutes] Get nutrition review queue error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get nutrition review queue' });
  }
});

router.get('/client-timeline', requireNutritionReviewer, async (req, res) => {
  try {
    const dateResult = resolveRequestedDate(req.query.date);
    if (dateResult.status) {
      return res.status(dateResult.status).json({ success: false, error: dateResult.error });
    }
    const date = dateResult.date;
    const userId = parseSingleUserId(req.query.userId);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Invalid userId' });
    }

    const allowed = await assertAssignmentOrAdmin(req.user.id, req.user.role, userId);
    if (!allowed) {
      return res.status(404).json({ success: false, error: 'Macro data not found' });
    }

    const rows = await DailyMacroLog.findAll({
      attributes: REVIEW_MACRO_ATTRIBUTES,
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
