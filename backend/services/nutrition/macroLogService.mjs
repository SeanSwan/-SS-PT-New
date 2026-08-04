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
 *   Route-side accepted: 'manual', 'ai-chat', 'food-scanner', 'barcode', 'voice', 'usda_lookup'
 *   Model-valid stored:  'manual', 'ai_chat', 'voice', 'barcode', 'usda_lookup', 'photo'
 *   The 'ai-chat' → 'ai_chat' normalization fixes a pre-existing mismatch.
 */

import DailyMacroLog from '../../models/DailyMacroLog.mjs';
import logger from '../../utils/logger.mjs';
import { resolveNutritionWriteDate } from './displayDate.mjs';
import { sanitizeNutritionCopy } from './nutritionCareCopy.mjs';

// ── Constants ────────────────────────────────────────────────────────────────

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'];
const MAX_MACRO_VALUE  = 99999;
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

const resolveMacroLogDate = (value) => resolveNutritionWriteDate(value);

const normalizeMacroMealType = (value) => {
  if (typeof value !== 'string') return 'snack';
  const normalized = value.trim().toLowerCase();
  return VALID_MEAL_TYPES.includes(normalized) ? normalized : 'snack';
};

const sanitizeMacroItem = (item) => {
  if (typeof item === 'string') return sanitizeNutritionCopy(item, '', 150);
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;

  const next = { ...item };
  if (typeof next.name === 'string') next.name = sanitizeNutritionCopy(next.name, '', 150);
  if (typeof next.serving === 'string') next.serving = sanitizeNutritionCopy(next.serving, '', 100);
  if (typeof next.description === 'string') next.description = sanitizeNutritionCopy(next.description, '', 150);
  return next;
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

  const safeDescription = sanitizeNutritionCopy(data.description.trim(), '', 500);
  if (!safeDescription) {
    throw new Error('Food description is required');
  }

  // S0.7: FDA extended fields moved here from the legacy raw-SQL path
  // (aiDataWriteService.insertMacroLog) so ONE writer owns the full column
  // set. Flags auto-compute from per-meal thresholds: sodium >33% of 2,300mg
  // DV, added sugar >50% AHA women's limit, cholesterol >33% of 300mg DV,
  // saturated fat >33% of 20g DV, ANY trans fat, NOVA group 4 ultra-processed.
  const sodium       = sanitizeNumber(data.sodium);
  const addedSugar   = sanitizeNumber(data.addedSugar);
  const cholesterol  = sanitizeNumber(data.cholesterol);
  const saturatedFat = sanitizeNumber(data.saturatedFat);
  const transFat     = sanitizeNumber(data.transFat);
  const novaParsed   = toFiniteDecimalNumber(data.novaGroup);
  const novaGroup    = Number.isInteger(novaParsed) && novaParsed >= 1 && novaParsed <= 4
                         ? novaParsed : null;

  return {
    userId,
    date:             resolveMacroLogDate(data.date),
    mealType:         normalizeMacroMealType(data.mealType),
    description:      safeDescription,
    calories:         sanitizeNumber(data.calories),
    protein:          sanitizeNumber(data.protein),
    carbs:            sanitizeNumber(data.carbs),
    fat:              sanitizeNumber(data.fat),
    fiber:            sanitizeNumber(data.fiber),
    sugar:            sanitizeNumber(data.sugar),
    sodium,
    addedSugar,
    saturatedFat,
    transFat,
    cholesterol,
    novaGroup,
    brandName:        sanitizeNutritionCopy(data.brandName, '', 200) || null,
    mealSource:       sanitizeNutritionCopy(data.mealSource, '', 50) || null,
    flagSodium:       (sodium ?? 0) > 800,
    flagSugar:        (addedSugar ?? 0) > 12,
    flagCholesterol:  (cholesterol ?? 0) > 100,
    flagSaturatedFat: (saturatedFat ?? 0) > 7,
    flagTransFat:     (transFat ?? 0) > 0,
    flagProcessed:    novaGroup === 4,
    items:            Array.isArray(data.items) ? data.items.slice(0, 50).map(sanitizeMacroItem) : [],
    aiConversationId: Number.isSafeInteger(data.aiConversationId) && data.aiConversationId > 0
                        ? data.aiConversationId : null,
    clientRequestId:  typeof data.clientRequestId === 'string' && data.clientRequestId ? data.clientRequestId : null,
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
