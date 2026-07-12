import { cleanMacro, normalizeMealType } from './mealPhotoLog';
import type {
  NutrientMap,
  NutritionDraftFood,
  NutritionEntryDraft,
  NutritionServing,
  NutritionWorkoutProximity,
} from './nutritionDraft.types';

export interface BarcodeNutritionProduct {
  id?: string | number;
  barcode?: string;
  name?: string;
  brand?: string;
  dataSource?: string;
  nutritionalInfo?: Record<string, unknown> | null;
}

interface BarcodeDraftOptions {
  draftId?: string;
  foodId?: string;
  mealType?: string;
  userId?: number | null;
  loggedByUserId?: number | null;
  workoutProximity?: NutritionWorkoutProximity;
}

const compactText = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim();
const fallbackId = () => `barcode-draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const macroOrNull = (value: unknown) => cleanMacro(value);
const roundMacro = (value: number) => Math.round(value * 10) / 10;

const firstMacro = (info: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = macroOrNull(info[key]);
    if (value !== null) return value;
  }
  return null;
};

const barcodeMacro = (
  info: Record<string, unknown>,
  perHundredKeys: string[],
  fallbackKeys: string[],
  servingGrams: number | null,
) => {
  const perHundred = firstMacro(info, perHundredKeys);
  if (perHundred !== null) return servingGrams ? roundMacro(perHundred * servingGrams / 100) : perHundred;
  return firstMacro(info, fallbackKeys);
};
const sodiumFromBarcode = (
  info: Record<string, unknown>,
  servingGrams: number | null,
  openFoodFacts: boolean,
) => {
  const perHundredGrams = firstMacro(info, ['sodium_100g']);
  if (perHundredGrams !== null) {
    const servingValue = servingGrams ? perHundredGrams * servingGrams / 100 : perHundredGrams;
    return roundMacro(servingValue * 1000);
  }
  const explicitMilligrams = firstMacro(info, ['sodium_mg', 'sodiumMg']);
  if (explicitMilligrams !== null) return explicitMilligrams;
  const fallback = firstMacro(info, ['sodium']);
  return fallback !== null && openFoodFacts ? roundMacro(fallback * 1000) : fallback;
};


const nutrientsFromBarcode = (
  info: Record<string, unknown>,
  servingGrams: number | null,
  openFoodFacts: boolean,
): NutrientMap => ({
  calories: barcodeMacro(info, ['energy_kcal_100g', 'energy-kcal_100g'], ['energy-kcal', 'calories'], servingGrams),
  protein: barcodeMacro(info, ['proteins_100g', 'protein_100g'], ['proteins', 'protein'], servingGrams),
  carbs: barcodeMacro(info, ['carbohydrates_100g', 'carbs_100g'], ['carbohydrates', 'carbs'], servingGrams),
  fat: barcodeMacro(info, ['fat_100g'], ['fat'], servingGrams),
  fiber: barcodeMacro(info, ['fiber_100g'], ['fiber'], servingGrams),
  sugar: barcodeMacro(info, ['sugars_100g', 'sugar_100g'], ['sugars', 'sugar'], servingGrams),
  sodium: sodiumFromBarcode(info, servingGrams, openFoodFacts),
});

export function barcodeProductToNutritionDraft(
  product: BarcodeNutritionProduct,
  options: BarcodeDraftOptions = {},
): NutritionEntryDraft {
  const info = product.nutritionalInfo && typeof product.nutritionalInfo === 'object'
    ? product.nutritionalInfo
    : {};
  const servingGrams = firstMacro(info, ['serving_size_g', 'servingSizeGrams']);
  const name = compactText(product.name) || 'Scanned product';
  const provider = compactText(product.dataSource) || 'Packaged food catalog';
  const serving: NutritionServing = servingGrams
    ? { basis: 'label', quantity: servingGrams, unit: 'g', label: `${servingGrams} g label serving` }
    : { basis: 'per_100g', quantity: 100, unit: 'g', label: 'Per 100 g - edit to your serving' };
  const openFoodFacts = /open\s*food\s*facts/i.test(provider);
  const row: NutritionDraftFood = {
    id: options.foodId || `barcode-${compactText(product.barcode) || fallbackId()}`,
    description: compactText([product.brand, name].filter(Boolean).join(' ')) || name,
    displayName: name,
    mealType: normalizeMealType(options.mealType),
    serving,
    nutrients: nutrientsFromBarcode(info, servingGrams, openFoodFacts),
    confidence: openFoodFacts ? 0.6 : 0.82,
    provider,
    sourceLabel: provider,
    brandName: compactText(product.brand) || undefined,
    verified: false,
  };

  return {
    contractVersion: '1.0',
    id: options.draftId || fallbackId(),
    userId: options.userId ?? null,
    loggedByUserId: options.loggedByUserId ?? options.userId ?? null,
    title: `Review ${name}`,
    source: 'barcode',
    sourceLabel: 'Barcode Scanner',
    sourceConfidence: openFoodFacts ? 'community' : 'provider',
    workoutProximity: options.workoutProximity || 'none',
    rawPayloadRef: {
      provider,
      externalId: product.id === undefined ? undefined : String(product.id),
      barcode: compactText(product.barcode) || undefined,
    },
    reviewReason: null,
    reviewNotes: [],
    verified: false,
    foods: [row],
  };
}
