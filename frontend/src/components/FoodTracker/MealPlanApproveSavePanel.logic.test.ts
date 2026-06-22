import { describe, expect, it } from 'vitest';
import {
  buildMacroDraftsFromMealPlan,
  buildMacroSavePayload,
  validateMacroDrafts,
} from './MealPlanApproveSavePanel.logic';

describe('MealPlanApproveSavePanel logic', () => {
  it('converts generated meal-plan meals into editable macro drafts', () => {
    const drafts = buildMacroDraftsFromMealPlan({
      meals: [
        {
          mealType: 'AM snack',
          name: 'Greek yogurt bowl',
          foods: [
            { name: 'Greek yogurt', serving: '1 cup', calories: 150, protein: 22, carbs: 8, fat: 0 },
            { name: 'Blueberries', serving: '1/2 cup', calories: 40, protein: 1, carbs: 10, fat: 0 },
          ],
          totalCalories: 205,
        },
      ],
    });

    expect(drafts).toEqual([
      expect.objectContaining({
        mealType: 'snack',
        description: 'Greek yogurt bowl: Greek yogurt (1 cup), Blueberries (1/2 cup)',
        calories: 205,
        protein: 23,
        carbs: 18,
        fat: 0,
      }),
    ]);
  });

  it('builds the client macro logging payload for the existing POST /api/macros route', () => {
    const [draft] = buildMacroDraftsFromMealPlan({
      meals: [
        {
          mealType: 'lunch',
          name: 'Chicken rice bowl',
          foods: [{ name: 'Chicken breast', serving: '5 oz', calories: 230, protein: 43, carbs: 0, fat: 5 }],
          totalCalories: 230,
        },
      ],
    });

    const payload = buildMacroSavePayload(draft, '2026-06-19');

    expect(payload).toEqual({
      date: '2026-06-19',
      mealType: 'lunch',
      description: 'Chicken rice bowl: Chicken breast (5 oz)',
      calories: 230,
      protein: 43,
      carbs: 0,
      fat: 5,
      fiber: null,
      sugar: null,
      sodium: null,
      items: [{ name: 'Chicken breast', serving: '5 oz', calories: 230, protein: 43, carbs: 0, fat: 5, fiber: null, sugar: null, sodium: null }],
      source: 'ai-chat',
      verified: false,
    });
  });

  it('rejects array/object/hex/exponent macro coercion in generated meal plans', () => {
    const [draft] = buildMacroDraftsFromMealPlan({
      meals: [
        {
          mealType: 'lunch',
          name: 'Malformed row',
          foods: [{
            name: 'Injected food',
            calories: ['220'] as unknown as number,
            protein: '0x10' as unknown as number,
            carbs: '1e2' as unknown as number,
            fat: { valueOf: () => 12 } as unknown as number,
          }],
        },
      ],
    });

    expect(buildMacroSavePayload(draft, '2026-06-19')).toMatchObject({
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
    });
  });

  // SCD-2: fiber/sugar/sodium must survive draft -> payload (backend persists + auto-flags them).
  it('sums and carries fiber / sugar / sodium into the save payload', () => {
    const [draft] = buildMacroDraftsFromMealPlan({
      meals: [
        {
          mealType: 'dinner',
          name: 'Salmon plate',
          foods: [
            { name: 'Salmon', serving: '6 oz', calories: 350, protein: 40, carbs: 0, fat: 20, fiber: 0, sugar: 0, sodium: 90 },
            { name: 'Brown rice', serving: '1 cup', calories: 215, protein: 5, carbs: 45, fat: 2, fiber: 4, sugar: 1, sodium: 10 },
          ],
          totalCalories: 565,
        },
      ],
    });

    const payload = buildMacroSavePayload(draft, '2026-06-19');

    expect(payload).toMatchObject({ fiber: 4, sugar: 1, sodium: 100 });
  });

  it('keeps calorie/protein/carb/fat behavior unchanged while carrying extra SCD-2 macros', () => {
    const [draft] = buildMacroDraftsFromMealPlan({
      meals: [
        {
          mealType: 'lunch',
          name: 'Rice bowl',
          foods: [
            { name: 'Rice', calories: 200, protein: 4, carbs: 45, fat: 1, fiber: 2, sugar: 0, sodium: 5 },
            { name: 'Chicken', calories: 180, protein: 34, carbs: 0, fat: 4, fiber: 0, sugar: 0, sodium: 120 },
          ],
          totalCalories: 410,
        },
      ],
    });

    expect(buildMacroSavePayload(draft, '2026-06-19')).toMatchObject({
      calories: 410,
      protein: 38,
      carbs: 45,
      fat: 5,
      fiber: 2,
      sugar: 0,
      sodium: 125,
    });
  });

  it('rejects empty editable meal rows before saving', () => {
    const result = validateMacroDrafts([
      {
        id: 'meal-1',
        mealType: 'snack',
        description: '   ',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: null,
        sugar: null,
        sodium: null,
        items: [],
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.message).toBe('Each meal needs a food description before saving.');
  });
});
