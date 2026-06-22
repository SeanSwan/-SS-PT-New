/**
 * ============================================================================
 * FILE: macroLogService.mjs
 * PURPOSE: Shared nutrition write service for DailyMacroLog creation
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-10
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides the canonical write path for DailyMacroLog rows.
 * Used by both:
 *   - POST /api/macros  (HTTP route adapter — single-entry)
 *   - log_meals command dispatcher (AI command lane — atomic batch)
 *
 * WHY THIS EXISTS: Two divergent write paths existed before v5 (HTTP route + legacy
 * insertMacroLog raw-SQL in aiDataWriteService). This service is the canonical ORM
 * path. Source normalization is handled here so stored values are always model-valid.
 *
 * SOURCE NORMALIZATION:
 *   Route-side accepted: 'manual', 'ai-chat', 'food-scanner', 'barcode'
 *   Model-valid stored:  'manual', 'ai_chat', 'voice', 'barcode', 'usda_lookup', 'photo'
 *   The 'ai-chat' → 'ai_chat' normalization fixes a pre-existing mismatch.
 */

import DailyMacroLog from '../../models/DailyMacroLog.mjs';
import logger from '../../utils/logger.mjs';
import { formatDisplayDate } from './displayDate.mjs';

// ── Constants ────────────────────────────────────────────────────────────────

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'];
const MAX_MACRO_VALUE  = 99999;
const DATE_REGEX       = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_NUMBER_REGEX = /^\d+(?:\.\d+)?$/;

// Map route-side source strings → model-valid stored values
const SOURCE_MAP = {
  'ai-chat':    'ai_chat',
  'ai_chat':    'ai_chat',
  'manual':     'manual',
  'barcode':    'barcode',
  'voice':      'voice',
  'usda_lookup':'usda_lookup',
  'food-scanner':'photo', // AI meal-photo estimate — keep provenance distinct from hand-typed 'manual'
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const toFiniteDecimalNumber = (val) => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val !== 'string') return null;

  const trimmed = val.trim();
  if (!DECIMAL_NUMBER_REGEX.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeNumber = (val) => {
  if (val === null || val === undefined) return null;
  const n = toFiniteDecimalNumber(val);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(Math.round(n * 10) / 10, MAX_MACRO_VALUE);
};

const isValidDate = (str) => {
  if (typeof str !== 'string' || !DATE_REGEX.test(str)) return false;
  const [year, month, day] = str.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};

const hasProvidedDate = (value) => value !== undefined && value !== null && value !== '';
const resolveMacroLogDate = (value) => {
  if (!hasProvidedDate(value)) return formatDisplayDate();
  if (!isValidDate(value)) {
    throw new Error('Date must be a real YYYY-MM-DD calendar date');
  }
  return value;
};

/**
 * Normalize a source string to a model-valid stored value.
 * @param {string|undefined} source
 * @returns {string}
 */
export function normalizeMacroSource(source) {
  return SOURCE_MAP[source] || 'manual';
}

/**
 * Build a sanitized DailyMacroLog attribute object from raw meal input.
 * Handles: description validation, mealType default, date default, number sanitization.
 *
 * @param {Object} data - Raw meal data
 * @param {number} userId - Target user ID
 * @param {string} source - Source string (will be normalized to model-valid value)
 * @returns {Object} Sanitized attributes ready for DailyMacroLog.create()
 * @throws {Error} If description is missing or empty
 */
export function buildMacroRow(data, { userId, source = 'manual' }) {
  if (!data.description || typeof data.description !== 'string' || !data.description.trim()) {
    throw new Error('Food description is required');
  }

  return {
    userId,
    date:             resolveMacroLogDate(data.date),
    mealType:         VALID_MEAL_TYPES.includes(data.mealType) ? data.mealType : 'snack',
    description:      data.description.trim().slice(0, 500),
    calories:         sanitizeNumber(data.calories),
    protein:          sanitizeNumber(data.protein),
    carbs:            sanitizeNumber(data.carbs),
    fat:              sanitizeNumber(data.fat),
    fiber:            sanitizeNumber(data.fiber),
    sugar:            sanitizeNumber(data.sugar),
    sodium:           sanitizeNumber(data.sodium),
    items:            Array.isArray(data.items) ? data.items.slice(0, 50) : [],
    aiConversationId: (typeof data.aiConversationId === 'string' && data.aiConversationId.length <= 100)
                        ? data.aiConversationId : null,
    source:           normalizeMacroSource(source),
    verified:         false,
  };
}

/**
 * Create a single DailyMacroLog entry.
 * Used by the POST /api/macros route adapter.
 * The route is responsible for its own HTTP-layer validation; this function
 * handles normalization and the DB write.
 *
 * @param {Object} sanitizedData - Pre-validated data from the route
 * @param {{ userId: number, source?: string }} opts
 * @returns {Promise<DailyMacroLog>}
 */
export async function createSingleMacroEntry(sanitizedData, { userId, source = 'manual' }) {
  return DailyMacroLog.create({
    ...sanitizedData,
    userId,
    date: resolveMacroLogDate(sanitizedData.date),
    source: normalizeMacroSource(source),
    verified: false,
  });
}

/**
 * Create multiple DailyMacroLog entries atomically (for AI command dispatcher).
 * All rows are committed together or none are — transaction-backed.
 *
 * @param {Array<{description: string, mealType?: string, calories?: number, protein?: number, carbs?: number, fat?: number}>} meals
 * @param {{ clientId: number, date?: string }} opts
 * @returns {Promise<{ mealsLogged: number, date: string, totalCalories: number, totalProtein: number, totalCarbs: number, totalFat: number }>}
 * @throws {Error} If any row fails to insert (transaction rolled back)
 */
export async function createMacroEntries(meals, { clientId, date }) {
  const targetDate = resolveMacroLogDate(date);
  const round1     = (n) => Math.round(n * 10) / 10;

  const t = await DailyMacroLog.sequelize.transaction();
  try {
    const rows = [];
    for (const meal of meals) {
      const attrs = buildMacroRow({ ...meal, date: targetDate }, { userId: clientId, source: 'ai_chat' });
      const row = await DailyMacroLog.create(attrs, { transaction: t });
      rows.push(row);
    }
    await t.commit();

    logger.info('[MacroLogService] Batch macro log committed', {
      clientId,
      date: targetDate,
      count: rows.length,
    });

    return {
      mealsLogged:   rows.length,
      date:          targetDate,
      totalCalories: round1(rows.reduce((s, r) => s + (r.calories || 0), 0)),
      totalProtein:  round1(rows.reduce((s, r) => s + (r.protein  || 0), 0)),
      totalCarbs:    round1(rows.reduce((s, r) => s + (r.carbs    || 0), 0)),
      totalFat:      round1(rows.reduce((s, r) => s + (r.fat      || 0), 0)),
    };
  } catch (err) {
    await t.rollback();
    logger.error('[MacroLogService] Batch macro log rolled back', {
      clientId,
      date: targetDate,
      error: err.message,
    });
    throw err;
  }
}
