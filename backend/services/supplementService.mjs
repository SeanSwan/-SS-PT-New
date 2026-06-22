/**
 * ============================================================================
 * FILE: supplementService.mjs
 * PURPOSE: Supplement gap analysis and catalog access
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Analyzes user macro logs for nutrition support signals
 *   and returns coach-review supplement discussion cues. Catalog/category data
 *   lives in supplementData.mjs.
 *
 * HOW IT FITS IN THE APP: supplementRoutes → supplementService → DailyMacroLog
 * KEY DECISIONS: Static catalog (no DB) for affiliate products — they're external.
 *   Gap analysis queries last 7-30 days of macro logs.
 */

import { Op } from 'sequelize';
import DailyMacroLog from '../models/DailyMacroLog.mjs';
import logger from '../utils/logger.mjs';
import { SUPPLEMENT_CATALOG, CATEGORIES } from './supplementData.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Daily Value References (FDA 2020)
// ─────────────────────────────────────────────────────────────
const DAILY_VALUES = {
  protein: 50,       // grams
  fiber: 28,         // grams
  calories: 2000,
  fat: 78,           // grams
  carbs: 275,        // grams
  sugar: 50,         // grams (added sugar limit)
  sodium: 2300,      // mg
  cholesterol: 300,  // mg
  saturatedFat: 20,  // grams
};

const pctRemainingWithinLimit = (actual, limit) =>
  Math.max(0, Math.round(100 - ((actual - limit) / limit) * 100));

// ─────────────────────────────────────────────────────────────
// SECTION: Gap Analysis Engine
// ─────────────────────────────────────────────────────────────

/**
 * Analyzes a user's macro logs over the last N days and identifies
 * nutrition support signals with supplement discussion cues.
 * @param {number} userId
 * @param {number} days - lookback window (default 7)
 * @returns {{ gaps: Array, summary: object, daysAnalyzed: number }}
 */
