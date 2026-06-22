export const MEAL_PLAN_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealPlanMealType = (typeof MEAL_PLAN_MEAL_TYPES)[number];
export type MealPlanMacroSource = 'ai-chat' | 'voice';

interface MealPlanFoodInput {
  name?: string;
  serving?: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
}

interface MealPlanMealInput {
  mealType?: string;
  name?: string;
  foods?: MealPlanFoodInput[];
  totalCalories?: number | null;
}

export interface MealPlanInput {
  meals?: MealPlanMealInput[];
}

export interface MealPlanMacroDraft {
  id: string;
  mealType: MealPlanMealType;
  description: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  items: MealPlanFoodInput[];
}

const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

export const normalizeMealPlanMealType = (value?: string | null): MealPlanMealType => {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('breakfast')) return 'breakfast';
  if (raw.includes('lunch')) return 'lunch';
  if (raw.includes('dinner')) return 'dinner';
  return 'snack';
};

export const cleanMealPlanMacroValue = (value: unknown): number | null => {
  if (value === '' || value === null || value === undefined) return null;
  let numberValue: number | null = null;
  if (typeof value === 'number') {
    numberValue = Number.isFinite(value) ? value : null;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    numberValue = DECIMAL_NUMBER_PATTERN.test(trimmed) ? Number(trimmed) : null;
  }
  return numberValue !== null && Number.isFinite(numberValue) && numberValue >= 0
    ? Math.round(numberValue * 10) / 10
    : null;
};

const cleanNumber = cleanMealPlanMacroValue;

const sumFoods = (foods: MealPlanFoodInput[], field: keyof MealPlanFoodInput): number | null => {
  const values = foods.map((food) => cleanNumber(food[field])).filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) * 10) / 10;
};

const describeMeal = (meal: MealPlanMealInput, foods: MealPlanFoodInput[]) => {
  const foodCopy = foods
    .filter((food) => String(food.name || '').trim())
    .map((food) => {
      const serving = String(food.serving || '').trim();
      return serving ? `${String(food.name).trim()} (${serving})` : String(food.name).trim();
    })
    .join(', ');
  const mealName = String(meal.name || '').trim();
  if (foodCopy && mealName) return `${mealName}: ${foodCopy}`;
  return foodCopy || mealName;
};

export const buildMacroDraftsFromMealPlan = (plan: MealPlanInput | null | undefined): MealPlanMacroDraft[] =>
  (Array.isArray(plan?.meals) ? plan.meals : []).map((meal, index) => {
    const foods = Array.isArray(meal.foods) ? meal.foods : [];
    return {
      id: `meal-${index + 1}`,
      mealType: normalizeMealPlanMealType(meal.mealType),
      description: describeMeal(meal, foods),
      calories: cleanNumber(meal.totalCalories) ?? sumFoods(foods, 'calories'),
      protein: sumFoods(foods, 'protein'),
      carbs: sumFoods(foods, 'carbs'),
      fat: sumFoods(foods, 'fat'),
      fiber: sumFoods(foods, 'fiber'),
      sugar: sumFoods(foods, 'sugar'),
      sodium: sumFoods(foods, 'sodium'),
      items: foods.map((food) => ({
        name: String(food.name || '').trim(),
        serving: String(food.serving || '').trim(),
        calories: cleanNumber(food.calories),
        protein: cleanNumber(food.protein),
        carbs: cleanNumber(food.carbs),
        fat: cleanNumber(food.fat),
        fiber: cleanNumber(food.fiber),
        sugar: cleanNumber(food.sugar),
        sodium: cleanNumber(food.sodium),
      })),
    };
  });

export const validateMacroDrafts = (drafts: MealPlanMacroDraft[]) => {
  if (!drafts.length) {
    return { valid: false, message: 'Generate a meal plan before saving.' };
  }
  if (drafts.some((draft) => !draft.description.trim())) {
    return { valid: false, message: 'Each meal needs a food description before saving.' };
  }
  return { valid: true, message: '' };
};

export const buildMacroSavePayload = (draft: MealPlanMacroDraft, date: string, source: MealPlanMacroSource = 'ai-chat') => ({
  date,
  mealType: draft.mealType,
  description: draft.description.trim(),
  calories: cleanNumber(draft.calories),
  protein: cleanNumber(draft.protein),
  carbs: cleanNumber(draft.carbs),
  fat: cleanNumber(draft.fat),
  fiber: cleanNumber(draft.fiber),
  sugar: cleanNumber(draft.sugar),
  sodium: cleanNumber(draft.sodium),
  items: draft.items,
  source,
  verified: false,
});
