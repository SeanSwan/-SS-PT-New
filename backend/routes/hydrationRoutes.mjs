/**
 * ============================================================================
 * FILE: hydrationRoutes.mjs
 * PURPOSE: REST endpoints for daily hydration tracking
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * Endpoints:
 *   GET    /api/hydration?date=YYYY-MM-DD  - Get today's hydration (upserts if missing)
 *   PUT    /api/hydration                  - Set glasses filled for a date
 *   GET    /api/hydration/weekly           - Get 7-day hydration history
 */
import express from 'express';
import { Op } from 'sequelize';
import { protect } from '../middleware/authMiddleware.mjs';
import DailyHydration from '../models/DailyHydration.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
router.use(protect);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_NUMBER_REGEX = /^\d+(?:\.\d+)?$/;
const isValidDate = (str) => {
  if (typeof str !== 'string' || !DATE_REGEX.test(str)) return false;
  const [year, month, day] = str.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};
const todayStr = () => new Date().toISOString().split('T')[0];

const toFiniteDecimalNumber = (val) => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val !== 'string') return null;

  const trimmed = val.trim();
  if (!DECIMAL_NUMBER_REGEX.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * GET /api/hydration?date=YYYY-MM-DD
 * Returns today's hydration record (creates one if missing)
 */
router.get('/', async (req, res) => {
  try {
    const date = (req.query.date && isValidDate(req.query.date)) ? req.query.date : todayStr();

    const [record] = await DailyHydration.findOrCreate({
      where: { userId: req.user.id, date },
      defaults: { glassesFilled: 0, dailyGoal: 8, glassOz: 8 },
    });

    return res.json({ success: true, hydration: record });
  } catch (err) {
    logger.error('[HydrationRoutes] Get error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get hydration' });
  }
});

/**
 * PUT /api/hydration
 * Set glasses filled for a given date (upsert)
 * Body: { date?, glassesFilled, dailyGoal?, glassOz? }
 */
router.put('/', async (req, res) => {
  try {
    const { glassesFilled, dailyGoal, glassOz } = req.body;
    const date = (req.body.date && isValidDate(req.body.date)) ? req.body.date : todayStr();

    // Validate glassesFilled
    const safeGlasses = toFiniteDecimalNumber(glassesFilled);
    if (safeGlasses === null || safeGlasses < 0 || safeGlasses > 30) {
      return res.status(400).json({ success: false, error: 'glassesFilled must be 0-30' });
    }

    const goalNumber = dailyGoal === undefined ? null : toFiniteDecimalNumber(dailyGoal);
    const ozNumber = glassOz === undefined ? null : toFiniteDecimalNumber(glassOz);
    const safeGoal = (goalNumber !== null && goalNumber >= 1 && goalNumber <= 30)
      ? goalNumber : undefined;
    const safeOz = (ozNumber !== null && ozNumber >= 1 && ozNumber <= 32)
      ? ozNumber : undefined;

    const [record, created] = await DailyHydration.findOrCreate({
      where: { userId: req.user.id, date },
      defaults: {
        glassesFilled: Math.round(safeGlasses),
        dailyGoal: safeGoal || 8,
        glassOz: safeOz || 8,
      },
    });

    if (!created) {
      const updates = { glassesFilled: Math.round(safeGlasses) };
      if (safeGoal !== undefined) updates.dailyGoal = safeGoal;
      if (safeOz !== undefined) updates.glassOz = safeOz;
      await record.update(updates);
    }

    return res.json({ success: true, hydration: record });
  } catch (err) {
    logger.error('[HydrationRoutes] Put error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update hydration' });
  }
});

/**
 * GET /api/hydration/weekly?start=YYYY-MM-DD
 * Returns 7-day hydration history
 */
router.get('/weekly', async (req, res) => {
  try {
    const defaultStart = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return d.toISOString().split('T')[0];
    })();

    const startDate = (req.query.start && isValidDate(req.query.start)) ? req.query.start : defaultStart;
    const endDate = todayStr();

    const records = await DailyHydration.findAll({
      where: {
        userId: req.user.id,
        date: { [Op.between]: [startDate, endDate] },
      },
      order: [['date', 'ASC']],
      limit: 30,
    });

    const totalGlasses = records.reduce((sum, r) => sum + r.glassesFilled, 0);
    const daysOnGoal = records.filter(r => r.glassesFilled >= r.dailyGoal).length;

    return res.json({
      success: true,
      startDate,
      endDate,
      days: records,
      daysLogged: records.length,
      totalGlasses,
      daysOnGoal,
    });
  } catch (err) {
    logger.error('[HydrationRoutes] Weekly error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get weekly hydration' });
  }
});

export default router;
