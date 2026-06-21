export interface MealFood {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  mealType: string;
  time: string;
  name: string;
  foods: MealFood[];
  totalCalories: number;
  prepTime: string;
}

export interface MealPlan {
  planName: string;
  dailyTargets: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  meals: Meal[];
  groceryList: string[];
  nasmNote: string;
  tips: string[];
  fdaDisclaimer: string;
}

export interface PhotoFood {
  name: string;
  estimatedServing: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: number;
}

export interface PhotoAnalysis {
  foods: PhotoFood[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealType: string;
  overallConfidence: number;
  notes: string;
  fdaDisclaimer: string;
}

export interface GolfPreset {
  id: string;
  name: string;
  timing: string;
  description: string;
  macroSplit: { carbPct: number; proteinPct: number; fatPct: number };
  calorieRange: string;
  sampleMeals: string[];
  hydration: string;
  avoid: string[];
}

export interface MealPlanTabProps {
  onDataSent?: (success: boolean) => void;
}

export const RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto',
  'Paleo', 'Low-Sodium', 'Nut-Free', 'Halal', 'Kosher',
];

export const HEALTH_CONDITIONS = [
  'Diabetes', 'Hypertension', 'Celiac Disease', 'Lactose Intolerance',
  'IBS', 'GERD', 'High Cholesterol', 'Kidney Disease',
];

export const OPT_PHASES = [
  'Phase 1 - Stabilization Endurance',
  'Phase 2 - Strength Endurance',
  'Phase 3 - Hypertrophy',
  'Phase 4 - Maximal Strength',
  'Phase 5 - Power',
];

export const MEAL_PLAN_ERROR_COPY = 'Meal plan could not be generated. Review your inputs before retrying.';
export const PHOTO_ANALYSIS_ERROR_COPY = 'Meal photo could not be analyzed. Try another photo before saving.';
export const PLAN_ERROR_COPY = MEAL_PLAN_ERROR_COPY;
export const PHOTO_ERROR_COPY = PHOTO_ANALYSIS_ERROR_COPY;
