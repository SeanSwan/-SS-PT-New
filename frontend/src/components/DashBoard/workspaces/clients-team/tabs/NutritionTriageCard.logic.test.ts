import { describe, expect, it } from 'vitest';
import {
  buildNutritionTriage,
  type MacroSummary,
  type WeeklyMacroDay,
} from './NutritionTriageCard.logic';

const summary = (overrides: Partial<MacroSummary> = {}): MacroSummary => ({
  date: '2026-06-20',
  totalCalories: 1820,
  totalProtein: 112,
  totalCarbs: 178,
  totalFat: 64,
  totalFiber: 18,
  totalSugar: 42,
  totalSodium: 2100,
  mealCount: 3,
  meals: {},
  ...overrides,
});

const weeklyDays: WeeklyMacroDay[] = [
  { date: '2026-06-14', calories: 1700, protein: 92, carbs: 160, fat: 55, mealCount: 3 },
  { date: '2026-06-15', calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 },
  { date: '2026-06-16', calories: 1850, protein: 101, carbs: 175, fat: 61, mealCount: 3 },
  { date: '2026-06-17', calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 },
  { date: '2026-06-18', calories: 1930, protein: 118, carbs: 184, fat: 64, mealCount: 4 },
  { date: '2026-06-19', calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 },
  { date: '2026-06-20', calories: 1820, protein: 112, carbs: 178, fat: 64, mealCount: 3 },
];

describe('NutritionTriageCard logic', () => {
  it('summarizes meals, weekly rhythm, and calm coach-facing flags', () => {
    const triage = buildNutritionTriage({
      summary: summary({ totalSodium: 2450, totalSugar: 56 }),
      weeklyDays,
    });

    expect(triage.statusLabel).toBe('3 meals today');
    expect(triage.weeklyLabel).toBe('4 of 7 days logged');
    expect(triage.averageLabel).toBe('1,825 avg cal');
    expect(triage.flags.map((flag) => flag.id)).toEqual(['sodium', 'sugar']);
    expect(triage.flags.map((flag) => flag.label)).toEqual([
      'Sodium attention',
      'Sugar attention',
    ]);
  });

  it('keeps a no-meal day honest without pretending there was a save', () => {
    const triage = buildNutritionTriage({
      summary: summary({ mealCount: 0, totalCalories: 0, totalProtein: 0 }),
      weeklyDays: weeklyDays.slice(0, 3),
    });

    expect(triage.statusLabel).toBe('No meals logged today');
    expect(triage.flags[0]).toMatchObject({
      id: 'no-meals',
      label: 'No meals logged today',
      tone: 'warning',
    });
  });

  it('rejects coercive summary and weekly values before coach-facing triage copy', () => {
    const triage = buildNutritionTriage({
      summary: summary({
        mealCount: ['3'] as unknown as number,
        totalProtein: { valueOf: () => 112 } as unknown as number,
        totalFiber: '1e2' as unknown as number,
        totalSodium: '2e4' as unknown as number,
        totalSugar: ['70'] as unknown as number,
      }),
      weeklyDays: [{
        date: '2026-06-20',
        calories: ['1800'] as unknown as number,
        protein: '1e2' as unknown as number,
        carbs: { valueOf: () => 176 } as unknown as number,
        fat: Number.POSITIVE_INFINITY,
        mealCount: ['3'] as unknown as number,
      }],
    });

    expect(triage).toMatchObject({
      statusLabel: 'No meals logged today',
      proteinLabel: '0g protein',
      fiberLabel: '0g fiber',
      weeklyLabel: '0 of 7 days logged',
      averageLabel: 'No weekly average yet',
    });
    expect(triage.flags.map((flag) => flag.id)).toEqual(['no-meals']);
  });
});
