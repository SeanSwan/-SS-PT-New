import { describe, expect, it } from 'vitest';
import {
  nutritionDraftToMacroPayloads,
  restaurantFoodToNutritionDraft,
} from './nutritionDraft.adapters';

const restaurantFood = {
  name: 'Chicken Burrito Bowl',
  brandName: 'Chipotle',
  calories: 710,
  protein: 46,
  carbs: 82,
  fat: 24,
  portion: '1 bowl',
  mealSource: 'restaurant',
};

describe('nutrition draft adapters', () => {
  it('normalizes a restaurant food into an editable provider-backed draft', () => {
    const draft = restaurantFoodToNutritionDraft(restaurantFood, {
      draftId: 'draft-restaurant-1',
      foodId: 'food-restaurant-1',
      mealType: 'lunch',
    });

    expect(draft).toMatchObject({
      id: 'draft-restaurant-1',
      source: 'restaurant',
      sourceLabel: 'Restaurant & Brand Foods',
      sourceConfidence: 'provider',
      verified: false,
      title: 'Review Chicken Burrito Bowl',
    });
    expect(draft.foods).toHaveLength(1);
    expect(draft.foods[0]).toMatchObject({
      id: 'food-restaurant-1',
      description: 'Chipotle Chicken Burrito Bowl',
      mealType: 'lunch',
      serving: {
        basis: 'label',
        quantity: 1,
        unit: 'bowl',
        label: '1 bowl',
      },
      nutrients: {
        calories: 710,
        protein: 46,
        carbs: 82,
        fat: 24,
        fiber: null,
        sugar: null,
        sodium: null,
      },
      sourceLabel: 'FatSecret',
      verified: false,
    });
  });

  it('preserves the provider food id as externalId + a stable provider-derived row id', () => {
    const draft = restaurantFoodToNutritionDraft(
      { ...restaurantFood, id: 'food-1' },
      { draftId: 'draft-restaurant-2', mealType: 'lunch' },
    );

    // Provider linkage must survive the draft (parity with searchFoodToNutritionDraft),
    // and the row id derives from the provider id so re-reviewing the same food
    // doesn't mint a fresh identity each time.
    expect(draft.rawPayloadRef).toMatchObject({ provider: 'FatSecret', externalId: 'food-1' });
    expect(draft.foods[0].id).toBe('restaurant-food-1');
  });

  it('still mints a fallback row id when the provider id is absent', () => {
    const draft = restaurantFoodToNutritionDraft(restaurantFood, {
      draftId: 'draft-restaurant-3',
      mealType: 'lunch',
    });

    expect(draft.rawPayloadRef?.externalId).toBeUndefined();
    expect(draft.foods[0].id).toMatch(/^restaurant-food/);
  });

  it('builds /api/macros payloads without silently verifying provider estimates', () => {
    const draft = restaurantFoodToNutritionDraft(restaurantFood, {
      draftId: 'draft-restaurant-1',
      foodId: 'food-restaurant-1',
      mealType: 'dinner',
    });

    const [payload] = nutritionDraftToMacroPayloads(draft, { date: '2026-06-28' });

    expect(payload).toMatchObject({
      date: '2026-06-28',
      mealType: 'dinner',
      description: 'Chipotle Chicken Burrito Bowl',
      calories: 710,
      protein: 46,
      carbs: 82,
      fat: 24,
      fiber: null,
      source: 'usda_lookup',
      verified: false,
      items: [
        expect.objectContaining({
          name: 'Chipotle Chicken Burrito Bowl',
          provider: 'FatSecret',
          source: 'restaurant',
          serving: '1 bowl',
        }),
      ],
    });
  });
});
