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
export type NutritionWorkoutProximity = 'none' | 'pre_workout' | 'intra_workout' | 'post_workout';
export type NutritionServingBasis = 'label' | 'per_100g' | 'weighed' | 'household' | 'estimated';
export type NutritionReviewReason =
  | 'barcode_unmatched'
  | 'client_requested'
  | 'metabolic_deviation'
  | 'provider_estimate'
  | 'unverified_estimate';
export type NutritionReconciliationStatus =
  | 'not_applicable'
  | 'calculated_only'
  | 'within_tolerance'
  | 'metabolic_deviation';
export type MacroRouteSource = 'manual' | 'ai-chat' | 'food-scanner' | 'barcode' | 'voice' | 'usda_lookup';

export interface NutrientMap {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  addedSugar?: number | null;
  saturatedFat?: number | null;
  transFat?: number | null;
  cholesterol?: number | null;
}

export interface NutritionServing {
  basis: NutritionServingBasis;
  quantity: number | null;
  unit: string;
  label: string;
}

export interface NutritionRawPayloadRef {
  provider?: string;
  externalId?: string;
  barcode?: string;
  schemaVersion?: string;
  capturedAt?: string;
}

export interface NutritionDraftFood {
  id: string;
  description: string;
  displayName?: string;
  mealType: MealTypeOption;
  serving: NutritionServing;
  nutrients: NutrientMap;
  confidence: number | null;
  provider?: string;
  sourceLabel?: string;
  brandName?: string;
  verified: false;
}

export interface NutritionEntryDraft {
  contractVersion: '1.0';
  id: string;
  userId: number | null;
  loggedByUserId: number | null;
  title: string;
  source: NutritionDraftSource;
  sourceLabel: string;
  sourceConfidence: NutritionSourceConfidence;
  workoutProximity: NutritionWorkoutProximity;
  rawPayloadRef: NutritionRawPayloadRef | null;
  reviewReason: NutritionReviewReason | null;
  reviewNotes: string[];
  verified: false;
  foods: NutritionDraftFood[];
}

export interface NutritionDraftSavePayload {
  contractVersion: '1.0';
  draftId: string;
  date: string;
  userId: number | null;
  loggedByUserId: number | null;
  source: NutritionDraftSource;
  sourceLabel: string;
  sourceConfidence: NutritionSourceConfidence;
  workoutProximity: NutritionWorkoutProximity;
  rawPayloadRef: NutritionRawPayloadRef | null;
  reviewRequested: boolean;
  reviewReason: NutritionReviewReason | null;
  reviewNotes: string[];
  foods: NutritionDraftFood[];
}

export interface NutritionMacroItemPayload {
  name: string;
  serving?: string;
  provider?: string;
  source: NutritionDraftSource;
  confidence?: number;
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
  sugar: number | null;
  sodium: number | null;
  source: MacroRouteSource;
  verified: false;
  items: NutritionMacroItemPayload[];
}

export interface NutritionReconciliation {
  status: NutritionReconciliationStatus;
  reportedCalories: number | null;
  calculatedCalories: number | null;
  differenceCalories: number | null;
  differencePercent: number | null;
}
