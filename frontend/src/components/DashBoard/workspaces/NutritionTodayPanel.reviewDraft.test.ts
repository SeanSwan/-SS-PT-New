/**
 * FILE: NutritionTodayPanel.reviewDraft.test.ts
 * PURPOSE: Verify diary-repeat conversion preserves source and serving truth.
 */
import { describe, expect, it } from 'vitest';
import { repeatMacroEntryToNutritionDraft } from './NutritionTodayPanel.logic';

describe('NutritionTodayPanel repeat review draft', () => {
  it('converts a repeat action into a reviewable provenance-preserving draft', () => {
    const repeatDraft = repeatMacroEntryToNutritionDraft({
      id: 77,
      mealType: 'lunch',
      description: 'Chicken bowl',
      calories: 640,
      protein: 45,
      carbs: 70,
      fat: 18,
      fiber: 8,
      source: 'photo',
      servingBasis: 'household',
      servingQuantity: 1,
      servingUnit: 'bowl',
    }, { draftId: 'repeat-draft-77' });

    expect(repeatDraft).toMatchObject({
      contractVersion: '1.0',
      id: 'repeat-draft-77',
      source: 'photo',
      sourceConfidence: 'community',
      reviewReason: 'unverified_estimate',
      rawPayloadRef: { provider: 'Swan diary', externalId: '77' },
      foods: [{
        description: 'Chicken bowl',
        mealType: 'lunch',
        serving: { basis: 'household', quantity: 1, unit: 'bowl' },
        nutrients: { calories: 640, protein: 45, fiber: 8 },
        verified: false,
      }],
    });
  });

  it.each([
    ['food-scanner', 'photo', 'community'],
    ['ai-chat', 'meal-plan', 'community'],
  ] as const)('preserves the %s source alias in repeat review', (storedSource, draftSource, confidence) => {
    const repeatDraft = repeatMacroEntryToNutritionDraft({
      id: 88,
      mealType: 'snack',
      description: 'Saved meal',
      source: storedSource,
      servingQuantity: 1,
      servingUnit: 'serving',
    }, { draftId: 'repeat-alias' });

    expect(repeatDraft).toMatchObject({
      source: draftSource,
      sourceConfidence: confidence,
    });
  });

  it('treats a Swan diary repeat as community provenance that still requires review', () => {
    const repeatDraft = repeatMacroEntryToNutritionDraft({
      id: 91,
      mealType: 'snack',
      description: 'Saved barcode meal',
      source: 'barcode',
      servingQuantity: 1,
      servingUnit: 'serving',
    }, { draftId: 'repeat-internal-provider' });

    expect(repeatDraft).toMatchObject({
      source: 'barcode',
      sourceConfidence: 'community',
      reviewReason: 'unverified_estimate',
      rawPayloadRef: { provider: 'Swan diary', externalId: '91' },
      verified: false,
      foods: [{ confidence: 0.6, verified: false }],
    });
  });
});
