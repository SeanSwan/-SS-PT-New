/**
 * FILE: dispatchers/nutritionDispatchers.mjs
 * PURPOSE: Dispatcher handlers for nutrition-domain AI commands
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-11
 * WHAT THIS FILE DOES: Houses the three nutrition-domain command handlers.
 * Extracted from commandDispatcher.mjs (exec-substrate-v14) when that file
 * reached the 300-line ceiling.
 * COMMANDS:
 *   E01: viewNutritionLog  (v4) — DailyMacroLog.findAll today (flat daily summary)
 *   E02: viewMacroTrends   (v4) — DailyMacroLog.findAll 7-day (averaged flat summary)
 *   E03: logMeals          (v5) — macroLogService.createMacroEntries (atomic batch)
 * GRACEFUL ERROR CONTRACT:
 *   Both read commands catch SequelizeDatabaseError for missing table and return
 *   honest empty results rather than crashing. This matches the production safety
 *   pattern established in exec-substrate-v4.
 * FLAT RESULT CONTRACT:
 *   All handlers return primitive scalars only — no nested objects, no arrays.
 *   Shapes are identical to the inline versions they replaced (no behavior change).
 */

import { Op } from 'sequelize';
import { createMacroEntries } from '../../nutrition/macroLogService.mjs';
import { resolveNutritionWriteDate } from '../../nutrition/displayDate.mjs';
import foodScannerService from '../../foodScannerService.mjs';
import DailyMacroLog from '../../../models/DailyMacroLog.mjs';
import logger from '../../../utils/logger.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const displayTimeZone = () => process.env.SWAN_DISPLAY_TZ || 'America/Los_Angeles';

const formatDisplayDate = (date = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: displayTimeZone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    if (values.year && values.month && values.day) {
      return `${values.year}-${values.month}-${values.day}`;
    }
  } catch {
    // Fall back to UTC when SWAN_DISPLAY_TZ is invalid or unavailable.
  }
  return date.toISOString().slice(0, 10);
};

const addCalendarDays = (dateString, days) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

// ── E03: log_meals ────────────────────────────────────────────────────────────

/**
 * Dispatcher for log_meals.
 * Delegates to createMacroEntries which handles: atomic transaction,
 * source normalization to 'ai_chat', per-row date assignment,
 * number sanitization, and the missing-table error path.
 *
 * @param {{ meals: object[], clientId?: number, date?: string }} params
 * @param {{ resolvedClient?: { id: number } }} ctx
 * @returns {Promise<{ mealsLogged, totalCalories, totalProtein, date }>}
 */
export async function logMeals(params, ctx) {
  const clientId = resolveCommandClientId(params, ctx);
  // createMacroEntries handles: atomic transaction, source normalization to 'ai_chat',
  // per-row date assignment, number sanitization, and the missing-table error path.
  return createMacroEntries(params.meals, {
    clientId,
    date: params.date || formatDisplayDate(),
  });
}

// ── E01: view_nutrition_log ───────────────────────────────────────────────────

/**
 * Dispatcher for view_nutrition_log.
 * Returns a single day's macro totals for a client as flat scalars.
 * S2.3 (2026-08-04): optional params.date unlocks "what did she eat
 * yesterday" — capped server-side at a 14-day lookback (Kimi (d)5: an
 * unbounded per-day tool loop is a slow exfiltration oracle) and never a
 * future date. Invalid/out-of-window dates fall back to today rather than
 * erroring — the coach answer stays useful.
 *
 * @param {{ clientId?: number, date?: string }} params
 * @param {{ resolvedClient?: { id: number } }} ctx
 * @returns {Promise<{ date, mealCount, totalCalories, totalProtein, totalCarbs, totalFat }>}
 */
