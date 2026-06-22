import { describe, expect, it } from 'vitest';
import {
  calculateNutritionStreak,
  buildRepeatMacroPayload,
  buildNutritionInsights,
  getHydrationProgress,
  getMacroMetrics,
  getNextNutritionAction,
  daysAgoIso,
  todayIso,
} from './NutritionTodayPanel.logic';
import { getNutritionCareMilestone } from './NutritionTodayPanel.viewModel';

describe('NutritionTodayPanel logic', () => {
  it('uses local calendar dates for Today diary query helpers', () => {
    const lateLocalDay = new Date(2026, 0, 5, 23, 45);

    expect(todayIso(lateLocalDay)).toBe('2026-01-05');
    expect(daysAgoIso(0, lateLocalDay)).toBe('2026-01-05');
    expect(daysAgoIso(1, lateLocalDay)).toBe('2026-01-04');
  });

  it('calculates a current nutrition streak only across consecutive logged days', () => {
    expect(calculateNutritionStreak([
      { date: '2026-06-18', mealCount: 1 },
      { date: '2026-06-19', mealCount: 2 },
      { date: '2026-06-20', mealCount: 1 },
    ], '2026-06-20')).toBe(3);

    expect(calculateNutritionStreak([
      { date: '2026-06-18', mealCount: 1 },
      { date: '2026-06-20', mealCount: 1 },
    ], '2026-06-20')).toBe(1);
  });

  it('rejects fractional meal counts before showing meals or weekly logged days', () => {
    expect(calculateNutritionStreak([
      { date: '2026-06-20', mealCount: 1.5, calories: 0 },
    ], '2026-06-20')).toBe(0);

    expect(getNextNutritionAction(
      { mealCount: 1.5 },
      { filled: 8, dailyGoal: 8 },
    ).target).toBe('log');

    const insights = buildNutritionInsights({
      summary: { totalProtein: null, totalFiber: null, mealCount: 1.5 },
      hydration: { filled: 8, dailyGoal: 8 },
      weekDays: [{ date: '2026-06-20', mealCount: 1.5, calories: 0 }],
    });

    expect(insights.map((insight) => insight.copy).join(' ')).toContain('0 of the last 7 days');
  });

  it('normalizes macro and hydration values without fabricating calorie targets', () => {
    expect(getMacroMetrics({
      totalProtein: 52.4,
      totalCarbs: 74.2,
      totalFat: 21.7,
      totalFiber: null,
    }).map((metric) => metric.value)).toEqual(['52g', '74g', '22g', '0g']);

    expect(getHydrationProgress({ filled: 3, dailyGoal: 8 })).toEqual({
      filled: 3,
      dailyGoal: 8,
      percent: 38,
      ounces: 24,
    });

    expect(getHydrationProgress({ filled: 3, dailyGoal: 8, glassOz: 10 })).toEqual({
      filled: 3,
      dailyGoal: 8,
      percent: 38,
      ounces: 30,
    });

    expect(getHydrationProgress({ filled: 9, dailyGoal: 8 })).toEqual({
      filled: 9,
      dailyGoal: 8,
      percent: 100,
      ounces: 72,
    });
  });

  it('rejects non-primitive or non-decimal macro values instead of rendering credible totals', () => {
    expect(getMacroMetrics({
      totalProtein: ['52'] as unknown as number,
      totalCarbs: '0x10' as unknown as number,
      totalFat: '1e2' as unknown as number,
      totalFiber: { valueOf: () => 30 } as unknown as number,
    }).map((metric) => metric.value)).toEqual(['0g', '0g', '0g', '0g']);

    expect(getHydrationProgress({
      filled: [8] as unknown as number,
      dailyGoal: { valueOf: () => 8 } as unknown as number,
    })).toMatchObject({ filled: 0, dailyGoal: 8, percent: 0 });
  });

  it('selects the next nutrition action from real logged state', () => {
    expect(getNextNutritionAction({ mealCount: 0 }, { filled: 0, dailyGoal: 8 }).target).toBe('log');
    expect(getNextNutritionAction({ mealCount: 1 }, { filled: 3, dailyGoal: 8 }).target).toBe('hydration');
    expect(getNextNutritionAction({ mealCount: 1 }, { filled: 9, dailyGoal: 8 }).target).toBe('voice');
    expect(getNextNutritionAction({ mealCount: 2 }, { filled: 8, dailyGoal: 8 }).target).toBe('voice');
    expect(getNextNutritionAction({ mealCount: 3 }, { filled: 8, dailyGoal: 8 }).target).toBe('macros');
  });

  it('builds a one-tap repeat payload without preserving verified status', () => {
    expect(buildRepeatMacroPayload({
      mealType: 'dinner',
      description: 'Chicken bowl',
      calories: 640,
      protein: 45,
      carbs: 70,
      fat: 18,
      fiber: 8,
      items: [{ name: 'Chicken' }],
    }, '2026-06-20')).toMatchObject({
      date: '2026-06-20',
      mealType: 'dinner',
      description: 'Chicken bowl',
      calories: 640,
      protein: 45,
      source: 'manual',
      verified: false,
    });

    expect(buildRepeatMacroPayload({ mealType: 'pre_workout', description: 'Shake' }, '2026-06-20')?.mealType).toBe('snack');
    expect(buildRepeatMacroPayload({ description: '   ' })).toBeNull();
  });

  it('rejects malformed macro values in one-tap repeat payloads', () => {
    expect(buildRepeatMacroPayload({
      mealType: 'lunch',
      description: 'Chicken bowl',
      calories: ['640'] as unknown as number,
      protein: '1e2' as unknown as number,
      carbs: { valueOf: () => 70 } as unknown as number,
      fat: Number.POSITIVE_INFINITY,
      fiber: -4,
      sugar: 6,
      sodium: 820,
    }, '2026-06-20')).toMatchObject({
      date: '2026-06-20',
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
      sugar: 6,
      sodium: 820,
      verified: false,
    });
  });

  it('builds care-first nutrition insights from real macro, hydration, and weekly data', () => {
    const insights = buildNutritionInsights({
      summary: {
        totalProtein: 42,
        totalFiber: 8,
        mealCount: 2,
        meals: { breakfast: { count: 1 }, lunch: { count: 1 } },
      },
      hydration: { filled: 2, dailyGoal: 8 },
      weekDays: [
        { date: '2026-06-16', mealCount: 1 },
        { date: '2026-06-18', mealCount: 2 },
        { date: '2026-06-20', mealCount: 2 },
      ],
    });

    expect(insights.map((insight) => insight.id)).toEqual([
      'protein-gap',
      'fiber-gap',
      'hydration-gap',
      'weekly-rhythm',
    ]);
    expect(insights[0].copy).toContain('42g protein logged so far');
    expect(insights[1].copy).toContain('8g fiber logged so far');
    expect(insights[2].target).toBe('hydration');
    expect(insights.map((insight) => insight.copy).join(' ')).not.toMatch(/calorie target|\d+g\s+of\s+\d+g/i);
  });

  it('does not invent protein or fiber gap insight copy from incomplete summaries', () => {
    const insights = buildNutritionInsights({
      summary: {
        totalProtein: null,
        totalFiber: undefined,
        mealCount: 2,
      },
      hydration: { filled: 8, dailyGoal: 8 },
      weekDays: [
        { date: '2026-06-16', mealCount: 1 },
        { date: '2026-06-18', mealCount: 2 },
      ],
    });

    expect(insights.map((insight) => insight.id)).not.toContain('protein-gap');
    expect(insights.map((insight) => insight.id)).not.toContain('fiber-gap');
    expect(insights.map((insight) => insight.copy).join(' ')).not.toMatch(/0g of/);
  });

  it('can add a training-day correlation only when real training-day input is provided', () => {
    const withoutTraining = buildNutritionInsights({
      summary: { totalProtein: 120, totalFiber: 24, mealCount: 3 },
      hydration: { filled: 8, dailyGoal: 8 },
      weekDays: [{ date: '2026-06-20', mealCount: 3 }],
    });
    expect(withoutTraining.some((insight) => insight.id === 'training-day-support')).toBe(false);

    const withTraining = buildNutritionInsights({
      summary: { totalProtein: 60, totalFiber: 24, mealCount: 3 },
      hydration: { filled: 4, dailyGoal: 8 },
      weekDays: [{ date: '2026-06-20', mealCount: 3 }],
      trainingDay: true,
    });
    expect(withTraining[0]).toMatchObject({
      id: 'training-day-support',
      target: 'log',
    });
  });

  it('uses Gentle Mode insights without calorie or macro gram targets', () => {
    const insights = buildNutritionInsights({
      summary: { totalProtein: 42, totalFiber: 8, mealCount: 2 },
      hydration: { filled: 2, dailyGoal: 8 },
      weekDays: [{ date: '2026-06-20', mealCount: 2 }],
      gentleMode: true,
    });

    const combinedCopy = insights.map((insight) => `${insight.title} ${insight.copy}`).join(' ');
    expect(insights.map((insight) => insight.id)).toContain('gentle-mode-support');
    expect(insights.find((insight) => insight.id === 'weekly-rhythm')?.target).toBe('log');
    expect(combinedCopy).not.toMatch(/\d+g/);
    expect(combinedCopy).not.toMatch(/\d+\s+of\s+\d+/i);
    expect(combinedCopy).not.toMatch(/calorie/i);
    expect(combinedCopy).toMatch(/coach/i);
  });

  it('builds safe care milestones without rewarding restriction', () => {
    expect(getNutritionCareMilestone({
      gentleMode: false,
      hydration: { filled: 8, dailyGoal: 8, ounces: 64 },
      meals: 2,
      streakDays: 4,
    })).toMatchObject({
      label: 'Consistency milestone',
      title: '4-day logging rhythm',
    });

    const gentle = getNutritionCareMilestone({
      gentleMode: true,
      hydration: { filled: 3, dailyGoal: 8, ounces: 24 },
      meals: 2,
      streakDays: 4,
    });

    expect(`${gentle.label} ${gentle.title} ${gentle.copy}`).toMatch(/no numbers required/i);
    expect(`${gentle.label} ${gentle.title} ${gentle.copy}`).not.toMatch(/restriction|calorie target|diet penalty|burn/i);
  });
});
