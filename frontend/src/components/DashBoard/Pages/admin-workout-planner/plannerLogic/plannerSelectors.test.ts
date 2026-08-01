import { describe, expect, it } from 'vitest';
import { selectHasPlannerContent, selectLoadedPlan, selectPlannerPhase } from './plannerSelectors';

describe('plannerSelectors', () => {
  it('selects the current planner phase with a safe phase-two fallback', () => {
    expect(selectPlannerPhase(3).phase).toBe(3);
    expect(selectPlannerPhase(99).phase).toBe(2);
  });

  it('selects the loaded plan and saveability without mutating inputs', () => {
    const plans = [{ id: 'a' }, { id: 'b' }];
    expect(selectLoadedPlan(plans, 'b')).toEqual({ id: 'b' });
    expect(selectHasPlannerContent(91, 0, true)).toBe(true);
    expect(selectHasPlannerContent(null, 2, false)).toBe(false);
    expect(plans).toEqual([{ id: 'a' }, { id: 'b' }]);
  });
});
