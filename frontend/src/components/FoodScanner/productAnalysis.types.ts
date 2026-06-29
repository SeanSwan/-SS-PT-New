export type RatingTone = 'good' | 'okay' | 'bad';
export type ClaimCategory = 'regulatory' | 'nutrition threshold' | 'processing' | 'allergen' | 'preference' | 'estimate' | 'provider';
export type SourceConfidence = 'verified' | 'provider' | 'community' | 'ai_estimate';

export interface IngredientFlag {
  label: string;
  category: ClaimCategory;
  evidence?: string;
  severity?: 'lower' | 'review' | 'higher';
}

export interface Ingredient {
  name: string;
  healthRating: RatingTone;
  isGMO: boolean;
  isProcessed: boolean;
  iarcGroup?: string | null;
  isEUBanned?: boolean;
  bannedRegions?: string[];
  healthConcerns?: string[];
  healthierAlternatives?: string[];
  description?: string | null;
  category?: string | null;
  allergens?: string[];
}

export interface NutritionalInfo {
  calories?: number;
  fat?: number;
  saturatedFat?: number;
  carbohydrates?: number;
  sugars?: number;
  protein?: number;
  salt?: number;
  sodium?: number;
  fiber?: number;
  [key: string]: unknown;
}

export interface FoodProduct {
  id: number;
  barcode: string;
  name: string;
  brand: string | null;
  description: string | null;
  ingredientsList: string | null;
  ingredients: Ingredient[] | null;
  nutritionalInfo: NutritionalInfo | null;
  overallRating: RatingTone;
  ratingReasons: string[] | null;
  healthConcerns: string[] | null;
  isOrganic: boolean;
  isNonGMO: boolean;
  category: string | null;
  imageUrl: string | null;
  healthierAlternatives: Array<string | { name?: string }> | null;
  dataSource?: string | null;
  lastVerified?: string | null;
}

export interface ProductExplanationSection {
  title: string;
  body: string;
}

export interface ProductExplanation {
  productName?: string;
  ingredientName?: string;
  brand?: string | null;
  sourceConfidence: {
    provider: string;
    confidence: SourceConfidence;
    detail: string;
  };
  flags: IngredientFlag[];
  sections: ProductExplanationSection[];
  guardrails: string[];
}

export interface ProductVideoBrief {
  title: string;
  status: 'draft_not_published';
  sourceConfidence: ProductExplanation['sourceConfidence'];
  claims: IngredientFlag[];
  scenes: Array<{ title: string; notes: string }>;
  guardrails: string[];
}
