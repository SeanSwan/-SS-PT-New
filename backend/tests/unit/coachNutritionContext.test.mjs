import { describe, expect, it } from 'vitest';
import { summarizeNutritionLogs } from '../../services/ai/contextEngine/coachNutritionContext.mjs';

describe('summarizeNutritionLogs', () => {
  it('rejects coercive macro values before building coach nutrition averages', () => {
    const summary = summarizeNutritionLogs([{
      date: '2026-06-20',
      mealType: 'lunch',
      calories: ['900'],
      protein: '1e2',
      carbs: { valueOf: () => 80 },
      fat: Number.POSITIVE_INFINITY,
      fiber: -5,
      sugar: '12',
      sodium: '800.5',
      source: 'voice',
      verified: false,
      flagSodium: true,
    }]);

    expect(summary).toMatchObject({
      sampleEntries: 1,
      loggedDays: 1,
      latestDate: '2026-06-20',
      estimateCount: 1,
      sodiumFlagCount: 1,
      sources: ['voice'],
      averages: {
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        fiber: null,
        sugar: 12,
        sodium: 801,
      },
    });
  });
});
