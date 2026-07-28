export type NutritionDraftSource =
  | 'manual'
  | 'search_proxy'
  | 'barcode'
  | 'photo_ai'
  | 'voice_ai'
  | 'meal_plan_ai';

export type NutritionDraftVerificationStatus = 'unverified' | 'estimated' | 'coach_verified';

export interface NutritionMacroDraft {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
}

export interface NutritionDraftProvenance {
  source: NutritionDraftSource;
  provider?: 'USDA' | 'OFF' | 'Swan' | 'AI';
  externalId?: string | number;
  confidence?: number | null;
  capturedAt?: string;
}

export interface NutritionEntryDraft extends NutritionMacroDraft {
  id: string;
  description: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servingSize?: string;
  brandName?: string | null;
  verificationStatus: NutritionDraftVerificationStatus;
  provenance: NutritionDraftProvenance;
}