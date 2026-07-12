/**
 * FILE: NutritionTodayPanel.repeatMeal.ts
 * PURPOSE: Build the one-tap repeat-meal macro payload without inventing
 *          verification or losing source provenance.
 */
import type { MealTypeOption } from '../../FoodTracker/mealPhotoLog';
import type {
  NutritionDraftSource,
  NutritionEntryDraft,
  NutritionServingBasis,
  NutritionSourceConfidence,
} from '../../FoodTracker/nutritionDraft.types';
import { formatLocalCalendarDate } from './clients-team/nutritionDate';

export interface RepeatMacroEntry {
  id?: number | string | null;
  mealType?: string | null;
  description?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  items?: unknown;
  source?: string | null;
  servingBasis?: string | null;
  servingQuantity?: number | string | null;
  servingUnit?: string | null;
}

const allowedMealTypes: readonly MealTypeOption[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const isMealTypeOption = (value: string): value is MealTypeOption =>
  allowedMealTypes.some((mealType) => mealType === value);
const repeatSourceMap: Record<string, 'manual' | 'ai-chat' | 'food-scanner' | 'barcode' | 'voice' | 'usda_lookup'> = {
  manual: 'manual',
  'ai-chat': 'ai-chat',
  ai_chat: 'ai-chat',
  'food-scanner': 'food-scanner',
  photo: 'food-scanner',
  barcode: 'barcode',
  voice: 'voice',
  usda_lookup: 'usda_lookup',
};
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;
const todayIso = () => formatLocalCalendarDate();

const toFiniteDecimalNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const cleanNonNegativeNumber = (value: unknown) => {
  const numberValue = toFiniteDecimalNumber(value);
  return numberValue !== null && numberValue >= 0 ? numberValue : null;
};

const normalizeRepeatMealType = (value: unknown): MealTypeOption => {
  if (typeof value !== 'string') return 'snack';
  const normalized = value.trim().toLowerCase();
  return isMealTypeOption(normalized) ? normalized : 'snack';
};

const normalizeRepeatSource = (value: unknown) => {
  if (typeof value !== 'string') return 'manual';
  return repeatSourceMap[value.trim().toLowerCase()] || 'manual';
};

export const buildRepeatMacroPayload = (entry: RepeatMacroEntry | null | undefined, date = todayIso()) => {
  const description = String(entry?.description || '').trim();
  if (!description) return null;
  return {
    date,
    mealType: normalizeRepeatMealType(entry?.mealType),
    description,
    calories: cleanNonNegativeNumber(entry?.calories),
    protein: cleanNonNegativeNumber(entry?.protein),
    carbs: cleanNonNegativeNumber(entry?.carbs),
    fat: cleanNonNegativeNumber(entry?.fat),
    fiber: cleanNonNegativeNumber(entry?.fiber),
    sugar: cleanNonNegativeNumber(entry?.sugar),
    sodium: cleanNonNegativeNumber(entry?.sodium),
    items: Array.isArray(entry?.items) ? entry.items : [],
    source: normalizeRepeatSource(entry?.source),
    verified: false,
  };
};
const REPEAT_DRAFT_SOURCE: Record<string, NutritionDraftSource> = {
  'ai-chat': 'meal-plan',
  ai_chat: 'meal-plan',
  barcode: 'barcode',
  'food-scanner': 'photo',
  manual: 'manual',
  photo: 'photo',
  usda_lookup: 'search',
  voice: 'voice',
};

const REPEAT_SOURCE_LABEL: Record<NutritionDraftSource, string> = {
  manual: 'Manual diary entry',
  voice: 'Voice estimate',
  photo: 'Photo estimate',
  search: 'Food search result',
  restaurant: 'Restaurant result',
  barcode: 'Barcode result',
  'meal-plan': 'Swan Coach estimate',
};

const SERVING_BASES = new Set<NutritionServingBasis>([
  'label',
  'per_100g',
  'weighed',
  'household',
  'estimated',
]);

const repeatDraftSource = (source: unknown): NutritionDraftSource => {
  if (typeof source !== 'string') return 'manual';
  return REPEAT_DRAFT_SOURCE[source.trim().toLowerCase()] || 'manual';
};

const positiveServingQuantity = (value: unknown): number => {
  const quantity = cleanNonNegativeNumber(value);
  return quantity !== null && quantity > 0 ? quantity : 1;
};

export const repeatMacroEntryToNutritionDraft = (
  entry: RepeatMacroEntry | null | undefined,
  options: { draftId?: string } = {},
): NutritionEntryDraft | null => {
  const macro = buildRepeatMacroPayload(entry);
  if (!macro) return null;

  const source = repeatDraftSource(entry?.source);
  const sourceConfidence: NutritionSourceConfidence = 'community';
  const sourceLabel = REPEAT_SOURCE_LABEL[source];
  const externalId = typeof entry?.id === 'number' || typeof entry?.id === 'string'
    ? String(entry.id)
    : '';
  const basis = typeof entry?.servingBasis === 'string' && SERVING_BASES.has(entry.servingBasis as NutritionServingBasis)
    ? entry.servingBasis as NutritionServingBasis
    : 'estimated';
  const quantity = positiveServingQuantity(entry?.servingQuantity);
  const unit = typeof entry?.servingUnit === 'string' && entry.servingUnit.trim()
    ? entry.servingUnit.trim().slice(0, 30)
    : 'serving';
  const timestamp = Date.now().toString(36);
  const foodId = 'repeat-food-' + (externalId || timestamp);

  return {
    contractVersion: '1.0',
    id: options.draftId || 'repeat-draft-' + (externalId || timestamp) + '-' + timestamp,
    userId: null,
    loggedByUserId: null,
    title: 'Review repeated meal',
    source,
    sourceLabel: 'Repeat: ' + sourceLabel,
    sourceConfidence,
    workoutProximity: 'none',
    rawPayloadRef: {
      provider: 'Swan diary',
      externalId: externalId || undefined,
    },
    reviewReason: 'unverified_estimate',
    reviewNotes: ['Confirm the serving still matches what you ate today.'],
    verified: false,
    foods: [{
      id: foodId,
      description: macro.description,
      displayName: macro.description,
      mealType: macro.mealType,
      serving: {
        basis,
        quantity,
        unit,
        label: String(quantity) + ' ' + unit,
      },
      nutrients: {
        calories: macro.calories,
        protein: macro.protein,
        carbs: macro.carbs,
        fat: macro.fat,
        fiber: macro.fiber,
        sugar: macro.sugar,
        sodium: macro.sodium,
      },
      confidence: 0.6,
      provider: sourceLabel,
      sourceLabel,
      verified: false,
    }],
  };
};
