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
      sourceConfidence: 'ai_estimate',
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
    ['food-scanner', 'photo', 'ai_estimate'],
    ['ai-chat', 'meal-plan', 'ai_estimate'],
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
});
