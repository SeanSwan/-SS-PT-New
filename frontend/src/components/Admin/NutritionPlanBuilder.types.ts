export type MealDraft = {
  name: string;
  time: string;
  items: string;
};

export interface NutritionPayloadInput {
  carbsGrams: string;
  dailyCalories: string;
  endDate: string;
  fatGrams: string;
  groceryListText: string;
  meals: MealDraft[];
  notes: string;
  planName: string;
  proteinGrams: string;
  startDate: string;
}

export interface NutritionPlanPayload {
  planName: string;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  mealsJson: Array<{
    name: string;
    time: string;
    foods: Array<{ name: string; portion: string }>;
  }>;
  groceryListJson: string[];
  notes: string;
  startDate: string;
  endDate: string | null;
}
