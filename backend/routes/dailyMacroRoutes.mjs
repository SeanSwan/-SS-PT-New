/**
 * Daily Macro Log Routes
 * ======================
 * REST endpoints for food/macro tracking.
 * Supports manual entry, AI-assisted logging, and daily summaries.
 *
 * Endpoints:
 *   POST   /api/macros                    - Log a food entry
 *   GET    /api/macros?date=YYYY-MM-DD    - Get entries for a date
 *   GET    /api/macros/summary?date=...   - Get daily macro summary
 *   GET    /api/macros/weekly?start=...   - Get weekly macro summary
 *   PATCH  /api/macros/:id               - Update an entry
 *   DELETE /api/macros/:id               - Delete an entry
 */
import express from 'express';
import { Op } from 'sequelize';
import { protect } from '../middleware/authMiddleware.mjs';
import DailyMacroLog from '../models/DailyMacroLog.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

router.use(protect);

// ── Security constants ──
const ALLOWED_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const ALLOWED_SOURCES = ['manual', 'ai-chat', 'food-scanner', 'barcode'];
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_ITEMS_COUNT = 50;
const MAX_MACRO_VALUE = 99999; // kcal or mg cap
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_WEEKLY_RANGE_DAYS = 90;

const sanitizeNumber = (val, max = MAX_MACRO_VALUE) => {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(Math.round(n * 10) / 10, max);
};

const isValidDate = (str) => {
  if (!DATE_REGEX.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  return !isNaN(d.getTime());
};

/**
 * POST /api/macros
 * Log a food entry (manual or from AI chat)
 */
router.post('/', async (req, res) => {
  try {
    const {
      date,
      mealType = 'snack',
      description,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      sodium,
      items,
      source = 'manual',
      aiConversationId,
      verified = false,
    } = req.body;

    // Validate description
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Food description is required' });
    }
    if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({ success: false, error: `Description must be under ${MAX_DESCRIPTION_LENGTH} characters` });
    }

    // Validate mealType
    const safeMealType = ALLOWED_MEAL_TYPES.includes(mealType) ? mealType : 'snack';

    // Validate source
    const safeSource = ALLOWED_SOURCES.includes(source) ? source : 'manual';

    // Validate date
    const entryDate = date && isValidDate(date) ? date : new Date().toISOString().split('T')[0];

    // Validate items array
    const safeItems = Array.isArray(items) ? items.slice(0, MAX_ITEMS_COUNT) : [];

    // Validate aiConversationId (string or null, max 100 chars)
    const safeAiConversationId = (typeof aiConversationId === 'string' && aiConversationId.length <= 100)
      ? aiConversationId : null;

    const entry = await DailyMacroLog.create({
      userId: req.user.id,
      date: entryDate,
      mealType: safeMealType,
      description: description.trim().substring(0, MAX_DESCRIPTION_LENGTH),
      calories: sanitizeNumber(calories),
      protein: sanitizeNumber(protein),
      carbs: sanitizeNumber(carbs),
      fat: sanitizeNumber(fat),
      fiber: sanitizeNumber(fiber),
      sugar: sanitizeNumber(sugar),
      sodium: sanitizeNumber(sodium),
      items: safeItems,
      source: safeSource,
      aiConversationId: safeAiConversationId,
      verified: verified === true,
    });

    return res.status(201).json({ success: true, entry });
  } catch (err) {
    logger.error('[DailyMacroRoutes] Create entry error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to log food entry' });
  }
});

/**
 * GET /api/macros
 * Get entries for a specific date (defaults to today)
 */
router.get('/', async (req, res) => {
  try {
    const rawDate = req.query.date || new Date().toISOString().split('T')[0];
    const date = isValidDate(rawDate) ? rawDate : new Date().toISOString().split('T')[0];

    const entries = await DailyMacroLog.findAll({
      where: {
        userId: req.user.id,
        date,
      },
      order: [['createdAt', 'ASC']],
      limit: 100,
    });

    return res.json({ success: true, date, entries, count: entries.length });
  } catch (err) {
    logger.error('[DailyMacroRoutes] Get entries error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get entries' });
  }
});

/**
 * GET /api/macros/summary
 * Get daily totals for a specific date
 */
router.get('/summary', async (req, res) => {
  try {
    const rawDate = req.query.date || new Date().toISOString().split('T')[0];
    const date = isValidDate(rawDate) ? rawDate : new Date().toISOString().split('T')[0];

    // Admin/trainer can view any client's macros via ?userId=123
    let targetUserId = req.user.id;
    if (req.query.userId && ['admin', 'trainer'].includes(req.user.role)) {
      const qId = parseInt(req.query.userId, 10);
      if (Number.isFinite(qId) && qId > 0) targetUserId = qId;
    }

    const entries = await DailyMacroLog.findAll({
      where: {
        userId: targetUserId,
        date,
      },
    });

    const summary = {
      date,
      userId: targetUserId,
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSugar: 0,
      totalSodium: 0,
      mealCount: entries.length,
      meals: {},
    };

    for (const entry of entries) {
      summary.totalCalories += entry.calories || 0;
      summary.totalProtein += entry.protein || 0;
      summary.totalCarbs += entry.carbs || 0;
      summary.totalFat += entry.fat || 0;
      summary.totalFiber += entry.fiber || 0;
      summary.totalSugar += entry.sugar || 0;
      summary.totalSodium += entry.sodium || 0;

      if (!summary.meals[entry.mealType]) {
        summary.meals[entry.mealType] = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
      }
      summary.meals[entry.mealType].calories += entry.calories || 0;
      summary.meals[entry.mealType].protein += entry.protein || 0;
      summary.meals[entry.mealType].carbs += entry.carbs || 0;
      summary.meals[entry.mealType].fat += entry.fat || 0;
      summary.meals[entry.mealType].count += 1;
    }

    // Round all totals to 1 decimal
    summary.totalCalories = Math.round(summary.totalCalories * 10) / 10;
    summary.totalProtein = Math.round(summary.totalProtein * 10) / 10;
    summary.totalCarbs = Math.round(summary.totalCarbs * 10) / 10;
    summary.totalFat = Math.round(summary.totalFat * 10) / 10;
    summary.totalFiber = Math.round(summary.totalFiber * 10) / 10;
    summary.totalSugar = Math.round(summary.totalSugar * 10) / 10;
    summary.totalSodium = Math.round(summary.totalSodium * 10) / 10;

    return res.json({ success: true, summary });
  } catch (err) {
    logger.error('[DailyMacroRoutes] Get summary error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get summary' });
  }
});

