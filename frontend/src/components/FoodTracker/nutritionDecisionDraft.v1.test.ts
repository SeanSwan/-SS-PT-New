import { describe, expect, it } from 'vitest';
import {
  barcodeProductToNutritionDraft,
  calculateAtwaterCalories,
  manualFoodItemsToNutritionDraft,
  nutritionDraftToSavePayload,
  reconcileCalories,
  scaleNutrientsForServing,
  searchFoodToNutritionDraft,
} from './nutritionDraft.adapters';

describe('NutritionEntryDraft v1 contract', () => {
  it('converts manual foods into typed serving-aware draft rows', () => {
    const draft = manualFoodItemsToNutritionDraft('lunch', [{
      id: 'manual-1',
      name: 'Greek yogurt',
      portion: '1 cup',
      calories: 160,
      protein: 18,
      carbs: 12,
      fat: 4,
      quality: 'high',
    }], {
      draftId: 'draft-manual-1',
      userId: 7,
      loggedByUserId: 7,
    });

    expect(draft).toMatchObject({
      contractVersion: '1.0',
      id: 'draft-manual-1',
      userId: 7,
      loggedByUserId: 7,
      source: 'manual',
      workoutProximity: 'none',
    });
    expect(draft.foods[0]).toMatchObject({
      description: 'Greek yogurt',
      serving: { basis: 'household', quantity: 1, unit: 'cup', label: '1 cup' },
      nutrients: { calories: 160, protein: 18, carbs: 12, fat: 4 },
      verified: false,
    });
  });

  it('preserves provider identity and serving basis for searched foods', () => {
    const draft = searchFoodToNutritionDraft({
      id: 'usda-1001',
      name: 'Chicken Breast',
      brand: 'Acme Farms',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 4,
      servingSize: '100 g',
      source: 'USDA',
    }, {
      draftId: 'draft-search-1',
      mealType: 'dinner',
    });

    expect(draft).toMatchObject({
      contractVersion: '1.0',
      source: 'search',
      sourceConfidence: 'provider',
      rawPayloadRef: { provider: 'USDA', externalId: 'usda-1001' },
    });
    expect(draft.foods[0]).toMatchObject({
      mealType: 'dinner',
      serving: { basis: 'label', quantity: 100, unit: 'g' },
      nutrients: { calories: 165, protein: 31, carbs: 0, fat: 4 },
    });
  });

  it('uses a packaged-food label serving instead of silently logging 100 grams', () => {
    const draft = barcodeProductToNutritionDraft({
      id: 22,
      barcode: '049000042566',
      name: 'Protein Bites',
      brand: 'Swan Foods',
      dataSource: 'Open Food Facts',
      nutritionalInfo: {
        serving_size_g: 30,
        energy_kcal_100g: 400,
        proteins_100g: 10,
        carbohydrates_100g: 50,
        fat_100g: 20,
        fiber_100g: 5,
        sodium_100g: 0.8,
      },
    }, {
      draftId: 'draft-barcode-1',
      mealType: 'snack',
    });

    expect(draft.rawPayloadRef).toEqual(expect.objectContaining({
      barcode: '049000042566',
      externalId: '22',
    }));
    expect(draft.sourceConfidence).toBe('community');
    expect(draft.foods[0].confidence).toBe(0.6);
    expect(draft.foods[0]).toMatchObject({
      serving: { basis: 'label', quantity: 30, unit: 'g' },
      nutrients: { calories: 120, protein: 3, carbs: 15, fat: 6, fiber: 1.5, sodium: 240 },
    });
  });

  it('classifies Open Food Facts search data as community sourced', () => {
    const draft = searchFoodToNutritionDraft({
      id: 'off-1', name: 'Community cereal', calories: 210, protein: 5,
      carbs: 40, fat: 4, servingSize: '45 g', source: 'OFF',
    });
    expect(draft.sourceConfidence).toBe('community');
    expect(draft.foods[0].confidence).toBe(0.6);
  });

  it('reconciles reported calories against Atwater 4-4-9 with label tolerance', () => {
    const nutrients = { calories: 300, protein: 20, carbs: 30, fat: 10, fiber: null, sugar: null, sodium: null };
    expect(calculateAtwaterCalories(nutrients)).toBe(290);
    expect(reconcileCalories(nutrients)).toMatchObject({
      status: 'within_tolerance',
      calculatedCalories: 290,
      differenceCalories: 10,
    });
    expect(reconcileCalories({ ...nutrients, calories: 500 }).status).toBe('metabolic_deviation');
  });

  it('scales every nutrient when the reviewed serving quantity changes', () => {
    expect(scaleNutrientsForServing({
      calories: 120,
      protein: 3,
      carbs: 15,
      fat: 6,
      fiber: 1.5,
      sugar: 4,
      sodium: 90,
    }, 30, 45)).toEqual({
      calories: 180,
      protein: 4.5,
      carbs: 22.5,
      fat: 9,
      fiber: 2.3,
      sugar: 6,
      sodium: 135,
    });
  });

  it('builds one idempotent draft-save payload rather than independent row writes', () => {
    const draft = manualFoodItemsToNutritionDraft('breakfast', [{
      id: 'manual-1',
      name: 'Eggs',
      portion: '2 whole',
      calories: 150,
      protein: 12,
      carbs: 1,
      fat: 10,
      quality: 'high',
    }], { draftId: 'draft-save-1' });

    expect(nutritionDraftToSavePayload(draft, { date: '2026-07-09' })).toMatchObject({
      contractVersion: '1.0',
      draftId: 'draft-save-1',
      date: '2026-07-09',
      source: 'manual',
      foods: [expect.objectContaining({ description: 'Eggs' })],
    });
  });
});
