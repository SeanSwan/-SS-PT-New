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
});
