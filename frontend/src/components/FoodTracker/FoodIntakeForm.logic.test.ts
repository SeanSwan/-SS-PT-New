import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildMacroPayload,
  createEmptyFoodItem,
  getLocalDateString,
  savedMacroEntryFromResponse,
} from './FoodIntakeForm.logic';

describe('FoodIntakeForm logic', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the local calendar day for manual macro saves', () => {
    const localLateNight = new Date(2026, 0, 2, 23, 45, 0);

    expect(getLocalDateString(localLateNight)).toBe('2026-01-02');
  });

  it('builds manual macro payloads as unverified client estimates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 2, 23, 45, 0));

    const payload = buildMacroPayload('dinner', [{
      ...createEmptyFoodItem('meal-1'),
      name: ' Chicken ',
      portion: ' 6 oz ',
      calories: 320,
      protein: 42,
      carbs: -1,
      fat: Number.NaN,
    }]);

    expect(payload).toMatchObject({
      date: '2026-01-02',
      mealType: 'dinner',
      description: 'Chicken (6 oz)',
      calories: 320,
      protein: 42,
      carbs: 0,
      fat: 0,
      source: 'manual',
      verified: false,
    });
  });

  it('rejects coercive macro values before building manual save payloads', () => {
    const payload = buildMacroPayload('snack', [{
      ...createEmptyFoodItem('meal-1'),
      name: 'Protein bar',
      portion: '1 bar',
      calories: ['450'] as unknown as number,
      protein: '1e2' as unknown as number,
      carbs: { valueOf: () => 30 } as unknown as number,
      fat: Number.POSITIVE_INFINITY,
    }]);

    expect(payload).toMatchObject({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      source: 'manual',
      verified: false,
    });
  });

  it('falls back to submitted macro values when saved-row response numbers are malformed', () => {
    const fallback = buildMacroPayload('lunch', [{
      ...createEmptyFoodItem('meal-1'),
      name: 'Chicken bowl',
      portion: '1 bowl',
      calories: 520,
      protein: 42,
      carbs: 55,
      fat: 14,
    }]);

    const savedEntry = savedMacroEntryFromResponse({
      id: 42,
      mealType: 'dinner',
      calories: ['900'],
      protein: '1e2',
      carbs: { valueOf: () => 80 },
      fat: Number.NaN,
      source: 'ai_chat',
      verified: true,
    }, fallback);

    expect(savedEntry).toMatchObject({
      id: 42,
      mealType: 'dinner',
      calories: 520,
      protein: 42,
      carbs: 55,
      fat: 14,
      source: 'manual',
      verified: false,
    });
  });
});
