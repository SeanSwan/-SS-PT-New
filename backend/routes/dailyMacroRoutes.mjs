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
import { createSingleMacroEntry } from '../services/nutrition/macroLogService.mjs';
import {
  ALLOWED_MEAL_TYPES,
  ALLOWED_SOURCES,
  MAX_DESCRIPTION_LENGTH,
  MAX_ITEMS_COUNT,
  MAX_WEEKLY_RANGE_DAYS,
  buildDailyMacroSummary,
  buildMacroEntryUpdates,
  buildWeeklyMacroDays,
  isValidDate,
  resolveMacroTargetUserId,
  sanitizeNumber,
  serverUtcDateOnly,
} from './dailyMacroRoutes.utils.mjs';

const router = express.Router();

router.use(protect);

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

    // Validate date and reject future-dated entries (no phantom future macro logs).
    const today = serverUtcDateOnly();
    const maxClientLocalDate = serverUtcDateOnly(1);
    const entryDate = date && isValidDate(date) ? date : today;
    if (entryDate > maxClientLocalDate) {
      return res.status(400).json({ success: false, error: 'Cannot log meals for a future date.' });
    }

    // Validate items array
    const safeItems = Array.isArray(items) ? items.slice(0, MAX_ITEMS_COUNT) : [];

    // Validate aiConversationId (string or null, max 100 chars)
    const safeAiConversationId = (typeof aiConversationId === 'string' && aiConversationId.length <= 100)
      ? aiConversationId : null;

    // Delegate to shared nutrition write service — normalizes source to model-valid value
    const entry = await createSingleMacroEntry({
      date:             entryDate,
      mealType:         safeMealType,
      description:      description.trim().substring(0, MAX_DESCRIPTION_LENGTH),
      calories:         sanitizeNumber(calories),
      protein:          sanitizeNumber(protein),
      carbs:            sanitizeNumber(carbs),
      fat:              sanitizeNumber(fat),
      fiber:            sanitizeNumber(fiber),
      sugar:            sanitizeNumber(sugar),
      sodium:           sanitizeNumber(sodium),
      items:            safeItems,
      aiConversationId: safeAiConversationId,
      verified:         false,
    }, { userId: req.user.id, source: safeSource });

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

    const target = await resolveMacroTargetUserId(req);
    if (target.error) {
      return res.status(target.status).json({ success: false, error: target.error });
    }
    const targetUserId = target.userId;

    const entries = await DailyMacroLog.findAll({
      where: {
        userId: targetUserId,
        date,
      },
    });

    const summary = buildDailyMacroSummary(entries, date, targetUserId);

    return res.json({ success: true, summary });
  } catch (err) {
    // Non-fatal: table may not exist yet (daily_macro_logs not migrated)
    if (err.name === 'SequelizeDatabaseError' && err.message?.includes('does not exist')) {
      return res.json({ success: true, summary: { date: req.query.date || new Date().toISOString().split('T')[0], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0, totalSugar: 0, totalSodium: 0, mealCount: 0, meals: {} } });
    }
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

    const target = await resolveMacroTargetUserId(req);
    if (target.error) {
      return res.status(target.status).json({ success: false, error: target.error });
    }
    const weeklyUserId = target.userId;

    const entries = await DailyMacroLog.findAll({
      where: {
        userId: weeklyUserId,
        date: { [Op.between]: [startDate, endDate] },
      },
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
      limit: 1000,
    });

    const days = buildWeeklyMacroDays(entries);

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
router.patch('/:id(\\d+)', async (req, res) => {
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

    const updates = buildMacroEntryUpdates(entry, req.body);

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
router.delete('/:id(\\d+)', async (req, res) => {
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
