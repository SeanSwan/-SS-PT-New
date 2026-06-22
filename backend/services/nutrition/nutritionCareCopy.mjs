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
];

export const NUTRITION_CARE_COPY_RULES = `Care-first copy rules:
- Use neutral planning language that supports review and coaching.
- Do not use diet-culture labels such as cutting, bulking, cheat meal, clean/dirty foods, guilt, sugar crash, inflammatory judgments, deficiency scare framing, or zero/no-sugar praise.
- Avoid moral food labels; describe what is visible or useful without calling foods good, bad, clean, dirty, guilty, or cheating.
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