export async function analyzeNutritionGaps(userId, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await DailyMacroLog.findAll({
    where: {
      userId,
      date: { [Op.gte]: since.toISOString().split('T')[0] },
    },
    order: [['date', 'ASC']],
    raw: true,
  });

  if (!logs.length) {
    return {
      gaps: [],
      summary: { message: 'No meal logs found. Log at least 3 days of meals for gap analysis.' },
      daysAnalyzed: 0,
      daysWithData: 0,
    };
  }

  // Group by date to get daily totals
  const dailyTotals = {};
  for (const log of logs) {
    const d = log.date;
    if (!dailyTotals[d]) {
      dailyTotals[d] = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
    }
    const t = dailyTotals[d];
    t.calories += log.calories || 0;
    t.protein  += log.protein  || 0;
    t.carbs    += log.carbs    || 0;
    t.fat      += log.fat      || 0;
    t.fiber    += log.fiber    || 0;
    t.sugar    += log.sugar    || 0;
    t.sodium   += log.sodium   || 0;
  }

  const daysWithData = Object.keys(dailyTotals).length;
  if (daysWithData < 2) {
    return {
      gaps: [],
      summary: { message: 'Need at least 2 days of logs for meaningful gap analysis.' },
      daysAnalyzed: days,
      daysWithData,
    };
  }

  // Calculate averages
  const avg = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  for (const d of Object.values(dailyTotals)) {
    for (const k of Object.keys(avg)) avg[k] += d[k];
  }
  for (const k of Object.keys(avg)) avg[k] = Math.round((avg[k] / daysWithData) * 10) / 10;

  // Identify gaps
  const gaps = [];

  const proteinPct = (avg.protein / DAILY_VALUES.protein) * 100;
  if (proteinPct < 80) {
    gaps.push({
      nutrient: 'Protein',
      avgDaily: `${avg.protein}g`,
      target: `${DAILY_VALUES.protein}g`,
      percentMet: Math.round(proteinPct),
      severity: proteinPct < 50 ? 'high' : 'moderate',
      recommendation: 'If this reflects a typical training week, a protein option can make the coach-set target easier to reach, especially after training.',
      suggestedSupplements: ['whey-protein', 'plant-protein', 'collagen'],
    });
  }

  const fiberPct = (avg.fiber / DAILY_VALUES.fiber) * 100;
  if (fiberPct < 80) {
    gaps.push({
      nutrient: 'Fiber',
      avgDaily: `${avg.fiber}g`,
      target: `${DAILY_VALUES.fiber}g`,
      percentMet: Math.round(fiberPct),
      severity: fiberPct < 50 ? 'high' : 'moderate',
      recommendation: 'Emphasize whole grains, vegetables, and legumes first. A greens option can be convenience support when meals are limited.',
      suggestedSupplements: ['ag1'],
    });
  }

  const processedFlags = logs.filter(l => l.flagProcessed).length;
  const processedPct = (processedFlags / logs.length) * 100;
  if (processedPct > 40) {
    gaps.push({
      nutrient: 'Meal Variety Support (inferred)',
      avgDaily: `${Math.round(processedPct)}% ultra-processed meals`,
      target: 'More whole-food meals across the week',
      percentMet: Math.round(100 - processedPct),
      severity: processedPct > 60 ? 'high' : 'moderate',
      recommendation: 'This pattern may reflect limited meal variety. Rotate whole-food meals when possible; a greens option can be discussed with your coach.',
      suggestedSupplements: ['ag1', 'probiotic'],
    });
  }

  if (avg.sugar > DAILY_VALUES.sugar) {
    gaps.push({
      nutrient: 'Added Sugar Context',
      avgDaily: `${avg.sugar}g`,
      target: `<${DAILY_VALUES.sugar}g`,
      percentMet: pctRemainingWithinLimit(avg.sugar, DAILY_VALUES.sugar),
      severity: avg.sugar > DAILY_VALUES.sugar * 1.5 ? 'high' : 'moderate',
      recommendation: 'Use this as a context cue for meal timing and label review. A probiotic is optional, not a substitute for food and hydration basics.',
      suggestedSupplements: ['probiotic'],
    });
  }

  if (avg.sodium > DAILY_VALUES.sodium) {
    gaps.push({
      nutrient: 'Sodium Context',
      avgDaily: `${avg.sodium}mg`,
      target: `<${DAILY_VALUES.sodium}mg`,
      percentMet: pctRemainingWithinLimit(avg.sodium, DAILY_VALUES.sodium),
      severity: avg.sodium > DAILY_VALUES.sodium * 1.3 ? 'high' : 'moderate',
      recommendation: 'Use this as a cue to review packaged or restaurant meals and hydration context with your coach. Electrolytes can support training-day hydration when sweat losses are high.',
      suggestedSupplements: ['electrolytes'],
    });
  }

  gaps.push({
    nutrient: 'Recovery Support',
    avgDaily: 'N/A',
    target: 'Active lifestyle',
    percentMet: null,
    severity: 'info',
    recommendation: 'For active clients, omega-3s, magnesium, and vitamin D can be discussion starters for recovery support based on diet, labs, medications, and clinician guidance.',
    suggestedSupplements: ['omega3', 'magnesium', 'vitamin-d3'],
  });

  logger.info(`[SupplementService] Gap analysis for user ${userId}: ${gaps.length} gaps over ${daysWithData} days`);

  return {
    gaps,
    summary: {
      avgCalories: avg.calories, avgProtein: avg.protein, avgCarbs: avg.carbs,
      avgFat: avg.fat, avgFiber: avg.fiber, avgSugar: avg.sugar, avgSodium: avg.sodium,
    },
    daysAnalyzed: days,
    daysWithData,
  };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Catalog Access
// ─────────────────────────────────────────────────────────────

export function getCategories() { return CATEGORIES; }

export function getProducts(category = null) {
  return category ? SUPPLEMENT_CATALOG.filter(p => p.category === category) : SUPPLEMENT_CATALOG;
}

export function getProduct(id) {
  return SUPPLEMENT_CATALOG.find(p => p.id === id) || null;
}

export function getSeansPicks() {
  return SUPPLEMENT_CATALOG.filter(p => p.seansPick);
}

export default { analyzeNutritionGaps, getCategories, getProducts, getProduct, getSeansPicks };
