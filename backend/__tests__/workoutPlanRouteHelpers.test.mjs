import { describe, expect, it } from 'vitest';
import {
  buildDuplicatePlanMetadata,
  parseStrictPositiveInteger,
  selectCurrentWorkoutPlan,
} from '../services/workoutPlanRouteHelpers.mjs';

describe('workoutPlanRouteHelpers', () => {
  it('strictly parses positive integer route/query ids', () => {
    expect(parseStrictPositiveInteger('42')).toBe(42);
    expect(parseStrictPositiveInteger(42)).toBe(42);
    expect(parseStrictPositiveInteger('42junk')).toBeNull();
    expect(parseStrictPositiveInteger('0')).toBeNull();
    expect(parseStrictPositiveInteger('-1')).toBeNull();
    expect(parseStrictPositiveInteger('1.5')).toBeNull();
  });

  it('drops current and legacy primary flags when duplicating a plan', () => {
    expect(buildDuplicatePlanMetadata({
      id: 'plan-1',
      metadata: {
        planHorizon: 'six_month',
        isPrimaryPlan: true,
        primary: true,
        planPdf: { url: '/api/workout-plans/plan-1/pdf/content.pdf' },
      },
    })).toEqual({
      planHorizon: 'six_month',
      duplicatedFrom: 'plan-1',
    });
  });

  it('selects by active lifecycle status and ignores metadata primary flags', () => {
    const pausedLegacyPrimary = {
      id: 'plan-paused', status: 'paused', metadata: { primary: true },
    };
    const activePlan = { id: 'plan-active', status: 'active', metadata: {} };

    expect(selectCurrentWorkoutPlan(activePlan, [pausedLegacyPrimary, activePlan])).toBe(activePlan);
    expect(selectCurrentWorkoutPlan(pausedLegacyPrimary, [pausedLegacyPrimary])).toBeNull();
  });
});