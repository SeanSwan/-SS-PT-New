/**
 * nutritionTranscriptParserService
 * ================================
 * Parses a client's spoken/typed meal description ("I had a chicken burrito
 * bowl and a banana for lunch") into structured DailyMacroLog-ready meal entries
 * with per-meal + overall confidence — the AI-capture half of the
 * dictate → draft → APPROVE → save loop (Slice 1.1).
 *
 * Design: clones the proven workoutLogParserService discipline via the shared
 * jsonLlmParser (Gemini-first, strict JSON, OpenAI optional fallback, no Grok).
 *
 * RULE 8 (zero PII to LLMs): the transcript is redacted (redactTranscriptPII)
 * BEFORE it reaches the model. The client is NEVER named to the LLM — only
 * de-identified context hints (targets / restrictions / condition labels) are
 * sent. Confidence is computed from the ORIGINAL transcript locally.
 *
 * Wiring status: LIVE caller = POST /api/meal-plans/parse-voice (Slice 1.6 "Speak
 * a Meal") -> VoiceNutritionPanel review -> /api/macros self-serve save. The coach
 * conversational path can also turn meals[] into an import_nutrition_log proposal
 * (Slice 1.2 NUTRITION_LOG gate) for trainer-on-behalf logging.
 *
 * Output contract — meals[] is shaped to feed macroLogService.createMacroEntries
 * through the NUTRITION_LOG proposal gate once wired:
 *   {
 *     meals: [{ mealType, description, calories, protein, carbs, fat, fiber,
 *               sugar, sodium, items?, confidence }],
 *     date: 'YYYY-MM-DD',
 *     confidence: number,            // overall 0..1
 *     notes?: string,
 *     lowConfidence: boolean,        // true → caller should ask a follow-up (CLARIFICATION)
 *     followUpQuestions?: string[],  // surgical questions when the model was unsure
 *   }
 */

import { runJsonLlmChain } from '../ai/jsonLlmParser.mjs';
import { redactTranscriptPII } from '../redactTranscriptPII.mjs';
import logger from '../../utils/logger.mjs';
import { formatDisplayDate } from './displayDate.mjs';
import { NUTRITION_CARE_COPY_RULES, sanitizeNutritionCopy } from './nutritionCareCopy.mjs';

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'];
const LOW_CONFIDENCE_THRESHOLD = 0.6;
const DECIMAL_NUMBER_REGEX = /^\d+(?:\.\d+)?$/;

