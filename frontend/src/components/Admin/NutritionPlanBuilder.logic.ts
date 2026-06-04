import type { MealDraft, NutritionPayloadInput, NutritionPlanPayload } from './NutritionPlanBuilder.types';

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
