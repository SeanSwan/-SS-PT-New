/**
 * ============================================================================
 * FILE: mealPlanService.mjs
 * PURPOSE: AI-powered meal plan generation with golf-client presets, using
 *          Gemini to create NASM-aligned nutrition plans
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Generates personalized meal plans via Gemini based on
 * user's calorie/macro targets, dietary restrictions, health conditions, and
 * activity type. Includes golf-specific presets for pre-round, on-course,
 * post-round, and tournament day nutrition.
 *
 * HOW IT FITS IN THE APP: mealPlanRoutes → mealPlanService → Gemini API
 * KEY DECISIONS: Returns structured JSON meal plans, not conversational text.
 *   Golf presets are data-driven (no DB needed — static expert knowledge).
 */

import logger from '../utils/logger.mjs';
import { NUTRITION_CARE_COPY_RULES, sanitizeNutritionCopy } from './nutrition/nutritionCareCopy.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Golf Nutrition Presets
// ─────────────────────────────────────────────────────────────
const GOLF_PRESETS = {
  'pre-round': {
    name: 'Pre-Round Fuel',
    timing: '2-3 hours before tee time',
    description: 'Complex carbs + moderate protein for sustained energy. Moderate fat/fiber can keep digestion comfortable on the course.',
    macroSplit: { carbPct: 55, proteinPct: 25, fatPct: 20 },
    calorieRange: '400-600',
    sampleMeals: [
      'Oatmeal with banana and honey + 2 scrambled eggs',
      'Whole wheat toast with peanut butter + Greek yogurt',
      'Rice bowl with grilled chicken and light teriyaki',
    ],
    hydration: 'Begin the round comfortably hydrated. Keep caffeine moderate if it supports focus without jitters.',
    avoid: ['Large high-fat meals', 'Very high-fiber meals', 'Excess caffeine', 'Alcohol close to tee time', 'New/unfamiliar foods'],
  },
  'on-course': {
    name: 'On-Course Fueling',
    timing: 'Every 3-4 holes (45-60 min intervals)',
    description: 'Quick-digesting carbs + electrolytes to maintain blood sugar and focus through 18 holes.',
    macroSplit: { carbPct: 65, proteinPct: 15, fatPct: 20 },
    calorieRange: '100-200 per snack',
    sampleMeals: [
      'Trail mix (nuts, dried fruit, dark chocolate)',
      'Banana or apple with individual nut butter packet',
      'Energy bar (200-250 cal, <5g fiber)',
      'Turkey and cheese wrap (half portion)',
    ],
    hydration: 'Sip steadily between holes. Consider electrolytes when heat, humidity, sweat, or round length make plain water feel insufficient.',
    avoid: ['Large heavy sandwiches', 'High-sugar snacks without protein/fat pairing', 'Beer during play', 'Soda without water pairing'],
  },
  'post-round': {
    name: 'Post-Round Recovery',
    timing: 'Within 30-60 minutes of finishing',
    description: 'Protein-forward with carbs to replenish glycogen. Golf is 4-5 hours of walking — recovery matters.',
    macroSplit: { carbPct: 40, proteinPct: 35, fatPct: 25 },
    calorieRange: '500-700',
    sampleMeals: [
      'Grilled chicken salad with quinoa and avocado',
      'Salmon with sweet potato and steamed vegetables',
      'Protein shake + whole grain wrap with lean meat',
    ],
    hydration: 'Rehydrate gradually after the round and pair fluids with food. Consider electrolytes after hot or especially sweaty rounds.',
    avoid: ['Skipping the post-round meal', 'Alcohol before rehydrating', 'Large high-fat meals right after play'],
  },
  'tournament-day': {
    name: 'Tournament Day Protocol',
    timing: 'Full day plan — early tee to 19th hole',
    description: 'Competition-day nutrition for steady mental and physical output over 4-5 hours.',
    macroSplit: { carbPct: 50, proteinPct: 25, fatPct: 25 },
    calorieRange: '2200-2800 total',
    sampleMeals: [
      'Pre-round (3h before): Oatmeal, eggs, banana, coffee',
      'Turn snack (hole 9): Half sandwich + electrolyte drink',
      'On-course (every 4 holes): Trail mix or energy bar + water',
      'Post-round: Lean protein + complex carbs + vegetables',
      'Evening: Normal balanced dinner, extra hydration',
    ],
    hydration: 'Build hydration across the day and the night before. Bring water and electrolytes so intake can follow thirst, sweat, heat, and round length.',
    avoid: ['Alcohol before/during play', 'Trying new foods on competition day', 'Skipping meals', 'Heavy cream-based sauces'],
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Meal Plan Generation
// ─────────────────────────────────────────────────────────────

const MEAL_PLAN_PROMPT = `You are a NASM-protocol sports nutritionist creating a personalized meal plan. Generate a structured daily meal plan based on the user's requirements.

Return ONLY valid JSON with this exact structure:
{
  "planName": "descriptive plan name",
  "dailyTargets": {
    "calories": number,
    "protein": number (grams),
    "carbs": number (grams),
    "fat": number (grams),
    "fiber": number (grams)
  },
  "meals": [
    {
      "mealType": "breakfast" | "snack" | "lunch" | "snack" | "dinner",
      "time": "suggested time (e.g., '7:00 AM')",
      "name": "meal name",
      "foods": [
        {
          "name": "food item",
          "serving": "portion (e.g., '1 cup')",
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number
        }
      ],
      "totalCalories": number,
      "prepTime": "estimated prep time"
    }
  ],
  "groceryList": ["item 1", "item 2"],
  "nasmNote": "one sentence connecting this plan to the user's training phase",
  "tips": ["tip 1", "tip 2", "tip 3"]
}

Rules:
- Include exactly 5 meals: breakfast, AM snack, lunch, PM snack, dinner
- Each meal should have 2-5 food items
- Macros across all meals should sum to within 5% of daily targets
- Grocery list should include everything needed for this day's meals
- Keep meals practical and easy to prepare (max 30 min prep per meal)
${NUTRITION_CARE_COPY_RULES}
- Return ONLY valid JSON, no markdown`;

/**
 * Generates a personalized meal plan using Gemini.
 * @param {object} params - { calories, protein, carbs, fat, restrictions, healthConditions, activityType, optPhase }
 * @returns {Promise<object>} Structured meal plan
 */
export async function generateMealPlan(params) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY is not configured');
  }

  const {
    calories = 2000,
    protein,
    carbs,
    fat,
    restrictions = [],
    healthConditions = [],
    activityType = 'general fitness',
    optPhase = 'Phase 1 — Stabilization',
  } = params;

  // Calculate macros from calories if not provided
  const targetProtein = protein || Math.round(calories * 0.3 / 4);
  const targetCarbs = carbs || Math.round(calories * 0.4 / 4);
  const targetFat = fat || Math.round(calories * 0.3 / 9);

  // S0.6: diagnoses never leave the system (Rule 8). Each allowlisted condition
  // maps to the dietary CONSTRAINTS it implies; the model gets actionable rules
  // ("low glycemic load") instead of PHI labels ("Diabetes"). Same nutrition
  // outcome, zero diagnosis egress — and constraints steer generation more
  // directly than a naked condition name anyway.
  const CONDITION_CONSTRAINTS = {
    'Diabetes': 'low glycemic load; distribute carbohydrates evenly across meals; avoid added sugars',
    'Hypertension': 'sodium under 1500mg/day; emphasize potassium-rich vegetables; avoid processed foods',
    'Celiac Disease': 'strictly gluten-free; no wheat, barley, rye, or cross-contaminated oats',
    'Lactose Intolerance': 'no lactose-containing dairy; lactose-free or plant-based alternatives only',
    'IBS': 'low-FODMAP preference; avoid common trigger foods; moderate fiber introduction',
    'GERD': 'avoid acidic, spicy, and fried foods; smaller more frequent meals; no late heavy meals',
    'High Cholesterol': 'minimize saturated fat; no trans fat; emphasize soluble fiber and omega-3 sources',
    'Kidney Disease': 'moderate protein; limit sodium, potassium, and phosphorus; avoid processed meats',
  };
  const dietaryConstraints = healthConditions
    .map((c) => CONDITION_CONSTRAINTS[c])
    .filter(Boolean);

  const userContext = `
User Profile:
- Daily calorie target: ${calories} kcal
- Macro targets: ${targetProtein}g protein, ${targetCarbs}g carbs, ${targetFat}g fat
- Activity type: ${activityType}
- NASM OPT Phase: ${optPhase}
${restrictions.length ? `- Dietary restrictions: ${restrictions.join(', ')}` : ''}
${dietaryConstraints.length ? `- Medical dietary constraints (MANDATORY):\n${dietaryConstraints.map((c) => `  * ${c}`).join('\n')}` : ''}

Create a complete daily meal plan that meets these targets.`;

  let GoogleGenerativeAI;
  try {
    const mod = await import('@google/generative-ai');
    GoogleGenerativeAI = mod.GoogleGenerativeAI;
  } catch {
    throw new Error('Google Generative AI SDK not installed');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.AI_GEMINI_MODEL || 'gemini-2.0-flash',
    generationConfig: {
      maxOutputTokens: 2000,
      temperature: 0.4,
    },
  });

  const startMs = Date.now();
  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: MEAL_PLAN_PROMPT + '\n\n' + userContext }],
      }],
    });

    const text = result.response.text();
    const elapsed = Date.now() - startMs;
    logger.info(`[MealPlanService] Meal plan generated in ${elapsed}ms`);

    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      ...sanitizePlan(parsed),
      fdaDisclaimer: 'This meal plan is AI-generated and should not replace advice from a registered dietitian or healthcare provider. Adjust portions based on individual needs, hunger cues, and medical guidance.',
    };
  } catch (err) {
    logger.error('[MealPlanService] Generation error:', err.message);
    throw new Error('Meal plan generation failed. Please try again.');
  }
}

