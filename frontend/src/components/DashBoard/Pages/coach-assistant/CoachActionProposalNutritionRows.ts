/**
 * CoachActionProposalNutritionRows.ts
 * ===================================
 * Nutrition-specific detail rows for review-gated Swan Coach proposals.
 */

const ESTIMATE_COPY = 'AI estimate \u2014 review before approving';
const MEAL_ROW_SEPARATOR = ' \u00b7 ';

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-workout',
  post_workout: 'Post-workout',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function mealTypeLabel(value: unknown): string {
  return MEAL_TYPE_LABELS[String(value || '').trim()] || 'Meal';
}

function mealCountLabel(value: unknown): string | null {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return null;
  return `${count} meal${count === 1 ? '' : 's'}`;
}

function caloriesLabel(value: unknown): string | null {
  const cal = Number(value);
  if (!Number.isFinite(cal) || cal <= 0) return null;
  return `~${Math.round(cal)} kcal (estimate)`;
}

function safeDate(value: unknown): string | null {
  const date = String(value || '').trim();
  if (!date) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : 'Date needs review';
}

function safeClientId(value: unknown): string | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? `#${id}` : null;
}

function nutritionMealRows(value: unknown): Array<[string, unknown]> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((entry) => {
    const meal = asRecord(entry) || {};
    const cal = meal.calories != null ? `${meal.calories} kcal` : 'kcal n/a';
    const conf = meal.confidence != null ? `${MEAL_ROW_SEPARATOR}${Math.round(Number(meal.confidence) * 100)}% conf` : '';
    const desc = String(meal.description || 'meal').slice(0, 80);
    return [mealTypeLabel(meal.mealType), `${desc}${MEAL_ROW_SEPARATOR}${cal}${conf}`];
  });
}

export function nutritionDetailRows(nutrition: Record<string, unknown>): Array<[string, unknown]> {
  return [
    ['Nutrition draft', ESTIMATE_COPY],
    ['Date', safeDate(nutrition.date)],
    ['Client', safeClientId(nutrition.clientId)],
    ['Meals', mealCountLabel(nutrition.mealCount)],
    ['Calories', caloriesLabel(nutrition.totalCalories)],
    ...nutritionMealRows(nutrition.meals),
  ];
}
