/**
 * ============================================================================
 * FILE: supplementService.mjs
 * PURPOSE: Supplement catalog, affiliate link management, and AI-powered
 *          nutrition gap analysis from DailyMacroLog data
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides curated supplement categories with affiliate
 * links, analyzes user macro logs to identify nutritional gaps, and recommends
 * supplements based on deficiencies. All affiliate links include FTC disclosure.
 *
 * HOW IT FITS IN THE APP: supplementRoutes → supplementService → DailyMacroLog
 * KEY DECISIONS: Static catalog (no DB) for affiliate products — they're external.
 *   Gap analysis queries last 7-30 days of macro logs.
 */

import { Op } from 'sequelize';
import DailyMacroLog from '../models/DailyMacroLog.mjs';
import logger from '../utils/logger.mjs';

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
// SECTION: Supplement Catalog (static — affiliate products)
// ─────────────────────────────────────────────────────────────
const SUPPLEMENT_CATALOG = [
  {
    id: 'ag1',
    name: 'AG1 (Athletic Greens)',
    category: 'greens',
    description: 'Comprehensive daily nutrition with 75 vitamins, minerals, and whole-food sourced ingredients. Supports gut health, immunity, energy, and recovery.',
    price: '$79/month',
    rating: 4.8,
    seansPick: true,
    nasmContext: 'Covers micronutrient gaps that macros alone miss. Especially valuable during caloric restriction phases.',
    affiliateUrl: '', // Sean needs to sign up — placeholder
    imageTag: 'ag1',
    badges: ['Trainer Pick', 'NSF Certified'],
  },
  {
    id: 'whey-protein',
    name: 'Whey Protein Isolate',
    category: 'protein',
    description: 'Fast-absorbing complete protein. Ideal post-workout for muscle protein synthesis. 25-30g protein per scoop.',
    price: '$35-55',
    rating: 4.7,
    seansPick: false,
    nasmContext: 'NASM recommends 1.4-2.0g/kg/day for active individuals. Whey isolate has the highest bioavailability.',
    affiliateUrl: '',
    imageTag: 'whey',
    badges: ['Post-Workout'],
  },
  {
    id: 'plant-protein',
    name: 'Plant-Based Protein Blend',
    category: 'protein',
    description: 'Pea + rice protein blend for complete amino acid profile. Dairy-free, soy-free. 20-25g protein per scoop.',
    price: '$30-50',
    rating: 4.5,
    seansPick: false,
    nasmContext: 'Blended plant proteins match whey for muscle synthesis when combined with leucine-rich sources.',
    affiliateUrl: '',
    imageTag: 'plant-protein',
    badges: ['Vegan'],
  },
  {
    id: 'creatine',
    name: 'Creatine Monohydrate',
    category: 'performance',
    description: 'Most researched supplement in sports nutrition. 5g/day supports strength, power output, and muscle recovery.',
    price: '$15-25',
    rating: 4.9,
    seansPick: true,
    nasmContext: 'NASM OPT Phases 3-5 (Hypertrophy, Max Strength, Power) benefit most from creatine supplementation.',
    affiliateUrl: '',
    imageTag: 'creatine',
    badges: ['Research-Backed', 'Trainer Pick'],
  },
  {
    id: 'vitamin-d3',
    name: 'Vitamin D3 + K2',
    category: 'vitamins',
    description: 'Essential for bone health, immune function, and muscle recovery. 5000 IU D3 with K2 for optimal absorption.',
    price: '$12-20',
    rating: 4.8,
    seansPick: false,
    nasmContext: 'Deficiency linked to increased injury risk and slower recovery. Critical for indoor athletes and northern climates.',
    affiliateUrl: '',
    imageTag: 'vitamin-d',
    badges: ['Essential'],
  },
  {
    id: 'omega3',
    name: 'Omega-3 Fish Oil (EPA/DHA)',
    category: 'recovery',
    description: 'Anti-inflammatory essential fatty acids. Supports joint health, brain function, and cardiovascular health.',
    price: '$18-35',
    rating: 4.6,
    seansPick: false,
    nasmContext: 'Reduces exercise-induced inflammation. Particularly beneficial for high-volume training and joint-heavy sports like golf.',
    affiliateUrl: '',
    imageTag: 'omega3',
    badges: ['Joint Health'],
  },
  {
    id: 'magnesium',
    name: 'Magnesium Glycinate',
    category: 'recovery',
    description: 'Highly bioavailable magnesium for sleep quality, muscle relaxation, and nerve function. 400mg/day.',
    price: '$15-25',
    rating: 4.7,
    seansPick: true,
    nasmContext: 'Depleted during intense exercise via sweat. Glycinate form has best absorption and least GI distress.',
    affiliateUrl: '',
    imageTag: 'magnesium',
    badges: ['Sleep', 'Trainer Pick'],
  },
  {
    id: 'electrolytes',
    name: 'Electrolyte Mix (No Sugar)',
    category: 'performance',
    description: 'Sodium, potassium, magnesium blend for hydration. Zero sugar, zero calories. Essential for athletes.',
    price: '$20-30',
    rating: 4.6,
    seansPick: false,
    nasmContext: 'NASM hydration protocol: replace electrolytes during sessions >60 minutes or in hot/humid conditions.',
    affiliateUrl: '',
    imageTag: 'electrolytes',
    badges: ['Hydration'],
  },
  {
    id: 'collagen',
    name: 'Collagen Peptides',
    category: 'recovery',
    description: 'Type I & III collagen for joint, tendon, and skin health. 10-20g/day. Unflavored mixes into anything.',
    price: '$25-40',
    rating: 4.5,
    seansPick: false,
    nasmContext: 'Emerging research supports collagen + vitamin C 30-60 min before exercise for connective tissue repair.',
    affiliateUrl: '',
    imageTag: 'collagen',
    badges: ['Joint Health'],
  },
  {
    id: 'probiotic',
    name: 'Multi-Strain Probiotic',
    category: 'gut-health',
    description: 'Broad-spectrum probiotic with 50+ billion CFU. Supports gut-brain axis, nutrient absorption, immunity.',
    price: '$25-40',
    rating: 4.5,
    seansPick: false,
    nasmContext: 'Gut health affects nutrient absorption efficiency. Poor gut = wasted macros regardless of diet quality.',
    affiliateUrl: '',
    imageTag: 'probiotic',
    badges: ['Gut Health'],
  },
  {
    id: 'beta-alanine',
    name: 'Beta-Alanine',
    category: 'performance',
    description: 'Buffers lactic acid for longer high-intensity sets. 3-6g/day. Tingling (paresthesia) is harmless.',
    price: '$15-25',
    rating: 4.4,
    seansPick: false,
    nasmContext: 'Most effective in NASM OPT Phases 2-3 (Strength Endurance, Hypertrophy) where sets are 8-20 reps.',
    affiliateUrl: '',
    imageTag: 'beta-alanine',
    badges: ['Endurance'],
  },
  {
    id: 'sleep-formula',
    name: 'Sleep & Recovery Formula',
    category: 'sleep',
    description: 'Magnesium, L-theanine, and ashwagandha blend. Supports deep sleep and cortisol management.',
    price: '$25-35',
    rating: 4.6,
    seansPick: false,
    nasmContext: 'Recovery happens during sleep. Poor sleep = elevated cortisol = muscle breakdown + fat storage.',
    affiliateUrl: '',
    imageTag: 'sleep',
    badges: ['Recovery', 'Sleep'],
  },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Category Definitions
// ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'greens', name: 'Greens & Superfoods', icon: 'leaf', description: 'Daily micronutrient coverage' },
  { id: 'protein', name: 'Protein', icon: 'dumbbell', description: 'Muscle protein synthesis support' },
  { id: 'performance', name: 'Performance', icon: 'zap', description: 'Strength, power, and endurance' },
  { id: 'vitamins', name: 'Vitamins & Minerals', icon: 'sun', description: 'Essential micronutrients' },
  { id: 'recovery', name: 'Recovery & Joint Health', icon: 'heart', description: 'Inflammation and repair' },
  { id: 'gut-health', name: 'Gut Health', icon: 'shield', description: 'Absorption and immunity' },
  { id: 'sleep', name: 'Sleep & Stress', icon: 'moon', description: 'Recovery optimization' },
];

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
    t.protein += log.protein || 0;
    t.carbs += log.carbs || 0;
    t.fat += log.fat || 0;
    t.fiber += log.fiber || 0;
    t.sugar += log.sugar || 0;
    t.sodium += log.sodium || 0;
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

  // Protein gap
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

  // Fiber gap (most common)
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

  // Micronutrient coverage (inferred from low variety / high processed food)
  const processedFlags = logs.filter(l => l.flagProcessed).length;
  const processedPct = (processedFlags / logs.length) * 100;
  if (processedPct > 40) {
    gaps.push({
      nutrient: 'Micronutrients (inferred)',
      avgDaily: `${Math.round(processedPct)}% ultra-processed meals`,
      target: '<25% ultra-processed',
      percentMet: Math.round(100 - processedPct),
      severity: processedPct > 60 ? 'high' : 'moderate',
      recommendation: 'High processed food intake suggests micronutrient gaps. A comprehensive greens formula covers blind spots.',
      suggestedSupplements: ['ag1', 'probiotic'],
    });
  }

  // Sugar excess (not a gap but a flag)
  if (avg.sugar > DAILY_VALUES.sugar) {
    gaps.push({
      nutrient: 'Added Sugar (excess)',
      avgDaily: `${avg.sugar}g`,
      target: `<${DAILY_VALUES.sugar}g`,
      percentMet: Math.round(100 - ((avg.sugar - DAILY_VALUES.sugar) / DAILY_VALUES.sugar) * 100),
      severity: avg.sugar > DAILY_VALUES.sugar * 1.5 ? 'high' : 'moderate',
      recommendation: 'Elevated sugar intake stresses gut health and insulin sensitivity. Consider a probiotic and reducing processed foods.',
      suggestedSupplements: ['probiotic'],
    });
  }

  // Sodium excess
  if (avg.sodium > DAILY_VALUES.sodium) {
    gaps.push({
      nutrient: 'Sodium (excess)',
      avgDaily: `${avg.sodium}mg`,
      target: `<${DAILY_VALUES.sodium}mg`,
      percentMet: Math.round(100 - ((avg.sodium - DAILY_VALUES.sodium) / DAILY_VALUES.sodium) * 100),
      severity: avg.sodium > DAILY_VALUES.sodium * 1.3 ? 'high' : 'moderate',
      recommendation: 'High sodium increases blood pressure and water retention. Potassium-rich electrolytes can help balance.',
      suggestedSupplements: ['electrolytes'],
    });
  }

  // General recovery recommendation for active users
  gaps.push({
    nutrient: 'Recovery Support',
    avgDaily: 'N/A',
    target: 'Active lifestyle',
    percentMet: null,
    severity: 'info',
    recommendation: 'Active individuals benefit from omega-3s for inflammation, magnesium for sleep, and vitamin D for immune support.',
    suggestedSupplements: ['omega3', 'magnesium', 'vitamin-d3'],
  });

  logger.info(`[SupplementService] Gap analysis for user ${userId}: ${gaps.length} gaps found over ${daysWithData} days`);

  return {
    gaps,
    summary: {
      avgCalories: avg.calories,
      avgProtein: avg.protein,
      avgCarbs: avg.carbs,
      avgFat: avg.fat,
      avgFiber: avg.fiber,
      avgSugar: avg.sugar,
      avgSodium: avg.sodium,
    },
    daysAnalyzed: days,
    daysWithData,
  };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Catalog Access
// ─────────────────────────────────────────────────────────────

export function getCategories() {
  return CATEGORIES;
}

export function getProducts(category = null) {
  if (category) {
    return SUPPLEMENT_CATALOG.filter(p => p.category === category);
  }
  return SUPPLEMENT_CATALOG;
}

export function getProduct(id) {
  return SUPPLEMENT_CATALOG.find(p => p.id === id) || null;
}

export function getSeansPicks() {
  return SUPPLEMENT_CATALOG.filter(p => p.seansPick);
}

export default {
  analyzeNutritionGaps,
  getCategories,
  getProducts,
  getProduct,
  getSeansPicks,
};
