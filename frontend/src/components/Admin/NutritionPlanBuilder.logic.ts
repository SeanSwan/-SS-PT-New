import type { MealDraft, NutritionApiErrorMap, NutritionPayloadInput, NutritionPlanPayload } from './NutritionPlanBuilder.types';

export const defaultMeal: MealDraft = { name: '', time: '', items: '' };

export const parseList = (value: string) =>
  value
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);

export const buildMealsPayload = (meals: MealDraft[]) =>
  meals
    .filter((meal) => meal.name.trim())
    .map((meal) => ({
      name: meal.name.trim(),
      time: meal.time.trim(),
      foods: parseList(meal.items).map((item) => ({
        name: item,
        portion: '1 serving',
      })),
    }));

export const generateGroceryListText = (meals: MealDraft[]) => {
  const items = meals.flatMap((meal) => parseList(meal.items));
  return Array.from(new Set(items)).join('\n');
};

export const mapExistingPlanMeals = (meals: any[] | undefined): MealDraft[] => {
  if (!Array.isArray(meals) || meals.length === 0) return [];

  return meals.map((meal) => ({
    name: meal.name || '',
    time: meal.time || '',
    items: Array.isArray(meal.foods) ? meal.foods.map((food: any) => food.name).join('\n') : '',
  }));
};

export const buildNutritionPayload = ({
  carbsGrams,
  dailyCalories,
  endDate,
  fatGrams,
  groceryListText,
  meals,
  notes,
  planName,
  proteinGrams,
  startDate,
}: NutritionPayloadInput): NutritionPlanPayload => ({
  planName: planName.trim(),
  dailyCalories: Number(dailyCalories),
  proteinGrams: Number(proteinGrams) || 0,
  carbsGrams: Number(carbsGrams) || 0,
  fatGrams: Number(fatGrams) || 0,
  mealsJson: buildMealsPayload(meals),
  groceryListJson: parseList(groceryListText),
  notes: notes.trim(),
  startDate: startDate || new Date().toISOString().split('T')[0],
  endDate: endDate || null,
});

/**
 * Fields the backend validators (nutritionPlanValidation + nutritionTargetService)
 * name at the start of their error strings, e.g. "proteinGrams must be between 0 and 500".
 * Anything that doesn't match (like the cross-field 4/4/9 macro check) is a form-level error.
 */
const NUTRITION_ERROR_FIELDS = [
  'planName',
  'dailyCalories',
  'proteinGrams',
  'carbsGrams',
  'fatGrams',
  'fiberGrams',
  'hydrationTargetLiters',
  'hydrationTarget',
  'notes',
  'mealsJson',
  'groceryListJson',
  'startDate',
  'endDate',
] as const;

/**
 * Map the backend's 400 `{ errors: [...] }` strings onto the form fields they
 * describe so they can render inline next to the matching input. Unrecognized
 * messages (e.g. "macro grams imply more calories than dailyCalories allows")
 * land in `form` and render at the grid level.
 */
export const mapNutritionApiErrors = (errors: unknown): NutritionApiErrorMap => {
  const fields: Record<string, string[]> = {};
  const form: string[] = [];

  if (!Array.isArray(errors)) return { fields, form };

  for (const raw of errors) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const message = raw.trim();
    const field = NUTRITION_ERROR_FIELDS.find((name) => message.startsWith(name));
    if (field) {
      (fields[field] ??= []).push(message);
    } else {
      form.push(message);
    }
  }

  return { fields, form };
};
