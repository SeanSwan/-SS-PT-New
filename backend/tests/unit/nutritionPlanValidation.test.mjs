/**
 * Regression: POST /api/nutrition/:userId body validation (S0.2, nutrition
 * blueprint 2026-08-04). Before this slice the route passed 14 unvalidated
 * fields into ClientNutritionPlan.create — a string in a DECIMAL column 500'd,
 * JSONB fields accepted unbounded payloads, and protected attributes were only
 * safe by accident of destructuring. This locks the contract in.
 */
import { describe, expect, it } from 'vitest';
import { validateNutritionPlanBody } from '../../services/nutrition/nutritionPlanValidation.mjs';

const builderPayload = () => ({
  planName: 'Cut Phase A',
  dailyCalories: 2100,
  proteinGrams: 150,
  carbsGrams: 210,
  fatGrams: 60,
  mealsJson: [
    { name: 'Breakfast', time: '08:00', foods: [{ name: 'Oats', portion: '1 serving' }] },
  ],
  groceryListJson: ['Oats', 'Chicken breast'],
  notes: 'High-protein week.',
  startDate: '2026-08-04',
  endDate: null,
});

describe('validateNutritionPlanBody (S0.2)', () => {
  it('accepts the real Plan Builder payload shape unchanged', () => {
    const result = validateNutritionPlanBody(builderPayload());
    expect(result.ok).toBe(true);
    expect(result.plan.planName).toBe('Cut Phase A');
    expect(result.plan.dailyCalories).toBe(2100);
    expect(result.plan.mealsJson).toHaveLength(1);
    expect(result.plan.startDate).toBeInstanceOf(Date);
  });

  it('rejects NaN and non-numeric macro fields instead of letting them 500 in the DB', () => {
    const result = validateNutritionPlanBody({ ...builderPayload(), proteinGrams: Number('abc') });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/proteinGrams/);

    const stringy = validateNutritionPlanBody({ ...builderPayload(), dailyCalories: 'lots' });
    expect(stringy.ok).toBe(false);
  });

  it('rejects out-of-range numbers (DECIMAL(6,2) ceiling, negative values)', () => {
    expect(validateNutritionPlanBody({ ...builderPayload(), fatGrams: 10000 }).ok).toBe(false);
    expect(validateNutritionPlanBody({ ...builderPayload(), carbsGrams: -5 }).ok).toBe(false);
    expect(validateNutritionPlanBody({ ...builderPayload(), dailyCalories: 20001 }).ok).toBe(false);
  });

  it('caps JSONB size and shape', () => {
    const huge = validateNutritionPlanBody({
      ...builderPayload(),
      mealsJson: [{ name: 'x'.repeat(40 * 1024), time: '', foods: [] }],
    });
    expect(huge.ok).toBe(false);
    expect(huge.errors.join(' ')).toMatch(/32KB/);

    const wrongShape = validateNutritionPlanBody({ ...builderPayload(), mealsJson: 'not-an-array' });
    expect(wrongShape.ok).toBe(false);

    const tooManyTags = validateNutritionPlanBody({
      ...builderPayload(),
      allergies: Array.from({ length: 51 }, (_, i) => `a${i}`),
    });
    expect(tooManyTags.ok).toBe(false);
  });

  it('never copies protected or unknown attributes from the body', () => {
    const result = validateNutritionPlanBody({
      ...builderPayload(),
      id: 999,
      userId: 123,
      clientId: 456,
      createdBy: 777,
      source: 'ai_generated',
      status: 'archived',
      masterPromptVersion: '9.9',
      anythingElse: 'nope',
    });
    expect(result.ok).toBe(true);
    for (const key of ['id', 'userId', 'clientId', 'createdBy', 'source', 'status', 'masterPromptVersion', 'anythingElse']) {
      expect(result.plan).not.toHaveProperty(key);
    }
  });

  it('rejects endDate before startDate and invalid date strings', () => {
    expect(validateNutritionPlanBody({ ...builderPayload(), startDate: '2026-08-04', endDate: '2026-08-01' }).ok).toBe(false);
    expect(validateNutritionPlanBody({ ...builderPayload(), startDate: 'not-a-date' }).ok).toBe(false);
  });

  it('treats absent optional fields as omitted so model defaults apply', () => {
    const result = validateNutritionPlanBody({});
    expect(result.ok).toBe(true);
    expect(result.plan).toEqual({});
  });
});
