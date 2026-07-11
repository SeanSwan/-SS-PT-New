import { describe, expect, it } from 'vitest';
import { reconcileNutritionCalories } from '../../services/nutrition/nutritionReconciliation.mjs';

describe('nutrition calorie reconciliation', () => {
  it('uses Atwater 4-4-9 and accepts normal label rounding', () => {
    expect(reconcileNutritionCalories({
      calories: 300,
      protein: 20,
      carbs: 30,
      fat: 10,
    })).toEqual({
      reportedCalories: 300,
      calculatedCalories: 290,
      differenceCalories: 10,
      differencePercent: 3.3,
      status: 'within_tolerance',
    });
  });

  it('flags metabolic deviation beyond ten percent and the label allowance', () => {
    expect(reconcileNutritionCalories({
      calories: 500,
      protein: 20,
      carbs: 30,
      fat: 10,
    })).toMatchObject({
      calculatedCalories: 290,
      differenceCalories: 210,
      status: 'metabolic_deviation',
    });
  });

  it('distinguishes calculated-only and insufficient-macro rows', () => {
    expect(reconcileNutritionCalories({
      calories: null,
      protein: 20,
      carbs: 30,
      fat: 10,
    }).status).toBe('calculated_only');

    expect(reconcileNutritionCalories({
      calories: 300,
      protein: null,
      carbs: 30,
      fat: 10,
    }).status).toBe('not_applicable');
  });

  it('rejects exponent, hex, negative, and collection coercion', () => {
    expect(reconcileNutritionCalories({
      calories: '1e3',
      protein: '0x10',
      carbs: [30],
      fat: -4,
    })).toEqual({
      reportedCalories: null,
      calculatedCalories: null,
      differenceCalories: null,
      differencePercent: null,
      status: 'not_applicable',
    });
  });
});
