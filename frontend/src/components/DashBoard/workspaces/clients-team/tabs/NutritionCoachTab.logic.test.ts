import { describe, expect, it } from 'vitest';
import {
  buildActualVsTargetRows,
  buildAdherenceHeroView,
  buildLastLogView,
  buildNutritionRangeParams,
  buildNutritionTrendPoints,
  canStepNutritionForward,
  formatNutritionStepperLabel,
  stepNutritionDate,
} from './NutritionCoachTab.logic';
import type { NutritionTimelineEntry } from './NutritionTabContent.logic';

const TODAY = '2026-08-04';

const entry = (overrides: Partial<NutritionTimelineEntry> = {}): NutritionTimelineEntry => ({
  id: 1,
  mealType: 'lunch',
  calories: 600,
  protein: 40,
  carbs: 55,
  fat: 20,
  fiber: 8,
  source: 'manual',
  verified: true,
  createdAt: '2026-08-04T12:00:00',
  ...overrides,
});

describe('date stepper math', () => {
  it('steps backward one calendar day', () => {
    expect(stepNutritionDate('2026-08-04', -1, TODAY)).toBe('2026-08-03');
  });

  it('crosses month boundaries correctly', () => {
    expect(stepNutritionDate('2026-08-01', -1, TODAY)).toBe('2026-07-31');
  });

  it('never steps past today', () => {
    expect(stepNutritionDate(TODAY, 1, TODAY)).toBe(TODAY);
  });

  it('allows stepping forward only when behind today', () => {
    expect(canStepNutritionForward('2026-08-03', TODAY)).toBe(true);
    expect(canStepNutritionForward(TODAY, TODAY)).toBe(false);
    expect(canStepNutritionForward('not-a-date', TODAY)).toBe(false);
  });

  it('recovers to today from a malformed date', () => {
    expect(stepNutritionDate('garbage', -1, TODAY)).toBe(TODAY);
  });

  it('builds an inclusive trailing 7-day range (start = end - 6)', () => {
    expect(buildNutritionRangeParams('2026-08-04')).toEqual({
      start: '2026-07-29',
      end: '2026-08-04',
    });
  });

  it('clamps bogus range lengths back to 7 days', () => {
    expect(buildNutritionRangeParams('2026-08-04', 999)).toEqual({
      start: '2026-07-29',
      end: '2026-08-04',
    });
  });

  it('formats the stepper label as Mon DD, YYYY', () => {
    expect(formatNutritionStepperLabel('2026-08-04')).toBe('Aug 04, 2026');
    expect(formatNutritionStepperLabel('bad')).toBe('Unknown date');
  });
});

describe('adherence hero mapping', () => {
  it('maps the server adherence spine to hero copy', () => {
    const view = buildAdherenceHeroView({
      loggedDays: 6,
      consistencyScore: 87,
      proteinTargetHitRate: 71,
      avgCaloriesPctOfTarget: 94,
      inferredEntryCount: 0,
      needsReviewCount: 0,
      currentLogStreak: 12,
    }, 'range');

    expect(view.adherenceLabel).toBe('87%');
    expect(view.rangeLabel).toBe('7-day adherence');
    expect(view.streakLabel).toBe('12-day streak');
    expect(view.streakActive).toBe(true);
    expect(view.chips.map((chip) => chip.id)).toEqual(['protein-hit']);
  });

  it('discounts inferred data with a visible estimated chip and a verify chip', () => {
    const view = buildAdherenceHeroView({
      consistencyScore: 40,
      inferredEntryCount: 3,
      needsReviewCount: 2,
      currentLogStreak: 0,
    }, 'day');

    expect(view.chips).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'verify', label: 'Verify 2', tone: 'purple' }),
      expect.objectContaining({ id: 'estimated', label: '3 estimated', tone: 'gold' }),
    ]));
    expect(view.streakLabel).toBe('No active streak');
    expect(view.rangeLabel).toBe('Today adherence');
  });

  it('shows a placeholder when no adherence payload exists', () => {
    const view = buildAdherenceHeroView(null, 'day');
    expect(view.adherenceLabel).toBe('--');
    expect(view.adherencePercent).toBeNull();
    expect(view.chips).toEqual([{ id: 'clear', label: 'No attention flags', tone: 'calm' }]);
  });

  it('caps adherence display at 100%', () => {
    expect(buildAdherenceHeroView({ consistencyScore: 250 }, 'range').adherenceLabel).toBe('100%');
  });
});

describe('actual vs target rows', () => {
  const target = {
    dailyCalories: 2100, proteinGrams: 150, carbsGrams: 220, fatGrams: 70,
    fiberGrams: 25, sodiumLimitMg: 2300, hydrationTargetLiters: 2.5,
  };

  it('flags the empty state when target is null', () => {
    const result = buildActualVsTargetRows([entry()], null, 'day');
    expect(result.hasTargets).toBe(false);
  });

  it('builds five capped fill rows against the daily target', () => {
    const result = buildActualVsTargetRows(
      [entry({ calories: 1840, protein: 142, carbs: 180, fat: 60, fiber: 18 })],
      target,
      'day',
    );

    expect(result.hasTargets).toBe(true);
    expect(result.rows.map((row) => row.id)).toEqual(['calories', 'protein', 'carbs', 'fat', 'fiber']);
    const calories = result.rows[0];
    expect(calories.actualLabel).toBe('1,840 cal');
    expect(calories.targetLabel).toBe('2,100 cal');
    expect(calories.fillPercent).toBe(88);
    expect(calories.overTarget).toBe(false);
  });

  it('caps the bar at 100 and marks over-target', () => {
    const result = buildActualVsTargetRows([entry({ calories: 4000 })], target, 'day');
    expect(result.rows[0].fillPercent).toBe(100);
    expect(result.rows[0].overTarget).toBe(true);
  });

  it('averages per logged day in range mode', () => {
    const result = buildActualVsTargetRows([
      entry({ id: 1, calories: 2000, createdAt: '2026-08-03T12:00:00' }),
      entry({ id: 2, calories: 1000, createdAt: '2026-08-04T12:00:00' }),
    ], target, 'range');

    expect(result.modeLabel).toBe('Daily average vs target');
    expect(result.rows[0].actualLabel).toBe('1,500 cal');
  });
});

describe('trend points', () => {
  it('zero-fills each day in the range', () => {
    const points = buildNutritionTrendPoints(
      [entry({ calories: 500, createdAt: '2026-07-30T09:00:00' })],
      '2026-07-29',
      '2026-08-04',
    );

    expect(points).toHaveLength(7);
    expect(points[0].y).toBe(0);
    expect(points[1].y).toBe(500);
  });

  it('returns an empty series for an inverted range', () => {
    expect(buildNutritionTrendPoints([], '2026-08-04', '2026-08-01')).toEqual([]);
  });
});

describe('last log label', () => {
  it('labels a same-day log as Today with an ok tone', () => {
    const view = buildLastLogView([entry({ createdAt: '2026-08-04T14:32:00' })], TODAY);
    expect(view.tone).toBe('ok');
    expect(view.label).toContain('Today');
  });

  it('labels an older log with a warn tone', () => {
    const view = buildLastLogView([entry({ createdAt: '2026-08-02T10:00:00' })], TODAY);
    expect(view.tone).toBe('warn');
    expect(view.label).toContain('Aug 02');
  });

  it('handles no logs honestly', () => {
    expect(buildLastLogView([], TODAY)).toEqual({ label: 'No logs in view', tone: 'none' });
  });
});
