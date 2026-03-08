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

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Food description is required' });
    }

    const entryDate = date || new Date().toISOString().split('T')[0];

    const entry = await DailyMacroLog.create({
      userId: req.user.id,
      date: entryDate,
      mealType,
      description: description.trim(),
      calories: calories || null,
      protein: protein || null,
      carbs: carbs || null,
      fat: fat || null,
      fiber: fiber || null,
      sugar: sugar || null,
      sodium: sodium || null,
      items: items || [],
      source,
      aiConversationId: aiConversationId || null,
      verified,
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
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const entries = await DailyMacroLog.findAll({
      where: {
        userId: req.user.id,
        date,
      },
      order: [['createdAt', 'ASC']],
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
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const entries = await DailyMacroLog.findAll({
      where: {
        userId: req.user.id,
        date,
      },
    });

    const summary = {
      date,
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
    const startDate = req.query.start || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return d.toISOString().split('T')[0];
    })();

    const endDate = req.query.end || new Date().toISOString().split('T')[0];

    const entries = await DailyMacroLog.findAll({
      where: {
        userId: req.user.id,
        date: { [Op.between]: [startDate, endDate] },
      },
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
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
    const entry = await DailyMacroLog.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    const allowedFields = [
      'mealType', 'description', 'calories', 'protein', 'carbs', 'fat',
      'fiber', 'sugar', 'sodium', 'items', 'verified',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
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
    const entry = await DailyMacroLog.findOne({
      where: { id: req.params.id, userId: req.user.id },
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
