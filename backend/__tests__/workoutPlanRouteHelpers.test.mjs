import { describe, expect, it } from 'vitest';
import {
  buildDuplicatePlanMetadata,
  markPlanPrimary,
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

  it('clears current and legacy primary flags when duplicating a plan', () => {
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
      isPrimaryPlan: false,
      primary: false,
      duplicatedFrom: 'plan-1',
    });
  });

  it('clears legacy primary flags when demoting a sibling plan', () => {
    expect(markPlanPrimary({
      id: 'plan-2',
      status: 'active',
      metadata: { isPrimaryPlan: true, primary: true },
    }, false)).toMatchObject({
      metadata: { isPrimaryPlan: false, primary: false },
    });
  });

  it('selects an active primary plan from a catalog before falling back', () => {
    const fallbackPlan = { id: 'plan-default', status: 'active', metadata: {} };
    const primaryPlan = { id: 'plan-primary', status: 'active', metadata: { primary: true } };

    expect(selectCurrentWorkoutPlan(fallbackPlan, [fallbackPlan, primaryPlan])).toBe(primaryPlan);
  });
});
