/**
 * ============================================================================
 * FILE: supplementService.mjs
 * PURPOSE: Supplement gap analysis and catalog access
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Analyzes user macro logs to identify nutritional gaps
 *   and recommends supplements. Catalog/category data lives in supplementData.mjs.
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

// ─────────────────────────────────────────────────────────────
// SECTION: Gap Analysis Engine
// ─────────────────────────────────────────────────────────────

/**
 * Analyzes a user's macro logs over the last N days and identifies
 * nutritional gaps with supplement recommendations.
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
      recommendation: 'Consider a protein supplement to close the gap, especially post-workout.',
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
      recommendation: 'Increase whole grains, vegetables, and legumes. A greens supplement can help.',
      suggestedSupplements: ['ag1'],
    });
  }

  const processedFlags = logs.filter(l => l.flagProcessed).length;
  const processedPct = (processedFlags / logs.length) * 100;
  if (processedPct > 40) {
    gaps.push({
      nutrient: 'Micronutrients (inferred)',
      avgDaily: `${Math.round(processedPct)}% ultra-processed meals`,
      target: '<25% ultra-processed',
      percentMet: Math.round(100 - processedPct),
      severity: processedPct > 60 ? 'high' : 'moderate',
      recommendation: 'High processed food intake suggests micronutrient gaps. A greens formula covers blind spots.',
      suggestedSupplements: ['ag1', 'probiotic'],
    });
  }

  if (avg.sugar > DAILY_VALUES.sugar) {
    gaps.push({
      nutrient: 'Added Sugar (excess)',
      avgDaily: `${avg.sugar}g`,
      target: `<${DAILY_VALUES.sugar}g`,
      percentMet: Math.round(100 - ((avg.sugar - DAILY_VALUES.sugar) / DAILY_VALUES.sugar) * 100),
      severity: avg.sugar > DAILY_VALUES.sugar * 1.5 ? 'high' : 'moderate',
      recommendation: 'Elevated sugar intake stresses gut health and insulin sensitivity. Consider a probiotic.',
      suggestedSupplements: ['probiotic'],
    });
  }

  if (avg.sodium > DAILY_VALUES.sodium) {
    gaps.push({
      nutrient: 'Sodium (excess)',
      avgDaily: `${avg.sodium}mg`,
      target: `<${DAILY_VALUES.sodium}mg`,
      percentMet: Math.round(100 - ((avg.sodium - DAILY_VALUES.sodium) / DAILY_VALUES.sodium) * 100),
      severity: avg.sodium > DAILY_VALUES.sodium * 1.3 ? 'high' : 'moderate',
      recommendation: 'High sodium increases blood pressure and water retention. Potassium-rich electrolytes help balance.',
      suggestedSupplements: ['electrolytes'],
    });
  }

  gaps.push({
    nutrient: 'Recovery Support',
    avgDaily: 'N/A',
    target: 'Active lifestyle',
    percentMet: null,
    severity: 'info',
    recommendation: 'Active individuals benefit from omega-3s for inflammation, magnesium for sleep, and vitamin D for immune support.',
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
