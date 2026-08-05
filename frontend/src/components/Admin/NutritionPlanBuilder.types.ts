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

/** Inline-error map built from the backend's 400 `{ errors: string[] }` contract. */
export interface NutritionApiErrorMap {
  /** field name → error messages, rendered next to the matching input */
  fields: Record<string, string[]>;
  /** messages that don't name a field (e.g. the cross-field 4/4/9 macro check) */
  form: string[];
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