/**
 * GET /api/macros/weekly
 * Get weekly macro totals (7 days starting from `start` date)
 */
router.get('/weekly', async (req, res) => {
  try {
    const defaultStart = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return d.toISOString().split('T')[0];
    })();

    const startDate = (req.query.start && isValidDate(req.query.start)) ? req.query.start : defaultStart;
    const endDate = (req.query.end && isValidDate(req.query.end)) ? req.query.end : new Date().toISOString().split('T')[0];

    // Cap query range to prevent unbounded scans
    const msRange = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (msRange < 0 || msRange > MAX_WEEKLY_RANGE_DAYS * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ success: false, error: `Date range must be within ${MAX_WEEKLY_RANGE_DAYS} days` });
    }

    // Admin/trainer can view any client's macros via ?userId=123
    let weeklyUserId = req.user.id;
    if (req.query.userId && ['admin', 'trainer'].includes(req.user.role)) {
      const qId = parseInt(req.query.userId, 10);
      if (Number.isFinite(qId) && qId > 0) weeklyUserId = qId;
    }

    const entries = await DailyMacroLog.findAll({
      where: {
        userId: weeklyUserId,
        date: { [Op.between]: [startDate, endDate] },
      },
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
      limit: 1000,
    });

    // Group by date
    const dailyTotals = {};
    for (const entry of entries) {
      const d = entry.date;
      if (!dailyTotals[d]) {
        dailyTotals[d] = { date: d, calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 };
      }
      dailyTotals[d].calories += entry.calories || 0;
      dailyTotals[d].protein += entry.protein || 0;
      dailyTotals[d].carbs += entry.carbs || 0;
      dailyTotals[d].fat += entry.fat || 0;
      dailyTotals[d].mealCount += 1;
    }

    const days = Object.values(dailyTotals).map(d => ({
      ...d,
      calories: Math.round(d.calories * 10) / 10,
      protein: Math.round(d.protein * 10) / 10,
      carbs: Math.round(d.carbs * 10) / 10,
      fat: Math.round(d.fat * 10) / 10,
    }));

    const avgCalories = days.length > 0
      ? Math.round(days.reduce((s, d) => s + d.calories, 0) / days.length)
      : 0;

    return res.json({
      success: true,
      startDate,
      endDate,
      days,
      daysLogged: days.length,
      avgCalories,
    });
  } catch (err) {
    logger.error('[DailyMacroRoutes] Get weekly error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get weekly summary' });
  }
});

/**
 * PATCH /api/macros/:id
 * Update a macro entry
 */
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid entry ID' });
    }

    const entry = await DailyMacroLog.findOne({
      where: { id, userId: req.user.id },
    });

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    const updates = {};
    const numericFields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];

    // Validate mealType
    if (req.body.mealType !== undefined) {
      updates.mealType = ALLOWED_MEAL_TYPES.includes(req.body.mealType)
        ? req.body.mealType : entry.mealType;
    }

    // Validate description
    if (req.body.description !== undefined) {
      if (typeof req.body.description === 'string' && req.body.description.trim().length > 0) {
        updates.description = req.body.description.trim().substring(0, MAX_DESCRIPTION_LENGTH);
      }
    }

    // Validate numeric macro fields
    for (const field of numericFields) {
      if (req.body[field] !== undefined) {
        updates[field] = sanitizeNumber(req.body[field]);
      }
    }

    // Validate items
    if (req.body.items !== undefined) {
      updates.items = Array.isArray(req.body.items) ? req.body.items.slice(0, MAX_ITEMS_COUNT) : entry.items;
    }

    // Validate verified
    if (req.body.verified !== undefined) {
      updates.verified = req.body.verified === true;
    }

    await entry.update(updates);

    return res.json({ success: true, entry });
  } catch (err) {
    logger.error('[DailyMacroRoutes] Update entry error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update entry' });
  }
});

/**
 * DELETE /api/macros/:id
 * Delete a macro entry
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid entry ID' });
    }

    const entry = await DailyMacroLog.findOne({
      where: { id, userId: req.user.id },
    });

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    await entry.destroy();

    return res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    logger.error('[DailyMacroRoutes] Delete entry error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete entry' });
  }
});

export default router;
