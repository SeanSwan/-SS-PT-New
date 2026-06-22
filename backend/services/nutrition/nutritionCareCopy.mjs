const REPLACEMENTS = [
  [/\bdirty bulk\b/gi, 'higher-fuel phase'],
  [/\bbulking\b/gi, 'higher-fuel training'],
  [/\bcutting\b/gi, 'lower-fuel training'],
  [/\bcaloric deficit\b/gi, 'lower-fuel phase'],
  [/\bcheat meal\b/gi, 'planned meal'],
  [/\bclean eating\b/gi, 'balanced eating'],
  [/\bzero sugar\b/gi, 'lower-sugar'],
  [/\bno sugar\b/gi, 'lower-sugar'],
  [/\bsugar crash\b/gi, 'energy dip'],
  [/\bspike insulin\b/gi, 'rapid blood sugar changes'],
  [/\bwasted macros\b/gi, 'less useful nutrition for this context'],
  [/\bdeficiencies\b/gi, 'low nutrient status'],
  [/\bdeficiency\b/gi, 'low nutrient status'],
  [/\bdeficient\b/gi, 'low in key nutrients'],
  [/(?<!anti-)\binflammatory\b/gi, 'may not sit well for some clients'],
  [/\bguilt(?:y)?\b/gi, 'judgment'],
  [/\bclean ingredients\b/gi, 'shorter ingredient list'],
  [/\btoxic ingredients?\b/gi, 'ingredients worth reviewing'],
  [/\bgood\s+(food|meal|choice|ingredient|ingredients|product|option|item|snack)\b/gi, 'context-friendly $1'],
  [/\bbad\s+(food|meal|choice|ingredient|ingredients|product|option|item|snack)\b/gi, 'less aligned $1'],
  [/\bGOOD\b/g, 'context-friendly'],
  [/\bBAD\b/g, 'less aligned'],
  [/\bcompliance\b/gi, 'follow-through'],
];

const NUTRITION_CONTEXTS = new Set([
  'macro_logging',
  'client_review',
  'progress_analysis',
  'data_management',
]);

const NUTRITION_HINT_PATTERN =
  /\b(nutrition|meal|food|macro|calorie|protein|carb|fat|fiber|sugar|sodium|hydration|water|restaurant|ingredient|supplement|diet|breakfast|lunch|dinner|snack)\b/i;

export const NUTRITION_CARE_COPY_RULES = `Care-first copy rules:
- Use neutral planning language that supports review and coaching.
- Do not use diet-culture labels such as cutting, bulking, cheat meal, clean/dirty foods, guilt, sugar crash, inflammatory judgments, deficiency scare framing, or zero/no-sugar praise.
- Avoid moral food labels; describe what is visible or useful without calling foods good, bad, clean, dirty, toxic, guilty, compliant, or cheating.
- Describe tradeoffs as pairing, timing, portion, hydration, training context, or clinician review.
- Do not imply moral failure or moral success from food choices.`;

export function sanitizeNutritionCopy(value, fallback = '', maxLength = 300) {
  if (typeof value !== 'string') return fallback;

  let next = value.slice(0, maxLength);
  for (const [pattern, replacement] of REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }

  next = next
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

  return next || fallback;
}

export function shouldApplyNutritionCareCopy({ context, foodContext, message, response } = {}) {
  if (NUTRITION_CONTEXTS.has(context)) return true;
  if (foodContext && typeof foodContext === 'object') return true;
  return (typeof message === 'string' && NUTRITION_HINT_PATTERN.test(message))
    || (typeof response === 'string' && NUTRITION_HINT_PATTERN.test(response));
}

export function sanitizeNutritionChatCopy(value, { context, foodContext, message, fallback = '', maxLength = 12000 } = {}) {
  if (!shouldApplyNutritionCareCopy({ context, foodContext, message, response: value })) {
    return typeof value === 'string' ? value : fallback;
  }
  return sanitizeNutritionCopy(value, fallback, maxLength);
}
