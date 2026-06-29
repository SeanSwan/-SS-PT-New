import { cleanMacro, normalizeMealType, todayIso } from './mealPhotoLog';
import type { RestaurantAddFoodPayload } from './RestaurantTab.logic';
import type {
  MacroRouteSource,
  NutritionDraftFood,
  NutritionDraftSource,
  NutritionEntryDraft,
  NutritionMacroPayload,
} from './nutritionDraft.types';

interface DraftIdOptions {
  draftId?: string;
  foodId?: string;
  mealType?: string;
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

const compactText = (value: unknown): string => String(value || '').replace(/\s+/g, ' ').trim();
const fallbackId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const macroOrNull = (value: unknown) => cleanMacro(value);

export function restaurantFoodToNutritionDraft(
  food: RestaurantAddFoodPayload,
  options: DraftIdOptions = {},
): NutritionEntryDraft {
  const rawName = compactText(food.name) || 'Restaurant food';
  const brand = compactText(food.brandName);
  const description = brand && !rawName.toLowerCase().startsWith(brand.toLowerCase())
    ? `${brand} ${rawName}`
    : rawName;

  const draftFood: NutritionDraftFood = {
    id: options.foodId || fallbackId('restaurant-food'),
    description,
    displayName: rawName,
    mealType: normalizeMealType(options.mealType),
    servingLabel: compactText(food.portion) || 'Serving details unavailable',
    calories: macroOrNull(food.calories),
    protein: macroOrNull(food.protein),
    carbs: macroOrNull(food.carbs),
    fat: macroOrNull(food.fat),
    fiber: null,
    provider: 'FatSecret',
    sourceLabel: 'FatSecret',
    verified: false,
  };

  return {
    id: options.draftId || fallbackId('restaurant-draft'),
    title: `Review ${rawName}`,
    source: 'restaurant',
    sourceLabel: 'Restaurant & Brand Foods',
    sourceConfidence: 'provider',
    verified: false,
    foods: [draftFood],
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
      calories: macroOrNull(food.calories),
      protein: macroOrNull(food.protein),
      carbs: macroOrNull(food.carbs),
      fat: macroOrNull(food.fat),
      fiber: macroOrNull(food.fiber),
      sugar: macroOrNull(food.sugar),
      sodium: macroOrNull(food.sodium),
      source,
      verified: false,
      items: [{
        name: compactText(food.description).slice(0, 150),
        serving: food.servingLabel || undefined,
        provider: food.provider || food.sourceLabel || draft.sourceLabel,
        source: draft.source,
        confidence: food.confidence ?? undefined,
      }],
    }));
}
