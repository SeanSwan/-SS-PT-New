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
import dailyMacroDraftRoutes from './dailyMacroDraftRoutes.mjs';
import { createSingleMacroEntry } from '../services/nutrition/macroLogService.mjs';
import { recordMacroLogRevision } from '../services/nutrition/nutritionLogRevisionService.mjs';
import {
  ALLOWED_MEAL_TYPES,
  ALLOWED_SOURCES,
  MACRO_DATE_ERROR,
  MAX_DESCRIPTION_LENGTH,
  MAX_ITEMS_COUNT,
  MAX_WEEKLY_RANGE_DAYS,
  buildDailyMacroSummary,
  buildMacroEntryUpdates,
  buildWeeklyMacroDays,
  isValidDate,
  resolveMacroTargetUserId,
  resolveOptionalMacroDate,
  serverDisplayDateOnly,
  sanitizeNumber,
  serverUtcDateOnly,
} from './dailyMacroRoutes.utils.mjs';

const router = express.Router();
const ENTRY_ID_REGEX = /^[1-9]\d*$/;

const parseEntryId = (value) => {
  if (typeof value !== 'string' || !ENTRY_ID_REGEX.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

router.use(protect);
router.use('/drafts', dailyMacroDraftRoutes);

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
      clientRequestId,
    } = req.body;

    // S0.4 idempotency: optional client-generated key. A retried mobile request
    // (flaky gym wifi, double-tap) replays the original row instead of
    // double-logging the meal. Uniqueness is enforced by a partial unique index
    // on (userId, clientRequestId), so the guarantee holds across instances.
    let safeClientRequestId = null;
    if (clientRequestId !== undefined && clientRequestId !== null && clientRequestId !== '') {
      if (typeof clientRequestId !== 'string' || !/^[A-Za-z0-9._-]{8,64}$/.test(clientRequestId)) {
        return res.status(400).json({
          success: false,
          error: 'clientRequestId must be 8-64 characters of letters, digits, dot, dash, underscore'
        });
      }
      safeClientRequestId = clientRequestId;
      const existing = await DailyMacroLog.findOne({
        where: { userId: req.user.id, clientRequestId: safeClientRequestId }
      });
      if (existing) {
        return res.status(200).json({ success: true, entry: existing, replayed: true });
      }
    }

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
    const today = serverDisplayDateOnly();
    const maxClientLocalDate = serverUtcDateOnly(1);
    const hasProvidedDate = date !== undefined && date !== null && date !== '';
    if (hasProvidedDate && !isValidDate(date)) {
      return res.status(400).json({ success: false, error: MACRO_DATE_ERROR });
    }
    const entryDate = hasProvidedDate ? date : today;
    if (entryDate > maxClientLocalDate) {
      return res.status(400).json({ success: false, error: 'Cannot log meals for a future date.' });
    }

    // Validate items array
    const safeItems = Array.isArray(items) ? items.slice(0, MAX_ITEMS_COUNT) : [];

    // The model column is an INTEGER foreign key; never persist string IDs.
    const safeAiConversationId = Number.isSafeInteger(aiConversationId) && aiConversationId > 0
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
      clientRequestId:  safeClientRequestId,
      verified:         false,
    }, { userId: req.user.id, source: safeSource });

    return res.status(201).json({ success: true, entry });
  } catch (err) {
    // Race window: two concurrent retries can both miss the pre-check; the
    // partial unique index rejects the loser — return the winner's row.
    if (err?.name === 'SequelizeUniqueConstraintError' && req.body?.clientRequestId) {
      const winner = await DailyMacroLog.findOne({
        where: { userId: req.user.id, clientRequestId: String(req.body.clientRequestId) }
      }).catch(() => null);
      if (winner) {
        return res.status(200).json({ success: true, entry: winner, replayed: true });
      }
    }
    logger.error('[DailyMacroRoutes] Create entry error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to log food entry' });
  }
});

router.get('/', async (req, res) => {
  try {
    const resolvedDate = resolveOptionalMacroDate(req.query.date);
    if (resolvedDate.error) {
      return res.status(resolvedDate.status).json({ success: false, error: resolvedDate.error });
    }
    const date = resolvedDate.date;

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

router.get('/summary', async (req, res) => {
  try {
    const resolvedDate = resolveOptionalMacroDate(req.query.date);
    if (resolvedDate.error) {
      return res.status(resolvedDate.status).json({ success: false, error: resolvedDate.error });
    }
    const date = resolvedDate.date;

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
      const fallbackDate = resolveOptionalMacroDate(req.query.date).date;
      return res.json({ success: true, summary: { date: fallbackDate, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0, totalSugar: 0, totalSodium: 0, mealCount: 0, meals: {} } });
    }
    logger.error('[DailyMacroRoutes] Get summary error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get summary' });
  }
});

router.get('/weekly', async (req, res) => {
  try {
    const defaultStart = (() => {
      return serverDisplayDateOnly(-6);
    })();

    const resolvedStart = resolveOptionalMacroDate(req.query.start, defaultStart);
    if (resolvedStart.error) {
      return res.status(resolvedStart.status).json({ success: false, error: resolvedStart.error });
    }
    const resolvedEnd = resolveOptionalMacroDate(req.query.end);
    if (resolvedEnd.error) {
      return res.status(resolvedEnd.status).json({ success: false, error: resolvedEnd.error });
    }
    const startDate = resolvedStart.date;
    const endDate = resolvedEnd.date;

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

router.patch('/:id', async (req, res) => {
  try {
    const id = parseEntryId(req.params.id);
    if (id === null) {
      return res.status(400).json({ success: false, error: 'Invalid entry ID' });
    }

    const entry = await DailyMacroLog.findOne({
      where: { id, userId: req.user.id },
    });

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    const updates = buildMacroEntryUpdates(entry, req.body);

    // S0.5: capture the before-state first — best-effort, never blocks the edit.
    await recordMacroLogRevision({
      entry, action: 'update', actorUserId: req.user.id, actorRole: req.user.role,
    });
    await entry.update(updates);

    return res.json({ success: true, entry });
  } catch (err) {
    logger.error('[DailyMacroRoutes] Update entry error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update entry' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseEntryId(req.params.id);
    if (id === null) {
      return res.status(400).json({ success: false, error: 'Invalid entry ID' });
    }

    const entry = await DailyMacroLog.findOne({
      where: { id, userId: req.user.id },
    });

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    // S0.5: the audit row deliberately has no FK — it survives this destroy.
    await recordMacroLogRevision({
      entry, action: 'delete', actorUserId: req.user.id, actorRole: req.user.role,
    });
    await entry.destroy();

    return res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    logger.error('[DailyMacroRoutes] Delete entry error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete entry' });
  }
});

export default router;
