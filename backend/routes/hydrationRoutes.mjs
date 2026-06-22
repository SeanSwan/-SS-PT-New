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
import { formatDisplayDate } from '../services/nutrition/displayDate.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
router.use(protect);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const WHOLE_NUMBER_REGEX = /^\d+$/;
const HYDRATION_DATE_ERROR = 'date must be a real YYYY-MM-DD calendar date';
const HYDRATION_FUTURE_DATE_ERROR = 'date cannot be in the future';
const HYDRATION_RANGE_ERROR = 'start cannot be after end date';
const isValidDate = (str) => {
  if (typeof str !== 'string' || !DATE_REGEX.test(str)) return false;
  const [year, month, day] = str.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};
const displayDate = (offsetDays = 0, now = new Date()) => {
  const date = new Date(now.getTime());
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return formatDisplayDate(date);
};
const todayStr = () => displayDate();
const serverUtcDateOnly = (offsetDays = 0, now = new Date()) => {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
  return date.toISOString().slice(0, 10);
};
const hasProvidedDate = (value) => value !== undefined && value !== null && value !== '';
const resolveOptionalDate = (value, fallbackDate = todayStr()) => {
  if (!hasProvidedDate(value)) return { date: fallbackDate };
  if (!isValidDate(value)) return { error: HYDRATION_DATE_ERROR };
  if (value > serverUtcDateOnly(1)) return { error: HYDRATION_FUTURE_DATE_ERROR };
  return { date: value };
};

const toFiniteWholeNumber = (val) => {
  if (typeof val === 'number') return Number.isInteger(val) ? val : null;
  if (typeof val !== 'string') return null;

  const trimmed = val.trim();
  if (!WHOLE_NUMBER_REGEX.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};
const hasProvidedNumber = (value) => value !== undefined && value !== null && value !== '';

/**
 * GET /api/hydration?date=YYYY-MM-DD
 * Returns today's hydration record (creates one if missing)
 */
router.get('/', async (req, res) => {
  try {
    const resolvedDate = resolveOptionalDate(req.query.date);
    if (resolvedDate.error) {
      return res.status(400).json({ success: false, error: resolvedDate.error });
    }
    const date = resolvedDate.date;

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
    const resolvedDate = resolveOptionalDate(req.body.date);
    if (resolvedDate.error) {
      return res.status(400).json({ success: false, error: resolvedDate.error });
    }
    const date = resolvedDate.date;

    // Validate glassesFilled
    const safeGlasses = toFiniteWholeNumber(glassesFilled);
    if (safeGlasses === null || safeGlasses < 0 || safeGlasses > 30) {
      return res.status(400).json({ success: false, error: 'glassesFilled must be a whole number 0-30' });
    }

    const goalNumber = hasProvidedNumber(dailyGoal) ? toFiniteWholeNumber(dailyGoal) : null;
    if (hasProvidedNumber(dailyGoal) && (goalNumber === null || goalNumber < 1 || goalNumber > 30)) {
      return res.status(400).json({ success: false, error: 'dailyGoal must be a whole number 1-30' });
    }

    const ozNumber = hasProvidedNumber(glassOz) ? toFiniteWholeNumber(glassOz) : null;
    if (hasProvidedNumber(glassOz) && (ozNumber === null || ozNumber < 1 || ozNumber > 32)) {
      return res.status(400).json({ success: false, error: 'glassOz must be a whole number 1-32' });
    }

    const safeGoal = goalNumber !== null ? goalNumber : undefined;
    const safeOz = ozNumber !== null ? ozNumber : undefined;

    const [record, created] = await DailyHydration.findOrCreate({
      where: { userId: req.user.id, date },
      defaults: {
        glassesFilled: safeGlasses,
        dailyGoal: safeGoal || 8,
        glassOz: safeOz || 8,
      },
    });

    if (!created) {
      const updates = { glassesFilled: safeGlasses };
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
      return displayDate(-6);
    })();

    const resolvedStart = resolveOptionalDate(req.query.start, defaultStart);
    if (resolvedStart.error) {
      return res.status(400).json({ success: false, error: resolvedStart.error });
    }
    const startDate = resolvedStart.date;
    const endDate = todayStr();
    if (startDate > endDate) {
      return res.status(400).json({ success: false, error: HYDRATION_RANGE_ERROR });
    }

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
