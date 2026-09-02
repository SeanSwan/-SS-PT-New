/**
 * ============================================================================
 * FILE: foodPhotoService.mjs
 * PURPOSE: Gemini Vision-powered meal photo analysis — identifies foods,
 *          estimates macros, and returns structured nutrition data
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Takes a meal photo buffer, sends to Gemini 2.0 Flash
 * Vision, and returns identified foods with estimated calories and macros.
 * Pattern follows equipmentScanService.mjs (proven Gemini Vision pattern).
 *
 * HOW IT FITS IN THE APP: mealPlanRoutes → foodPhotoService → Gemini API
 * KEY DECISIONS: Returns conservative estimates with confidence scores.
 *   FDA disclaimer required on all outputs.
 */

import logger from '../utils/logger.mjs';
import { NUTRITION_CARE_COPY_RULES, sanitizeNutritionCopy } from './nutrition/nutritionCareCopy.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Prompt
// ─────────────────────────────────────────────────────────────
const FOOD_PHOTO_PROMPT = `You are an expert sports nutritionist analyzing a meal photo. Identify every food item visible and estimate its nutritional content.

Return ONLY valid JSON with this exact structure:
{
  "foods": [
    {
      "name": "food item name",
      "estimatedServing": "portion description (e.g., '1 cup', '6 oz', '2 slices')",
      "calories": number,
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams),
      "fiber": number (grams),
      "confidence": 0.0 to 1.0
    }
  ],
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "totalFiber": number,
  "mealType": "breakfast" | "lunch" | "dinner" | "snack" (best guess based on foods),
  "overallConfidence": 0.0 to 1.0,
  "notes": "brief neutral observation about visible foods, portions, or pairings (1 sentence)"
}

Rules:
- Estimate conservatively — round up on calories, round down on protein
- If a food is partially obscured, reduce confidence but still estimate
- If no food is visible, return empty foods array with overallConfidence: 0
- Include sauces, dressings, and drinks visible in the image
- Fiber defaults to 0 if not estimable
${NUTRITION_CARE_COPY_RULES}
- Return ONLY valid JSON, no markdown or explanation`;

// ─────────────────────────────────────────────────────────────
// SECTION: Service
// ─────────────────────────────────────────────────────────────

/**
 * Analyzes a meal photo using Gemini Vision and returns identified foods
 * with estimated macro breakdown.
 * @param {Buffer} imageBuffer - Raw image data
 * @param {string} mimeType - image/jpeg, image/png, or image/webp
 * @returns {Promise<object>} Identified foods with macros
 */
export async function analyzeMealPhoto(imageBuffer, mimeType) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY is not configured');
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(mimeType)) {
    throw new Error(`Invalid image type: ${mimeType}. Allowed: ${allowedMimes.join(', ')}`);
  }

  if (imageBuffer.length > 10 * 1024 * 1024) {
    throw new Error('Image too large. Maximum size is 10MB.');
  }

  let GoogleGenerativeAI;
  try {
    const mod = await import('@google/generative-ai');
    GoogleGenerativeAI = mod.GoogleGenerativeAI;
  } catch (err) {
    // Keep the cause (and the 'SDK not installed' literal equipmentRoutes matches on):
    // this catch pattern once swallowed a vitest strict-mock error for weeks.
    throw new Error(
      'Google Generative AI SDK not installed or failed to load: ' + (err?.message || err),
      { cause: err },
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.AI_GEMINI_MODEL || 'gemini-2.0-flash',
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.2,
    },
  });

  const base64Image = imageBuffer.toString('base64');
  const startMs = Date.now();

  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: FOOD_PHOTO_PROMPT },
        ],
      }],
    });

    const text = result.response.text();
    const elapsed = Date.now() - startMs;
    logger.info(`[FoodPhotoService] Gemini Vision analysis completed in ${elapsed}ms`);

    // Parse JSON from response (strip markdown fences if present)
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    return sanitizeResult(parsed);
  } catch (err) {
    logger.error('[FoodPhotoService] Gemini Vision error:', err.message);
    if (err.message?.includes('JSON')) {
      throw new Error('Failed to parse meal analysis. Please try a clearer photo.');
    }
    throw new Error('Meal photo analysis failed. Please try again.');
  }
}

const PHOTO_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

function normalizePhotoMealType(value) {
  if (typeof value !== 'string') return 'snack';
  const normalized = value.trim().toLowerCase();
  return PHOTO_MEAL_TYPES.includes(normalized) ? normalized : 'snack';
}

/**
 * Sanitize and validate the AI response
 */
function sanitizeResult(raw) {
  const foods = Array.isArray(raw.foods)
    ? raw.foods.map(f => ({
        name: typeof f.name === 'string' ? sanitizeNutritionCopy(f.name, '', 150) : 'Unknown food',
        estimatedServing: typeof f.estimatedServing === 'string' ? sanitizeNutritionCopy(f.estimatedServing, '', 100) : '',
        calories: clamp(f.calories, 0, 5000),
        protein: clamp(f.protein, 0, 500),
        carbs: clamp(f.carbs, 0, 1000),
        fat: clamp(f.fat, 0, 500),
        fiber: clamp(f.fiber, 0, 100),
        confidence: clamp(f.confidence, 0, 1),
      })).slice(0, 20)
    : [];

  return {
    foods,
    totalCalories: clamp(raw.totalCalories, 0, 10000),
    totalProtein: clamp(raw.totalProtein, 0, 1000),
    totalCarbs: clamp(raw.totalCarbs, 0, 2000),
    totalFat: clamp(raw.totalFat, 0, 1000),
    totalFiber: clamp(raw.totalFiber, 0, 200),
    mealType: normalizePhotoMealType(raw.mealType),
    overallConfidence: clamp(raw.overallConfidence, 0, 1),
    notes: sanitizeNutritionCopy(raw.notes, '', 300),
    fdaDisclaimer: 'Nutritional estimates are AI-generated approximations and should not replace professional dietary advice. Actual values may vary by preparation method and portion size.',
  };
}

function clamp(val, min, max) {
  const n = typeof val === 'number' ? val : 0;
  return Math.max(min, Math.min(max, Math.round(n * 10) / 10));
}

export default { analyzeMealPhoto };
