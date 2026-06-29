import type { MealTypeOption } from './mealPhotoLog';

export type NutritionDraftSource =
  | 'manual'
  | 'voice'
  | 'photo'
  | 'search'
  | 'restaurant'
  | 'barcode'
  | 'meal-plan';

export type NutritionSourceConfidence = 'verified' | 'provider' | 'community' | 'ai_estimate';
export type MacroRouteSource = 'manual' | 'ai-chat' | 'food-scanner' | 'barcode' | 'voice' | 'usda_lookup';

export interface NutritionDraftFood {
  id: string;
  description: string;
  displayName?: string;
  mealType: MealTypeOption;
  servingLabel?: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar?: number | null;
  sodium?: number | null;
  confidence?: number | null;
  provider?: string;
  sourceLabel?: string;
  verified: false;
}

export interface NutritionEntryDraft {
  id: string;
  title: string;
  source: NutritionDraftSource;
  sourceLabel: string;
  sourceConfidence: NutritionSourceConfidence;
  verified: false;
  foods: NutritionDraftFood[];
}

export interface NutritionMacroPayload {
  date: string;
  mealType: MealTypeOption;
  description: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar?: number | null;
  sodium?: number | null;
  source: MacroRouteSource;
  verified: false;
  items: Array<Record<string, unknown>>;
}