export async function viewNutritionLog(params, ctx) {
  const clientId = resolveCommandClientId(params, ctx);
  const today = formatDisplayDate();
  let date = today;
  if (typeof params?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    const oldest = addCalendarDays(today, -14);
    if (params.date >= oldest && params.date <= today) date = params.date;
  }
  const empty = { date, mealCount: 0, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
  try {
    const rows = await DailyMacroLog.findAll({
      where: { userId: clientId, date },
      attributes: ['calories', 'protein', 'carbs', 'fat'],
    });
    if (rows.length === 0) return empty;
    const round1 = (n) => Math.round(n * 10) / 10;
    return {
      date,
      mealCount: rows.length,
      totalCalories: round1(rows.reduce((s, r) => s + (r.calories || 0), 0)),
      totalProtein:  round1(rows.reduce((s, r) => s + (r.protein  || 0), 0)),
      totalCarbs:    round1(rows.reduce((s, r) => s + (r.carbs    || 0), 0)),
      totalFat:      round1(rows.reduce((s, r) => s + (r.fat      || 0), 0)),
    };
  } catch (err) {
    // Table may not exist in production yet — return honest empty result
    if (err.name === 'SequelizeDatabaseError' && err.message?.includes('does not exist')) {
      logger.warn('[NutritionDispatchers] daily_macro_logs table not found — returning empty nutrition log');
      return empty;
    }
    throw err;
  }
}

// ── E02: view_macro_trends ────────────────────────────────────────────────────

/**
 * Dispatcher for view_macro_trends.
 * Returns a 7-day averaged macro summary for a client as flat scalars.
 *
 * @param {{ clientId?: number }} params
 * @param {{ resolvedClient?: { id: number } }} ctx
 * @returns {Promise<{ daysLogged, avgCalories, avgProtein, avgCarbs, avgFat, startDate, endDate }>}
 */
export async function viewMacroTrends(params, ctx) {
  const clientId = resolveCommandClientId(params, ctx);
  const endDate = formatDisplayDate();
  const startDate = addCalendarDays(endDate, -6);
  const empty = { daysLogged: 0, avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0, startDate, endDate };
  try {
    const rows = await DailyMacroLog.findAll({
      where: { userId: clientId, date: { [Op.between]: [startDate, endDate] } },
      attributes: ['date', 'calories', 'protein', 'carbs', 'fat'],
    });
    if (rows.length === 0) return empty;
    // Aggregate per day, then average across days that have entries
    const daily = {};
    for (const r of rows) {
      const d = r.date;
      if (!daily[d]) daily[d] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      daily[d].calories += r.calories || 0;
      daily[d].protein  += r.protein  || 0;
      daily[d].carbs    += r.carbs    || 0;
      daily[d].fat      += r.fat      || 0;
    }
    const days = Object.values(daily);
    const n = days.length;
    const round1 = (v) => Math.round((v / n) * 10) / 10;
    return {
      daysLogged:  n,
      avgCalories: round1(days.reduce((s, d) => s + d.calories, 0)),
      avgProtein:  round1(days.reduce((s, d) => s + d.protein,  0)),
      avgCarbs:    round1(days.reduce((s, d) => s + d.carbs,    0)),
      avgFat:      round1(days.reduce((s, d) => s + d.fat,      0)),
      startDate,
      endDate,
    };
  } catch (err) {
    // Table may not exist in production yet — return honest empty result
    if (err.name === 'SequelizeDatabaseError' && err.message?.includes('does not exist')) {
      logger.warn('[NutritionDispatchers] daily_macro_logs table not found — returning empty macro trends');
      return empty;
    }
    throw err;
  }
}

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toWholeNumber = (value) => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? 0 : parsed;
};

const toProductData = (product) => (
  product && typeof product.toJSON === 'function' ? product.toJSON() : product
);