const toFiniteDecimalNumber = (val) => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val !== 'string') return null;

  const trimmed = val.trim();
  if (!DECIMAL_NUMBER_REGEX.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

// ─────────────────────────────────────────────────────────────
// SECTION: System prompt (provider-agnostic, identity-blind)
// ─────────────────────────────────────────────────────────────
function buildSystemPrompt(contextBlock) {
  return `You are SwanStudios Nutrition Capture — you turn a person's casual description of what they ate into a structured, conservative nutrition log.

CLIENT CONTEXT (identity-blind — never a name):
${contextBlock}

RULES:
- Extract every distinct food/drink the person actually mentioned. Group them into meals.
- Assign each meal a mealType from EXACTLY this set: ${VALID_MEAL_TYPES.join(', ')}. Infer from wording/time ("this morning"→breakfast, "after my workout"→post_workout); default to "snack" if unclear.
- Estimate macros CONSERVATIVELY from typical portions. Round calories up, protein down.
- If a value genuinely cannot be estimated, use null — NEVER 0 as a guess.
- NEVER invent foods, brands, or quantities the person did not say.
- Give each meal a "confidence" 0.0–1.0 (portion clarity, brand specificity, ambiguity).
- When the description is too vague to log safely (missing portion, ambiguous dish), LOWER confidence and add a SHORT, specific follow-up question to "followUpQuestions" (e.g. "How big was the burrito bowl — regular or large?"). Ask at most 3, only when they would materially change the estimate.
- This is an ESTIMATE for the person to review and approve. Do not claim it was saved.

${NUTRITION_CARE_COPY_RULES}

OUTPUT FORMAT (strict JSON, no markdown fences, no commentary):
{
  "meals": [
    {
      "mealType": "lunch",
      "description": "Chicken burrito bowl with rice, beans, salsa",
      "calories": 650, "protein": 45, "carbs": 70, "fat": 18,
      "fiber": 12, "sugar": 6, "sodium": 1200,
      "items": [{ "name": "chicken burrito bowl", "serving": "1 bowl" }],
      "confidence": 0.7
    }
  ],
  "notes": "one short neutral observation, or empty string",
  "followUpQuestions": []
}`;
}

// ─────────────────────────────────────────────────────────────
// SECTION: De-identified context block (NO name, NO contact PII)
// ─────────────────────────────────────────────────────────────
function buildContextBlock(hints = {}) {
  const parts = [];
  const dailyCalorieTarget = toFiniteDecimalNumber(hints.dailyCalorieTarget);
  const proteinTarget = toFiniteDecimalNumber(hints.proteinTarget);
  if (dailyCalorieTarget !== null && dailyCalorieTarget > 0) {
    parts.push(`Daily calorie target: ${Math.round(dailyCalorieTarget)} kcal`);
  }
  if (proteinTarget !== null && proteinTarget > 0) {
    parts.push(`Daily protein target: ${Math.round(proteinTarget)} g`);
  }
  if (Array.isArray(hints.restrictions) && hints.restrictions.length > 0) {
    parts.push(`Dietary restrictions: ${hints.restrictions.map((r) => String(r).slice(0, 40)).join(', ')}`);
  }
  if (Array.isArray(hints.conditions) && hints.conditions.length > 0) {
    parts.push(`Health-condition flags (apply sodium/sugar caution): ${hints.conditions.map((c) => String(c).slice(0, 40)).join(', ')}`);
  }
  return parts.join('\n') || 'No additional context.';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Result shaping + confidence
// ─────────────────────────────────────────────────────────────
const cleanNumber = (val, max) => {
  if (val === null || val === undefined) return null;
  const n = toFiniteDecimalNumber(val);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(Math.round(n * 10) / 10, max);
};

function shapeMeal(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const rawDescription = typeof raw.description === 'string' ? raw.description.trim() : '';
  const description = sanitizeNutritionCopy(rawDescription, '', 500);
  if (!description) return null;
  const items = Array.isArray(raw.items)
    ? raw.items.slice(0, 30).map((i) => ({
        name: typeof i?.name === 'string' ? sanitizeNutritionCopy(i.name, '', 150) : 'item',
        serving: typeof i?.serving === 'string' ? sanitizeNutritionCopy(i.serving, '', 60) : undefined,
      }))
    : [];
  return {
    mealType: VALID_MEAL_TYPES.includes(raw.mealType) ? raw.mealType : 'snack',
    description,
    calories: cleanNumber(raw.calories, 99999),
    protein: cleanNumber(raw.protein, 9999),
    carbs: cleanNumber(raw.carbs, 9999),
    fat: cleanNumber(raw.fat, 9999),
    fiber: cleanNumber(raw.fiber, 9999),
    sugar: cleanNumber(raw.sugar, 9999),
    sodium: cleanNumber(raw.sodium, 999999),
    items,
    confidence: (() => {
      const c = toFiniteDecimalNumber(raw.confidence);
      return c !== null ? Math.max(0, Math.min(1, Math.round(c * 100) / 100)) : 0.5;
    })(),
  };
}

export function calculateOverallConfidence(transcript, meals) {
  if (!Array.isArray(meals) || meals.length === 0) return 0;
  const avgMeal = meals.reduce((s, m) => s + (m.confidence ?? 0.5), 0) / meals.length;
  let adj = 0;
  const len = (transcript || '').length;
  if (len < 15) adj -= 0.2;          // barely anything said
  else if (len > 120) adj += 0.05;   // descriptive
  const withMacros = meals.filter((m) => m.calories != null).length;
  if (withMacros === meals.length) adj += 0.05;
  return Math.max(0, Math.min(0.99, Math.round((avgMeal + adj) * 100) / 100));
}

// ─────────────────────────────────────────────────────────────
// SECTION: Public entry point
// ─────────────────────────────────────────────────────────────
/**
 * Parse a raw meal-description transcript into structured, review-ready meals.
 * @param {Object} params
 * @param {string} params.transcript - Raw spoken/typed meal description
 * @param {number} [params.clientId] - For logging only (never sent to the LLM)
 * @param {string} [params.date] - ISO date (defaults to today)
 * @param {string[]} [params.nameHints] - Known client name(s) to redact pre-LLM
 * @param {Object} [params.contextHints] - De-identified targets/restrictions/conditions
 * @returns {Promise<Object>} structured nutrition draft (see file header contract)
 */
export async function parseNutritionTranscript({ transcript, clientId, date, nameHints = [], contextHints = {} }) {
  if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 3) {
    throw new Error('Meal description is too short to parse');
  }

  // RULE 8: redact BEFORE the model. Original transcript is kept for local confidence.
  const { text: redacted } = redactTranscriptPII(transcript, { nameHints });
  const systemPrompt = buildSystemPrompt(buildContextBlock(contextHints));

  const parsed = await runJsonLlmChain({
    systemPrompt,
    userText: `Parse this meal description:\n\n${redacted}`,
    maxOutputTokens: 2048,
    temperature: 0.2,
    label: 'NutritionParser',
  });

  const meals = Array.isArray(parsed?.meals)
    ? parsed.meals.map(shapeMeal).filter(Boolean).slice(0, 20)
    : [];

  if (meals.length === 0) {
    throw new Error('No meals could be parsed from the description');
  }

  const confidence = calculateOverallConfidence(transcript, meals);
  const followUpQuestions = Array.isArray(parsed?.followUpQuestions)
    ? parsed.followUpQuestions
        .filter((q) => typeof q === 'string' && q.trim())
        .slice(0, 3)
        .map((q) => sanitizeNutritionCopy(q.trim(), '', 200))
        .filter(Boolean)
    : [];

  logger.info('[NutritionParser] Parse complete', {
    clientId,
    meals: meals.length,
    confidence,
    lowConfidence: confidence < LOW_CONFIDENCE_THRESHOLD,
  });

  return {
    meals,
    date: date || formatDisplayDate(),
    confidence,
    notes: sanitizeNutritionCopy(parsed?.notes, '', 300),
    lowConfidence: confidence < LOW_CONFIDENCE_THRESHOLD,
    followUpQuestions,
  };
}

export const __test__ = { buildSystemPrompt, buildContextBlock, shapeMeal, calculateOverallConfidence, VALID_MEAL_TYPES, LOW_CONFIDENCE_THRESHOLD };

export default { parseNutritionTranscript };
