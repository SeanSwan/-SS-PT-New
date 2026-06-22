/**
 * mealPhotoLog.test - Slice 1.4 self-serve approve & save logic.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MEAL_TYPE_OPTIONS,
  normalizeMealType,
  cleanMacro,
  toMacroPayload,
  buildMacroPayloads,
  summarizeSave,
  buildSearchMacroPayload,
  todayIso,
  voiceDraftToMealPlan,
} from './mealPhotoLog';
import {
  buildMacroDraftsFromMealPlan,
  buildMacroSavePayload,
} from './MealPlanApproveSavePanel.logic';

afterEach(() => {
  vi.useRealTimers();
});

describe('normalizeMealType', () => {
  it('passes through valid route meal types (case-insensitive)', () => {
    expect(normalizeMealType('Breakfast')).toBe('breakfast');
    expect(normalizeMealType('dinner')).toBe('dinner');
  });
  it('falls back to snack for values the /api/macros route rejects', () => {
    expect(normalizeMealType('pre_workout')).toBe('snack'); // model has it; route does not
    expect(normalizeMealType('')).toBe('snack');
    expect(normalizeMealType(undefined)).toBe('snack');
  });
  it('exposes exactly the route-allowed set', () => {
    expect([...MEAL_TYPE_OPTIONS]).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
  });
});

describe('cleanMacro', () => {
  it('keeps non-negative numbers, rounds to 1dp', () => {
    expect(cleanMacro(45.06)).toBe(45.1);
    expect(cleanMacro('120')).toBe(120);
  });
  it('returns null (never a guessed 0) for blank/invalid/negative', () => {
    expect(cleanMacro('')).toBeNull();
    expect(cleanMacro(null)).toBeNull();
    expect(cleanMacro('abc')).toBeNull();
    expect(cleanMacro(-5)).toBeNull();
  });
  it('rejects array/object/hex/exponent coercion so malformed macros do not look real', () => {
    expect(cleanMacro(['120'])).toBeNull();
    expect(cleanMacro({ valueOf: () => 120 })).toBeNull();
    expect(cleanMacro('0x10')).toBeNull();
    expect(cleanMacro('1e2')).toBeNull();
  });
});

describe('toMacroPayload', () => {
  it('uses the local calendar date for default photo macro payload dates', () => {
    const lateLocalDay = new Date(2026, 0, 5, 23, 45);

    expect(todayIso(lateLocalDay)).toBe('2026-01-05');
    expect(toMacroPayload(
      { name: 'Chicken bowl', calories: 640, protein: 45, carbs: 70, fat: 18 },
      { mealType: 'lunch' },
      lateLocalDay,
    ).date).toBe('2026-01-05');
  });

  it('builds a self-serve estimate payload (verified:false, food-scanner source)', () => {
    const p = toMacroPayload(
      { name: '  Chicken burrito bowl ', calories: 650, protein: 45, carbs: 70, fat: 18, confidence: 0.7 },
      { mealType: 'Lunch', date: '2026-06-19' },
    );
    expect(p).toEqual({
      date: '2026-06-19',
      mealType: 'lunch',
      description: 'Chicken burrito bowl',
      calories: 650, protein: 45, carbs: 70, fat: 18, fiber: null,
      source: 'food-scanner',
      verified: false,
    });
  });
  it('never emits an empty description', () => {
    expect(toMacroPayload({ name: '   ', calories: null, protein: null, carbs: null, fat: null }, { mealType: 'snack' }).description)
      .toBe('Logged meal item');
  });
});

describe('buildMacroPayloads', () => {
  it('drops removed/blank rows and maps the rest', () => {
    const payloads = buildMacroPayloads(
      [
        { name: 'banana', calories: 105, protein: 1, carbs: 27, fat: 0 },
        { name: '', calories: 999, protein: 0, carbs: 0, fat: 0 },
      ],
      { mealType: 'snack', date: '2026-06-19' },
    );
    expect(payloads).toHaveLength(1);
    expect(payloads[0].description).toBe('banana');
    expect(payloads[0].verified).toBe(false);
  });

  it('honors per-row meal types when building photo macro payloads', () => {
    const payloads = buildMacroPayloads(
      [
        { name: 'eggs', mealType: 'breakfast', calories: 140, protein: 12, carbs: 1, fat: 10 },
        { name: 'rice', mealType: 'dinner', calories: 250, protein: 5, carbs: 50, fat: 1 },
      ],
      { mealType: 'snack', date: '2026-06-19' },
    );

    expect(payloads.map((payload) => payload.mealType)).toEqual(['breakfast', 'dinner']);
  });
});

describe('summarizeSave', () => {
  it('counts saved vs failed', () => {
    expect(summarizeSave([{ ok: true }, { ok: false }, { ok: true }])).toEqual({ saved: 2, failed: 1, total: 3 });
  });
});

describe('buildSearchMacroPayload (Slice 1.5)', () => {
  it('uses the local calendar date for default searched-food macro payload dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 23, 45));

    expect(buildSearchMacroPayload(
      { name: 'Chicken Breast', brand: 'USDA', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { mealType: 'Lunch' },
    ).date).toBe('2026-01-05');
  });

  it('builds a route-valid self-log payload from a searched DB food', () => {
    expect(buildSearchMacroPayload(
      { name: 'Chicken Breast', brand: 'USDA', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { mealType: 'Lunch', date: '2026-06-20' },
    )).toEqual({
      date: '2026-06-20',
      mealType: 'lunch',
      description: 'Chicken Breast (USDA)',
      calories: 165, protein: 31, carbs: 0, fat: 4,
      source: 'usda_lookup',
      verified: false,
    });
  });

  it('falls back to a safe description + snack, never a guessed 0 macro', () => {
    const p = buildSearchMacroPayload({ name: '   ' }, { mealType: 'not-a-real-type' });
    expect(p.description).toBe('Logged food');
    expect(p.mealType).toBe('snack');
    expect(p.calories).toBeNull();
    expect(p.verified).toBe(false);
  });
});

describe('voiceDraftToMealPlan (Slice 1.6)', () => {
  it('adapts parsed voice meals into the MealPlanApproveSavePanel input, preserving null macros + per-meal type', () => {
    const plan = voiceDraftToMealPlan([
      { mealType: 'lunch', description: 'chicken burrito bowl', calories: 650, protein: 45, carbs: 70, fat: 18 },
      { mealType: 'snack', description: 'banana', calories: null, protein: null, carbs: null, fat: null },
    ]);
    expect(plan.meals).toHaveLength(2);
    expect(plan.meals![0]).toMatchObject({ mealType: 'lunch', name: 'chicken burrito bowl', totalCalories: 650 });
    expect(plan.meals![0].foods![0]).toMatchObject({ calories: 650, protein: 45 }); // food row carries macros; name blank by design
    expect(plan.meals![1].totalCalories).toBeNull();
    expect(plan.meals![1].foods![0].calories).toBeNull();
  });

  it('handles an empty/undefined draft safely', () => {
    expect(voiceDraftToMealPlan(undefined).meals).toEqual([]);
    expect(voiceDraftToMealPlan([{ description: '' }]).meals![0].name).toBe('Logged meal');
  });

  // SCD-2: the parser estimates fiber/sugar/sodium (the DB even auto-flags high sodium/sugar);
  // the adapter must carry them through so they are not silently dropped before the save.
  it('carries fiber / sugar / sodium through to the food row (null-preserving)', () => {
    const plan = voiceDraftToMealPlan([
      { mealType: 'dinner', description: 'ramen', calories: 500, protein: 18, carbs: 60, fat: 16, fiber: 4, sugar: 6, sodium: 1800 },
      { mealType: 'snack', description: 'apple', calories: 95, protein: 0, carbs: 25, fat: 0, fiber: null, sugar: null, sodium: null },
    ]);
    expect(plan.meals![0].foods![0]).toMatchObject({ fiber: 4, sugar: 6, sodium: 1800 });
    expect(plan.meals![1].foods![0]).toMatchObject({ fiber: null, sugar: null, sodium: null });
  });
});

describe('self-serve verified:false invariant', () => {
  it('marks photo, search, generated-plan, and voice-adapted macro payloads as unverified estimates', () => {
    const photo = toMacroPayload(
      { name: 'Turkey sandwich', calories: 410, protein: 28, carbs: 44, fat: 12 },
      { mealType: 'lunch', date: '2026-06-20' },
    );
    const search = buildSearchMacroPayload(
      { name: 'Greek Yogurt', brand: 'USDA', calories: 100, protein: 17, carbs: 6, fat: 0 },
      { mealType: 'snack', date: '2026-06-20' },
    );
    const [planDraft] = buildMacroDraftsFromMealPlan({
      meals: [{
        mealType: 'dinner',
        name: 'Chicken plate',
        foods: [{ name: 'Chicken', calories: 220, protein: 40, carbs: 0, fat: 5 }],
      }],
    });
    const [voiceDraft] = buildMacroDraftsFromMealPlan(voiceDraftToMealPlan([
      { mealType: 'breakfast', description: 'eggs and toast', calories: 420, protein: 24, carbs: 34, fat: 18 },
    ]));

    const payloads = [
      photo,
      search,
      buildMacroSavePayload(planDraft, '2026-06-20'),
      buildMacroSavePayload(voiceDraft, '2026-06-20', 'voice'),
    ];

    expect(payloads).toHaveLength(4);
    expect(payloads.map((payload) => payload.source)).toEqual(['food-scanner', 'usda_lookup', 'ai-chat', 'voice']);
    payloads.forEach((payload) => {
      expect(payload.verified).toBe(false);
    });
  });
});
