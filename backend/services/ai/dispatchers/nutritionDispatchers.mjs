/**
 * ============================================================================
 * FILE: dispatchers/nutritionDispatchers.mjs
 * PURPOSE: Dispatcher handlers for nutrition-domain AI commands
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Houses the three nutrition-domain command handlers.
 * Extracted from commandDispatcher.mjs (exec-substrate-v14) when that file
 * reached the 300-line ceiling.
 *
 * COMMANDS:
 *   E01: viewNutritionLog  (v4) — DailyMacroLog.findAll today (flat daily summary)
 *   E02: viewMacroTrends   (v4) — DailyMacroLog.findAll 7-day (averaged flat summary)
 *   E03: logMeals          (v5) — macroLogService.createMacroEntries (atomic batch)
 *
 * GRACEFUL ERROR CONTRACT:
 *   Both read commands catch SequelizeDatabaseError for missing table and return
 *   honest empty results rather than crashing. This matches the production safety
 *   pattern established in exec-substrate-v4.
 *
 * FLAT RESULT CONTRACT:
 *   All handlers return primitive scalars only — no nested objects, no arrays.
 *   Shapes are identical to the inline versions they replaced (no behavior change).
 * ============================================================================
 */

import { Op } from 'sequelize';
import { createMacroEntries } from '../../nutrition/macroLogService.mjs';
import DailyMacroLog from '../../../models/DailyMacroLog.mjs';
import logger from '../../../utils/logger.mjs';

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
  const clientId = params.clientId ?? ctx.resolvedClient?.id;
  // createMacroEntries handles: atomic transaction, source normalization to 'ai_chat',
  // per-row date assignment, number sanitization, and the missing-table error path.
  return createMacroEntries(params.meals, {
    clientId,
    date: params.date || null,   // service defaults to today when null
  });
}

// ── E01: view_nutrition_log ───────────────────────────────────────────────────

/**
 * Dispatcher for view_nutrition_log.
 * Returns today's macro totals for a client as flat scalars.
 *
 * @param {{ clientId?: number }} params
 * @param {{ resolvedClient?: { id: number } }} ctx
 * @returns {Promise<{ date, mealCount, totalCalories, totalProtein, totalCarbs, totalFat }>}
 */
export async function viewNutritionLog(params, ctx) {
  const clientId = params.clientId ?? ctx.resolvedClient?.id;
  const today = new Date().toISOString().slice(0, 10);
  const empty = { date: today, mealCount: 0, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
  try {
    const rows = await DailyMacroLog.findAll({
      where: { userId: clientId, date: today },
      attributes: ['calories', 'protein', 'carbs', 'fat'],
    });
    if (rows.length === 0) return empty;
    const round1 = (n) => Math.round(n * 10) / 10;
    return {
      date: today,
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
  const clientId = params.clientId ?? ctx.resolvedClient?.id;
  const endDate   = new Date().toISOString().slice(0, 10);
  const startD    = new Date();
  startD.setDate(startD.getDate() - 6);          // last 7 days inclusive
  const startDate = startD.toISOString().slice(0, 10);
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