// S0.6b: Open Food Facts / FatSecret product names are crowd-sourced, unmoderated
// strings that land inside coach command results and confirmation UI. Same
// discipline as aiChatRoutes' sanitizeFoodContext: strip control chars and
// backticks, restrict to food-safe characters, hard length cap. Third-party
// text is data, never instructions.
const FOOD_SAFE_RE = /[^\w\s.,'\-+%/()&À-ž]/g;
const sanitizeThirdPartyFoodString = (value) => {
  if (value === null || value === undefined) return null;
  const s = String(value)
    .replace(/[\r\n\t`\\]/g, ' ')
    .replace(FOOD_SAFE_RE, '')
    .trim()
    .slice(0, 120);
  return s || null;
};

const nutritionValue = (nutrition, keys) => {
  for (const key of keys) {
    const value = toFiniteNumber(nutrition?.[key]);
    if (value !== null) return value;
  }
  return null;
};

const buildFoodSummary = (product, searchMode, counts) => {
  const data = toProductData(product);
  const nutrition = data?.nutritionalInfo || {};

  return {
    searchMode,
    found: Boolean(data),
    resultCount: counts.resultCount,
    totalMatches: counts.totalMatches,
    firstProductId: data?.id ?? null,
    firstProductName: sanitizeThirdPartyFoodString(data?.name),
    firstBrand: sanitizeThirdPartyFoodString(data?.brand),
    overallRating: data?.overallRating ?? null,
    isOrganic: data ? Boolean(data.isOrganic) : false,
    isNonGMO: data ? Boolean(data.isNonGMO) : false,
    hasHealthConcerns: Array.isArray(data?.healthConcerns) && data.healthConcerns.length > 0,
    caloriesPer100g: nutritionValue(nutrition, ['energy_kcal_100g', 'energy-kcal_100g', 'energy-kcal', 'calories']),
    proteinPer100g: nutritionValue(nutrition, ['proteins_100g', 'proteins', 'protein']),
    carbsPer100g: nutritionValue(nutrition, ['carbohydrates_100g', 'carbohydrates', 'carbs']),
    fatPer100g: nutritionValue(nutrition, ['fat_100g', 'fat']),
  };
};

const emptySodiumSummary = (clientId, date, sodiumLimit, mealSodiumLimit) => ({
  clientId,
  date,
  mealCount: 0,
  totalSodium: 0,
  sodiumLimit,
  mealSodiumLimit,
  overDailyLimit: false,
  flaggedMealCount: 0,
  highSodiumMealCount: 0,
  highestMealSodium: 0,
  highestMealType: null,
});

export async function dispatchFlagSodiumIntake(params = {}, ctx = {}) {
  const clientId = resolveCommandClientId(params, ctx);
  const date = resolveNutritionWriteDate(params.date);
  const sodiumLimit = toWholeNumber(params.sodiumLimit) || 2300;
  const mealSodiumLimit = toWholeNumber(params.mealSodiumLimit) || 800;

  try {
    const rows = await DailyMacroLog.findAll({
      where: { userId: clientId, date },
      attributes: ['sodium', 'flagSodium', 'mealType', 'date'],
    });
    const summary = emptySodiumSummary(clientId, date, sodiumLimit, mealSodiumLimit);

    for (const row of rows) {
      const data = toProductData(row) || {};
      const sodium = toFiniteNumber(data.sodium) || 0;
      summary.mealCount += 1;
      summary.totalSodium += sodium;
      if (data.flagSodium === true) summary.flaggedMealCount += 1;
      if (sodium > mealSodiumLimit) summary.highSodiumMealCount += 1;
      if (sodium > summary.highestMealSodium) {
        summary.highestMealSodium = sodium;
        summary.highestMealType = data.mealType || null;
      }
    }

    summary.totalSodium = Math.round(summary.totalSodium * 10) / 10;
    summary.highestMealSodium = Math.round(summary.highestMealSodium * 10) / 10;
    summary.overDailyLimit = summary.totalSodium > sodiumLimit;
    return summary;
  } catch (err) {
    if (err.name === 'SequelizeDatabaseError' && err.message?.includes('does not exist')) {
      logger.warn('[NutritionDispatchers] daily_macro_logs table not found — returning empty sodium summary');
      return emptySodiumSummary(clientId, date, sodiumLimit, mealSodiumLimit);
    }
    throw err;
  }
}

/**
 * Dispatcher for scan_food.
 * Uses the mounted food-scanner search/scan substrate and returns a flat
 * summary instead of raw product arrays or ingredient payloads.
 *
 * @param {{ query?: string, barcode?: string, limit?: number }} params
 * @param {{ user?: { id?: number|string } }} ctx
 */
export async function dispatchScanFood(params = {}, ctx = {}) {
  if (params.barcode) {
    const userId = toFiniteNumber(ctx.user?.id);
    const product = await foodScannerService.getProductByBarcode(params.barcode, userId);
    const foundCount = product ? 1 : 0;
    return buildFoodSummary(product, 'barcode', {
      resultCount: foundCount,
      totalMatches: foundCount,
    });
  }

  const limit = toWholeNumber(params.limit) || 5;
  const result = await foodScannerService.searchProducts({
    query: params.query,
    limit,
    offset: 0,
  });
  const products = Array.isArray(result?.products) ? result.products : [];
  const totalMatches = toFiniteNumber(result?.pagination?.total) ?? products.length;

  return buildFoodSummary(products[0] || null, 'query', {
    resultCount: products.length,
    totalMatches,
  });
}