const GENERATED_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

function normalizeGeneratedMealType(value) {
  if (typeof value !== 'string') return 'snack';
  const normalized = value.trim().toLowerCase();
  return GENERATED_MEAL_TYPES.includes(normalized) ? normalized : 'snack';
}

function sanitizePlan(raw) {
  return {
    planName: sanitizeNutritionCopy(raw.planName, 'Custom Meal Plan', 200),
    dailyTargets: {
      calories: clamp(raw.dailyTargets?.calories, 800, 6000),
      protein: clamp(raw.dailyTargets?.protein, 20, 500),
      carbs: clamp(raw.dailyTargets?.carbs, 20, 1000),
      fat: clamp(raw.dailyTargets?.fat, 10, 400),
      fiber: clamp(raw.dailyTargets?.fiber, 0, 100),
    },
    meals: Array.isArray(raw.meals)
      ? raw.meals.slice(0, 8).map(m => ({
          mealType: normalizeGeneratedMealType(m.mealType),
          time: typeof m.time === 'string' ? m.time.slice(0, 20) : '',
          name: sanitizeNutritionCopy(m.name, 'Meal', 150),
          foods: Array.isArray(m.foods)
            ? m.foods.slice(0, 10).map(f => ({
                name: sanitizeNutritionCopy(f.name, '', 150),
                serving: sanitizeNutritionCopy(f.serving, '', 50),
                calories: clamp(f.calories, 0, 3000),
                protein: clamp(f.protein, 0, 200),
                carbs: clamp(f.carbs, 0, 500),
                fat: clamp(f.fat, 0, 200),
              }))
            : [],
          totalCalories: clamp(m.totalCalories, 0, 3000),
          prepTime: sanitizeNutritionCopy(m.prepTime, '', 30),
        }))
      : [],
    groceryList: Array.isArray(raw.groceryList)
      ? raw.groceryList
          .filter(i => typeof i === 'string')
          .slice(0, 40)
          .map(i => sanitizeNutritionCopy(i, '', 100))
          .filter(Boolean)
      : [],
    nasmNote: sanitizeNutritionCopy(raw.nasmNote, '', 300),
    tips: Array.isArray(raw.tips)
      ? raw.tips.filter(t => typeof t === 'string').slice(0, 5).map(t => sanitizeNutritionCopy(t, '', 200)).filter(Boolean)
      : [],
  };
}

function clamp(val, min, max) {
  const n = typeof val === 'number' ? val : 0;
  return Math.max(min, Math.min(max, Math.round(n * 10) / 10));
}

// ─────────────────────────────────────────────────────────────
// SECTION: Golf Preset Access
// ─────────────────────────────────────────────────────────────

export function getGolfPresets() {
  return Object.entries(GOLF_PRESETS).map(([id, preset]) => ({ id, ...preset }));
}

export function getGolfPreset(id) {
  return GOLF_PRESETS[id] ? { id, ...GOLF_PRESETS[id] } : null;
}

export default { generateMealPlan, getGolfPresets, getGolfPreset };
