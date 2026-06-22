/**
 * coachNutritionProposalCareCopy.mjs
 * ==================================
 * Shared care-copy scrubber for Coach nutrition_log proposal meals before they
 * reach review details or DailyMacroLog writes.
 */
import { sanitizeNutritionCopy } from '../nutrition/nutritionCareCopy.mjs';

const sanitizeNutritionProposalItem = (item) => {
  if (typeof item === 'string') return sanitizeNutritionCopy(item, '', 150);
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;

  const next = { ...item };
  if (typeof next.name === 'string') next.name = sanitizeNutritionCopy(next.name, '', 150);
  if (typeof next.serving === 'string') next.serving = sanitizeNutritionCopy(next.serving, '', 100);
  if (typeof next.description === 'string') next.description = sanitizeNutritionCopy(next.description, '', 150);
  return next;
};

export function sanitizeNutritionProposalMeal(meal, { descriptionMax = 500 } = {}) {
  const next = meal && typeof meal === 'object' && !Array.isArray(meal) ? { ...meal } : {};
  next.description = sanitizeNutritionCopy(next.description, '', descriptionMax);
  if (Array.isArray(next.items)) {
    next.items = next.items.slice(0, 50).map(sanitizeNutritionProposalItem);
  }
  return next;
}
