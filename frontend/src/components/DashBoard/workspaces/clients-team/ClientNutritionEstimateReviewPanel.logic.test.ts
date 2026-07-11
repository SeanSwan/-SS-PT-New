import { describe, expect, it } from 'vitest';
import {
  buildNutritionEstimateReviewRows,
  type NutritionEstimateReviewClient,
  type NutritionEstimateReviewEntry,
} from './ClientNutritionEstimateReviewPanel.logic';

const clients: NutritionEstimateReviewClient[] = [
  { id: 101, displayName: 'Alpha Client' },
];

describe('ClientNutritionEstimateReviewPanel logic', () => {
  it('rejects coercive macro values before rendering coach-facing estimate totals', () => {
    const rows = buildNutritionEstimateReviewRows(clients, [{
      id: 77,
      userId: 101,
      mealType: 'lunch',
      description: 'chicken bowl',
      calories: ['620'] as unknown as number,
      protein: '1e2',
      fiber: { valueOf: () => 9 } as unknown as number,
      source: 'photo',
      verified: false,
    } satisfies NutritionEstimateReviewEntry]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      clientName: 'Alpha Client',
      mealTitle: 'Lunch',
      macroLine: '0 cal - 0g protein - 0g fiber',
      sourceLabel: 'Photo estimate',
    });
  });

  it('surfaces provenance and reconciliation facts a coach can act on', () => {
    const [row] = buildNutritionEstimateReviewRows(clients, [{
      id: 80,
      userId: 101,
      mealType: 'dinner',
      description: 'restaurant bowl',
      calories: 620,
      protein: 38,
      fiber: 8,
      source: 'usda_lookup',
      verified: false,
      servingBasis: 'label',
      servingQuantity: 1,
      servingUnit: 'bowl',
      caloriesReported: 620,
      caloriesCalculated: 544,
      reconciliationStatus: 'metabolic_deviation',
      confidenceScore: 0.78,
      reviewStatus: 'needs_review',
      reviewReason: 'client_requested',
    }]);

    expect(row).toMatchObject({
      reviewReasonLabel: 'Reason: Client requested review',
      reviewStatusLabel: 'Status: Needs review',
      servingLabel: 'Serving: 1 bowl (Label)',
      confidenceLabel: 'Source confidence: 78%',
      reconciliationLabel: 'Calories: 620 reported / 544 calculated',
    });
  });

  it('drops estimates for clients outside the visible roster instead of rendering fallback identities', () => {
    const rows = buildNutritionEstimateReviewRows(clients, [{
      id: 78,
      userId: 999,
      mealType: 'dinner',
      description: 'outside roster meal',
      calories: 500,
      protein: 30,
      fiber: 6,
      source: 'voice',
      verified: false,
    }]);

    expect(rows).toEqual([]);
  });

  it('rejects coercive user ids before joining estimates to visible clients', () => {
    const rows = buildNutritionEstimateReviewRows(clients, [{
      id: 79,
      userId: ['101'] as unknown as string,
      mealType: 'snack',
      description: 'coerced identity meal',
      calories: 320,
      protein: 24,
      fiber: 4,
      source: 'voice',
      verified: false,
    }]);

    expect(rows).toEqual([]);
  });
});
