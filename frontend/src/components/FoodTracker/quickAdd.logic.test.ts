/**
 * FILE: quickAdd.logic.test.ts
 * PURPOSE: Locks the QuickAddFab data logic — recent-meal loading order and
 *          the merged "Repeat yesterday" draft built on the existing
 *          repeat-meal converter.
 */
import { describe, expect, it } from 'vitest';
import type { RepeatMacroEntry } from '../DashBoard/workspaces/NutritionTodayPanel.repeatMeal';
import {
  RECENT_MEAL_LIMIT,
  buildRepeatYesterdayDraft,
  loadQuickAddData,
} from './quickAdd.logic';

const entry = (id: number, description: string, extra: Partial<RepeatMacroEntry> = {}): RepeatMacroEntry => ({
  id,
  description,
  mealType: 'lunch',
  calories: 400,
  ...extra,
});

const apiWith = (byDate: Record<string, RepeatMacroEntry[]>, calls: string[] = []) => ({
  get: async (url: string) => {
    calls.push(url);
    const date = url.split('date=')[1];
    return { data: { entries: byDate[date] || [] } };
  },
});

describe('quickAdd.logic (4C)', () => {
  it('loads today + yesterday and lists most recent repeatable meals first', async () => {
    const fromDate = new Date(2026, 7, 4, 12, 0); // local Aug 4 2026
    const api = apiWith({
      '2026-08-04': [entry(1, 'Oats'), entry(2, 'Bowl'), { id: 3, description: '  ' }],
      '2026-08-03': [entry(4, 'Salmon'), entry(5, 'Rice')],
    });

    const data = await loadQuickAddData(api, fromDate);

    expect(data.yesterday.map((e) => e.description)).toEqual(['Salmon', 'Rice']);
    // Most recent first: today's last entry leads; blank descriptions dropped.
    expect(data.recent.map((e) => e.description)).toEqual(['Bowl', 'Oats', 'Rice', 'Salmon']);
    expect(data.recent.length).toBeLessThanOrEqual(RECENT_MEAL_LIMIT);
  });

  it('caps the recent list and survives a failing day fetch', async () => {
    const fromDate = new Date(2026, 7, 4, 12, 0);
    const today = Array.from({ length: 8 }, (_, i) => entry(i, `Meal ${i}`));
    const api = {
      get: async (url: string) => {
        if (url.includes('2026-08-03')) throw new Error('offline');
        return { data: { entries: today } };
      },
    };

    const data = await loadQuickAddData(api, fromDate);
    expect(data.yesterday).toEqual([]);
    expect(data.recent).toHaveLength(RECENT_MEAL_LIMIT);
    expect(data.recent[0].description).toBe('Meal 7');
  });

  it('returns null for repeat-yesterday when nothing is repeatable', () => {
    expect(buildRepeatYesterdayDraft([])).toBeNull();
    expect(buildRepeatYesterdayDraft([{ description: '   ' }])).toBeNull();
  });

  it('keeps the single-entry draft from the existing converter untouched', () => {
    const draft = buildRepeatYesterdayDraft([entry(4, 'Salmon')]);
    expect(draft).not.toBeNull();
    expect(draft?.foods).toHaveLength(1);
    expect(draft?.foods[0].description).toBe('Salmon');
    expect(draft?.verified).toBe(false);
  });

  it('merges all of yesterday into one multi-food review draft with unique food ids', () => {
    const draft = buildRepeatYesterdayDraft([
      entry(4, 'Salmon', { protein: 30 }),
      entry(5, 'Rice', { carbs: 50 }),
      { description: 'Mystery snack' }, // no id — must still get a unique food id
    ]);

    expect(draft).not.toBeNull();
    expect(draft?.foods).toHaveLength(3);
    expect(draft?.foods.map((f) => f.description)).toEqual(['Salmon', 'Rice', 'Mystery snack']);
    const ids = (draft?.foods || []).map((f) => f.id);
    expect(new Set(ids).size).toBe(3);
    // Repeats are never pre-verified — the drawer review stays mandatory.
    expect(draft?.verified).toBe(false);
    expect(draft?.foods.every((f) => f.verified === false)).toBe(true);
  });
});
