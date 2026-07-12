import { cleanMacro, normalizeMealType, todayIso } from './mealPhotoLog';
import { buildMacroDraftsFromMealPlan, type MealPlanInput } from './MealPlanApproveSavePanel.logic';
import type { FoodItem, MealType } from './FoodIntakeForm.logic';
import type { FoodResult } from './FoodSearchPanel.logic';
import type { RestaurantAddFoodPayload } from './RestaurantTab.logic';
export { barcodeProductToNutritionDraft } from './nutritionDraft.barcode';
export type { BarcodeNutritionProduct } from './nutritionDraft.barcode';
import type {
  MacroRouteSource,
  NutrientMap,
  NutritionDraftFood,
  NutritionDraftSavePayload,
  NutritionDraftSource,
  NutritionEntryDraft,
  NutritionMacroPayload,
  NutritionRawPayloadRef,
  NutritionReconciliation,
  NutritionServing,
  NutritionSourceConfidence,
  NutritionWorkoutProximity,
} from './nutritionDraft.types';

interface DraftIdOptions {
  draftId?: string;
  foodId?: string;
  mealType?: string;
  userId?: number | null;
  loggedByUserId?: number | null;
  workoutProximity?: NutritionWorkoutProximity;
}

interface VoiceDraftOptions extends DraftIdOptions {
  lowConfidence?: boolean;
  reviewNotes?: string[];
}

const routeSourceByDraftSource: Record<NutritionDraftSource, MacroRouteSource> = {
  manual: 'manual',
  voice: 'voice',
  photo: 'food-scanner',
  search: 'usda_lookup',
  restaurant: 'usda_lookup',
  barcode: 'barcode',
  'meal-plan': 'ai-chat',
};

const nutrientKeys = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'] as const;
const compactText = (value: unknown): string => String(value || '').replace(/\s+/g, ' ').trim();
const fallbackId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const macroOrNull = (value: unknown) => cleanMacro(value);
const roundMacro = (value: number) => Math.round(value * 10) / 10;

const nutrientMap = (values: Partial<NutrientMap>): NutrientMap => ({
  calories: macroOrNull(values.calories),
  protein: macroOrNull(values.protein),
  carbs: macroOrNull(values.carbs),
  fat: macroOrNull(values.fat),
  fiber: macroOrNull(values.fiber),
  sugar: macroOrNull(values.sugar),
  sodium: macroOrNull(values.sodium),
});

const baseDraft = (
  source: NutritionDraftSource,
  title: string,
  sourceLabel: string,
  sourceConfidence: NutritionSourceConfidence,
  foods: NutritionDraftFood[],
  options: DraftIdOptions,
  rawPayloadRef: NutritionRawPayloadRef | null = null,
): NutritionEntryDraft => ({
  contractVersion: '1.0',
  id: options.draftId || fallbackId(`${source}-draft`),
  userId: options.userId ?? null,
  loggedByUserId: options.loggedByUserId ?? options.userId ?? null,
  title,
  source,
  sourceLabel,
  sourceConfidence,
  workoutProximity: options.workoutProximity || 'none',
  rawPayloadRef,
  reviewReason: null,
  reviewNotes: [],
  verified: false,
  foods,
});

const servingFromLabel = (label: unknown, fallbackBasis: NutritionServing['basis'] = 'label'): NutritionServing => {
  const safeLabel = compactText(label);
  const match = safeLabel.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\b/);
  return {
    basis: fallbackBasis,
    quantity: match ? macroOrNull(match[1]) : 1,
    unit: match?.[2]?.toLowerCase() || 'serving',
    label: safeLabel || '1 serving',
  };
};

export const calculateAtwaterCalories = (nutrients: NutrientMap): number | null => {
  const { protein, carbs, fat } = nutrients;
  if (protein === null || carbs === null || fat === null) return null;
  return roundMacro((protein * 4) + (carbs * 4) + (fat * 9));
};

export const reconcileCalories = (nutrients: NutrientMap): NutritionReconciliation => {
  const reportedCalories = macroOrNull(nutrients.calories);
  const calculatedCalories = calculateAtwaterCalories(nutrients);
  if (calculatedCalories === null) {
    return { status: 'not_applicable', reportedCalories, calculatedCalories: null, differenceCalories: null, differencePercent: null };
  }
  if (reportedCalories === null) {
    return { status: 'calculated_only', reportedCalories: null, calculatedCalories, differenceCalories: null, differencePercent: null };
  }
  const differenceCalories = roundMacro(Math.abs(reportedCalories - calculatedCalories));
  const differencePercent = reportedCalories === 0
    ? (differenceCalories === 0 ? 0 : 100)
    : roundMacro((differenceCalories / reportedCalories) * 100);
  return {
    status: differenceCalories <= Math.max(20, reportedCalories * 0.1)
      ? 'within_tolerance'
      : 'metabolic_deviation',
    reportedCalories,
    calculatedCalories,
    differenceCalories,
    differencePercent,
  };
};

export const scaleNutrientsForServing = (
  nutrients: NutrientMap,
  previousQuantity: number | null,
  nextQuantity: number | null,
): NutrientMap => {
  if (!previousQuantity || previousQuantity <= 0 || nextQuantity === null || nextQuantity < 0) return nutrients;
  const multiplier = nextQuantity / previousQuantity;
  return nutrientKeys.reduce<NutrientMap>((scaled, key) => {
    const value = nutrients[key];
    scaled[key] = value === null ? null : roundMacro(value * multiplier);
    return scaled;
  }, { ...nutrients });
};

