/**
 * FILE: useHomeNutritionAction.test.tsx
 * PURPOSE: Ensures Home only surfaces nutrition guidance from loaded macro/hydration truth.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHomeNutritionAction } from './useHomeNutritionAction';

const mocks = vi.hoisted(() => ({
  macro: {
    summary: {
      date: '2026-06-21',
      totalCalories: 620,
      totalProtein: 38,
      totalCarbs: 70,
      totalFat: 18,
      totalFiber: 8,
      totalSugar: 22,
      totalSodium: 700,
      mealCount: 1,
      meals: {},
    },
    loading: false,
    error: null as string | null,
    refetch: vi.fn(),
  },
  hydration: {
    filled: 2,
    dailyGoal: 8,
    glassOz: 8,
    loading: false,
    updateFilled: vi.fn(),
    resetToday: vi.fn(),
  },
}));

vi.mock('../../../hooks/useMacroSummary', () => ({
  useMacroSummary: () => mocks.macro,
}));

vi.mock('../../../hooks/useHydration', () => ({
  useHydration: () => mocks.hydration,
}));

describe('useHomeNutritionAction', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.macro.summary = {
      date: '2026-06-21',
      totalCalories: 620,
      totalProtein: 38,
      totalCarbs: 70,
      totalFat: 18,
      totalFiber: 8,
      totalSugar: 22,
      totalSodium: 700,
      mealCount: 1,
      meals: {},
    };
    mocks.macro.loading = false;
    mocks.macro.error = null;
    mocks.hydration.filled = 2;
    mocks.hydration.dailyGoal = 8;
    mocks.hydration.glassOz = 8;
    mocks.hydration.loading = false;
  });

  it('returns a nutrition next action from real macro and persisted hydration state', () => {
    const { result } = renderHook(() => useHomeNutritionAction());

    expect(result.current).toEqual({
      title: 'Add a water check-in before the next meal.',
      copy: '2 of 8 glasses are logged. Hydration is the easiest win to tighten today.',
      target: 'hydration',
      label: 'Open Nutrition Today',
    });
  });

  it('does not ask for hydration when persisted hydration is already above goal', () => {
    mocks.hydration.filled = 9;
    mocks.hydration.dailyGoal = 8;

    const { result } = renderHook(() => useHomeNutritionAction());

    expect(result.current).toMatchObject({
      title: 'Capture the next meal while it is fresh.',
      target: 'voice',
      label: 'Open Nutrition Today',
    });
    expect(result.current?.copy).not.toMatch(/water check-in/i);
  });

  it('withholds nutrition guidance while macro or hydration truth is loading', () => {
    mocks.hydration.loading = true;

    const { result } = renderHook(() => useHomeNutritionAction());

    expect(result.current).toBeNull();
  });

  it('degrades to a numberless generic invitation on macro errors — no false zeroes, no vanishing', () => {
    // 4D fix (2026-08-04): the old contract returned null here, which silently
    // ERASED nutrition from Home on any transient fetch failure and trained
    // users to ignore the slot. The false-zeroes concern is still honored:
    // the fallback carries NO numeric claims at all.
    mocks.macro.summary = null;
    mocks.macro.error = 'Macro summary unavailable. Try refreshing your dashboard.';

    const { result } = renderHook(() => useHomeNutritionAction());

    expect(result.current).not.toBeNull();
    expect(result.current?.target).toBe('log');
    expect(`${result.current?.title} ${result.current?.copy}`).not.toMatch(/\d/);
  });

  it('withholds Home nutrition guidance when Gentle Mode is enabled', () => {
    localStorage.setItem('ss-nutrition-gentle-mode', 'true');

    const { result } = renderHook(() => useHomeNutritionAction());

    expect(result.current).toBeNull();
  });
});
