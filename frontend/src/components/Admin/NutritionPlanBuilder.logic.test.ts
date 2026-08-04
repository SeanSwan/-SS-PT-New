/**
 * NutritionPlanBuilder.logic.test.ts
 * ==================================
 * Phase 4E: payload contract + backend 400 `{ errors: [...] }` inline mapping.
 * The POST /api/nutrition/:clientId body shape (mealsJson/groceryListJson/etc.)
 * is validated server-side by nutritionPlanValidation + nutritionTargetService;
 * these tests lock the frontend half of that contract.
 */

import { describe, expect, it } from 'vitest';
import {
  buildMealsPayload,
  buildNutritionPayload,
  generateGroceryListText,
  mapExistingPlanMeals,
  mapNutritionApiErrors,
  parseList,
} from './NutritionPlanBuilder.logic';

describe('parseList', () => {
  it('splits on commas and newlines, trims, and drops empties', () => {
    expect(parseList('oats, blueberries\nalmond butter,  ,\n')).toEqual([
      'oats',
      'blueberries',
      'almond butter',
    ]);
  });
});

describe('buildNutritionPayload', () => {
  const input = {
    planName: '  Cut Phase ',
    dailyCalories: '2200',
    proteinGrams: '150',
    carbsGrams: '',
    fatGrams: 'nope',
    notes: ' hydrate ',
    groceryListText: 'oats\neggs',
    startDate: '2026-08-04',
    endDate: '',
    meals: [
      { name: 'Breakfast', time: '7:00 AM', items: 'oats, eggs' },
      { name: '   ', time: '', items: 'ignored — unnamed meal' },
    ],
  };

  it('produces the POST /api/nutrition/:clientId body contract', () => {
    const payload = buildNutritionPayload(input);

    expect(payload).toEqual({
      planName: 'Cut Phase',
      dailyCalories: 2200,
      proteinGrams: 150,
      carbsGrams: 0,
      fatGrams: 0,
      mealsJson: [
        {
          name: 'Breakfast',
          time: '7:00 AM',
          foods: [
            { name: 'oats', portion: '1 serving' },
            { name: 'eggs', portion: '1 serving' },
          ],
        },
      ],
      groceryListJson: ['oats', 'eggs'],
      notes: 'hydrate',
      startDate: '2026-08-04',
      endDate: null,
    });
  });

  it('defaults startDate to today and endDate to null when blank', () => {
    const payload = buildNutritionPayload({ ...input, startDate: '', endDate: '' });
    expect(payload.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.endDate).toBeNull();
  });
});

describe('buildMealsPayload', () => {
  it('drops unnamed meals entirely', () => {
    expect(buildMealsPayload([{ name: ' ', time: '', items: 'x' }])).toEqual([]);
  });
});

describe('generateGroceryListText', () => {
  it('dedupes ingredients across meals', () => {
    const text = generateGroceryListText([
      { name: 'A', time: '', items: 'oats, eggs' },
      { name: 'B', time: '', items: 'eggs\nspinach' },
    ]);
    expect(text.split('\n')).toEqual(['oats', 'eggs', 'spinach']);
  });
});

describe('mapExistingPlanMeals', () => {
  it('maps plan meals back into drafts and tolerates missing foods', () => {
    expect(
      mapExistingPlanMeals([
        { name: 'Lunch', time: '12:00', foods: [{ name: 'rice' }, { name: 'chicken' }] },
        { name: 'Snack' },
      ]),
    ).toEqual([
      { name: 'Lunch', time: '12:00', items: 'rice\nchicken' },
      { name: 'Snack', time: '', items: '' },
    ]);
  });

  it('returns [] for absent input', () => {
    expect(mapExistingPlanMeals(undefined)).toEqual([]);
  });
});

describe('mapNutritionApiErrors', () => {
  it('maps field-prefixed backend errors onto their fields', () => {
    const mapped = mapNutritionApiErrors([
      'proteinGrams must be between 0 and 500',
      'dailyCalories must be a number',
      'proteinGrams must be a number',
    ]);

    expect(mapped.fields.proteinGrams).toEqual([
      'proteinGrams must be between 0 and 500',
      'proteinGrams must be a number',
    ]);
    expect(mapped.fields.dailyCalories).toEqual(['dailyCalories must be a number']);
    expect(mapped.form).toEqual([]);
  });

  it('routes the cross-field 4/4/9 macro check to form-level errors', () => {
    const message = 'macro grams imply more calories than dailyCalories allows (4/4/9 check)';
    const mapped = mapNutritionApiErrors([message]);
    expect(mapped.fields).toEqual({});
    expect(mapped.form).toEqual([message]);
  });

  it('tolerates garbage input shapes without throwing', () => {
    expect(mapNutritionApiErrors(undefined)).toEqual({ fields: {}, form: [] });
    expect(mapNutritionApiErrors('boom')).toEqual({ fields: {}, form: [] });
    expect(mapNutritionApiErrors([null, 42, '  '])).toEqual({ fields: {}, form: [] });
  });

  it('does not confuse startDate/endDate prefixes with unrelated messages', () => {
    const mapped = mapNutritionApiErrors(['endDate must not be before startDate']);
    expect(mapped.fields.endDate).toEqual(['endDate must not be before startDate']);
  });
});