export function manualFoodItemsToNutritionDraft(
  mealType: MealType,
  items: FoodItem[],
  options: DraftIdOptions = {},
): NutritionEntryDraft {
  const foods = items.map((item, index): NutritionDraftFood => ({
    id: item.id || options.foodId || fallbackId(`manual-food-${index + 1}`),
    description: compactText(item.name) || `Food ${index + 1}`,
    displayName: compactText(item.name) || undefined,
    mealType: normalizeMealType(mealType),
    serving: servingFromLabel(item.portion, 'household'),
    nutrients: nutrientMap(item),
    confidence: null,
    provider: 'Self reported',
    sourceLabel: 'Manual entry',
    verified: false,
  }));
  return baseDraft('manual', 'Review manual meal', 'Manual entry', 'community', foods, options);
}

export function searchFoodToNutritionDraft(
  food: FoodResult,
  options: DraftIdOptions = {},
): NutritionEntryDraft {
  const name = compactText(food.name) || 'Searched food';
  const isCommunitySource = String(food.source || '').toUpperCase() === 'OFF';
  const provider = isCommunitySource ? 'Open Food Facts' : 'USDA';
  const row: NutritionDraftFood = {
    id: options.foodId || `search-${String(food.id)}`,
    description: compactText([food.brand, name].filter(Boolean).join(' ')) || name,
    displayName: name,
    mealType: normalizeMealType(options.mealType),
    serving: servingFromLabel(food.servingSize),
    nutrients: nutrientMap(food),
    confidence: isCommunitySource ? 0.6 : 0.85,
    provider,
    sourceLabel: provider,
    brandName: compactText(food.brand) || undefined,
    verified: false,
  };
  return baseDraft('search', `Review ${name}`, 'Food Search', isCommunitySource ? 'community' : 'provider', [row], options, {
    provider,
    externalId: String(food.id),
  });
}

export function restaurantFoodToNutritionDraft(
  food: RestaurantAddFoodPayload,
  options: DraftIdOptions = {},
): NutritionEntryDraft {
  const rawName = compactText(food.name) || 'Restaurant food';
  const brand = compactText(food.brandName);
  const description = brand && !rawName.toLowerCase().startsWith(brand.toLowerCase())
    ? `${brand} ${rawName}`
    : rawName;
  const providerFoodId = compactText(food.id);
  const row: NutritionDraftFood = {
    // Mirror searchFoodToNutritionDraft: prefer a provider-derived row id so a
    // re-review of the same restaurant food doesn't mint a fresh identity each time.
    id: options.foodId || (providerFoodId ? `restaurant-${providerFoodId}` : fallbackId('restaurant-food')),
    description,
    displayName: rawName,
    mealType: normalizeMealType(options.mealType),
    serving: servingFromLabel(food.portion),
    nutrients: nutrientMap(food),
    confidence: 0.78,
    provider: 'FatSecret',
    sourceLabel: 'FatSecret',
    brandName: brand || undefined,
    verified: false,
  };
  return baseDraft('restaurant', `Review ${rawName}`, 'Restaurant & Brand Foods', 'provider', [row], options, {
    provider: 'FatSecret',
    externalId: providerFoodId || undefined,
  });
}

export function voiceMealsToNutritionDraft(
  plan: MealPlanInput,
  options: VoiceDraftOptions = {},
): NutritionEntryDraft {
  const meals = buildMacroDraftsFromMealPlan(plan);
  const foods = meals.map((meal): NutritionDraftFood => ({
    id: meal.id,
    description: meal.description,
    displayName: meal.description,
    mealType: meal.mealType,
    serving: { basis: 'estimated', quantity: 1, unit: 'serving', label: 'Estimated serving' },
    nutrients: nutrientMap(meal),
    confidence: options.lowConfidence ? 0.35 : 0.55,
    provider: 'Swan Coach',
    sourceLabel: 'Voice estimate',
    verified: false,
  }));
  const draft = baseDraft('voice', 'Review spoken meal', 'Speak a Meal', 'ai_estimate', foods, options);
  return {
    ...draft,
    reviewReason: 'unverified_estimate',
    reviewNotes: (options.reviewNotes || []).map((note) => compactText(note)).filter(Boolean).slice(0, 5),
  };
}

export function nutritionDraftToMacroPayloads(
  draft: NutritionEntryDraft,
  options: { date?: string } = {},
): NutritionMacroPayload[] {
  const date = options.date || todayIso();
  const source = routeSourceByDraftSource[draft.source] || 'manual';
  return draft.foods
    .filter((food) => compactText(food.description).length > 0)
    .map((food) => ({
      date,
      mealType: normalizeMealType(food.mealType),
      description: compactText(food.description).slice(0, 500) || 'Logged food',
      ...nutrientMap(food.nutrients),
      source,
      verified: false,
      items: [{
        name: compactText(food.description).slice(0, 150),
        serving: food.serving.label || undefined,
        provider: food.provider || food.sourceLabel || draft.sourceLabel,
        source: draft.source,
        confidence: food.confidence ?? undefined,
      }],
    }));
}

export function nutritionDraftToSavePayload(
  draft: NutritionEntryDraft,
  options: { date?: string; reviewRequested?: boolean } = {},
): NutritionDraftSavePayload {
  return {
    contractVersion: draft.contractVersion,
    draftId: draft.id,
    date: options.date || todayIso(),
    userId: draft.userId,
    loggedByUserId: draft.loggedByUserId,
    source: draft.source,
    sourceLabel: draft.sourceLabel,
    sourceConfidence: draft.sourceConfidence,
    workoutProximity: draft.workoutProximity,
    rawPayloadRef: draft.rawPayloadRef,
    reviewRequested: Boolean(options.reviewRequested),
    reviewReason: draft.reviewReason,
    reviewNotes: [...draft.reviewNotes],
    foods: draft.foods.map((food) => ({
      ...food,
      serving: { ...food.serving },
      nutrients: { ...food.nutrients },
    })),
  };
}
