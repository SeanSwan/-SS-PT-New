/**
 * planEditDoctrineService — the TRUST + SCIENCE upgrade (2026-07-28).
 *
 * These lock the three things the first pass missed:
 *   1. TRUST HOLE: the doctrine phase is resolved from the SAVED PLAN, never the
 *      model-supplied payload — an adversarial proposal cannot pick a lenient
 *      phase to launder an out-of-doctrine change into "in_doctrine".
 *   2. SEVERITY: verdicts carry ok / info / caution so a harmless tempo deviation
 *      is not visually equal to an out-of-range load.
 *   3. MAGNITUDE: an in-range change whose single-edit jump is aggressive is
 *      escalated to caution (a master caps the rate of change, not just the end).
 */
import { describe, it, expect } from 'vitest';
import {
  checkPlanEditItem,
  resolveItemPhase,
  stampDoctrineVerdictsFromPlan,
} from '../services/ai/planEditDoctrineService.mjs';

// A plan whose Week 2 is Phase 3 (Hypertrophy: sets 3-5, 75-85%).
const plan = {
  id: 7,
  userId: 42,
  nasmPhase: 3,
  planData: {
    weeks: [
      { weekNumber: 1, optPhase: { phase: 1 } },  // Stabilization: sets 1-3, 50-70%
      { weekNumber: 2, optPhase: { phase: 3 } },  // Hypertrophy:  sets 3-5, 75-85%
    ],
  },
};

describe('TRUST: phase comes from the plan, not the model', () => {
  it('resolves each item phase from its OWN week in the saved plan', () => {
    expect(resolveItemPhase(plan, { weekNumber: 1 })).toEqual({ phase: 1, source: 'plan_week' });
    expect(resolveItemPhase(plan, { weekNumber: 2 })).toEqual({ phase: 3, source: 'plan_week' });
  });

  it('falls back to the plan-level phase, then the doctrine default', () => {
    expect(resolveItemPhase({ nasmPhase: 4, planData: { weeks: [] } }, { weekNumber: 9 }))
      .toEqual({ phase: 4, source: 'plan' });
    expect(resolveItemPhase({ planData: {} }, { weekNumber: 1 }).source).toBe('default_fallback');
  });

  it('an adversarial proposal CANNOT launder an out-of-doctrine change via a fake phase', () => {
    // 6 sets is IN-doctrine for Phase 4 (4-6) but OUT for the plan's Phase-3 week.
    // The item even carries a lying `phase: 4` — the referee must ignore it.
    const items = [{ id: 'x', weekNumber: 2, exerciseName: 'Deadlift', field: 'sets', fromValue: 3, toValue: 6, phase: 4 }];
    const [stamped] = stampDoctrineVerdictsFromPlan(items, plan);

    expect(stamped.phaseUsed).toBe(3);                    // judged against the PLAN's phase
    expect(stamped.phaseSource).toBe('plan_week');
    expect(stamped.doctrineCheck.verdict).toBe('out_of_doctrine');
    expect(stamped.doctrineCheck.doctrine).toMatch(/Phase 3/);
  });

  it('the same change is in-doctrine when the plan week REALLY is Phase 4', () => {
    const p4 = { ...plan, planData: { weeks: [{ weekNumber: 2, optPhase: { phase: 4 } }] } };
    const [stamped] = stampDoctrineVerdictsFromPlan(
      [{ id: 'x', weekNumber: 2, field: 'sets', fromValue: 4, toValue: 6 }], p4,
    );
    expect(stamped.phaseUsed).toBe(4);
    expect(stamped.doctrineCheck.verdict).toBe('in_doctrine');
  });
});

describe('TRUST: an unverifiable plan is never silently approved', () => {
  it('stamps plan_unavailable / caution for every item when the plan is missing', () => {
    const items = [{ id: 'a', field: 'sets', toValue: 4 }, { id: 'b', field: 'tempo', toValue: '2-0-2' }];
    const stamped = stampDoctrineVerdictsFromPlan(items, null);
    expect(stamped).toHaveLength(2);
    for (const item of stamped) {
      expect(item.doctrineCheck.verdict).toBe('plan_unavailable');
      expect(item.doctrineCheck.severity).toBe('caution');
      expect(item.phaseSource).toBe('plan_unavailable');
    }
  });
});

describe('SEVERITY: every verdict carries a triage severity', () => {
  it('in-doctrine is ok; out-of-range numeric is caution', () => {
    expect(checkPlanEditItem({ field: 'sets', toValue: 4, fromValue: 4 }, 3).severity).toBe('ok');
    expect(checkPlanEditItem({ field: 'sets', toValue: 9 }, 3)).toMatchObject({ verdict: 'out_of_doctrine', severity: 'caution' });
    expect(checkPlanEditItem({ field: 'targetIntensity', toValue: 95 }, 3).severity).toBe('caution');
  });

  it('a valid tempo that merely deviates from the phase default is info, not caution', () => {
    const dev = checkPlanEditItem({ field: 'tempo', toValue: '3-1-2' }, 3); // valid cadence, != 2-0-2
    expect(dev).toMatchObject({ verdict: 'out_of_doctrine', severity: 'info' });
    const invalid = checkPlanEditItem({ field: 'tempo', toValue: 'fast' }, 3);
    expect(invalid.severity).toBe('caution');
  });

  it('an exercise swap is flagged info AND explicitly not-yet-safety-screened', () => {
    const swap = checkPlanEditItem({ field: 'exerciseSwap', toValue: 'Trap Bar Deadlift' }, 3);
    expect(swap).toMatchObject({ verdict: 'unchecked', severity: 'info' });
    expect(swap.doctrine).toMatch(/not yet safety-screened/i);
  });
});

describe('MAGNITUDE: an in-range but aggressive single-edit jump is cautioned', () => {
  it('flags a 2-set jump even though the endpoint is in range', () => {
    // Phase 3 sets 3-5. from 3 -> to 5 is IN range, but a 2-set spike in one edit.
    const v = checkPlanEditItem({ field: 'sets', fromValue: 3, toValue: 5 }, 3);
    expect(v).toMatchObject({ verdict: 'in_doctrine', severity: 'caution' });
    expect(v.doctrine).toMatch(/aggressive single-step/i);
  });

  it('flags a >10-point intensity jump even though the endpoint is in range', () => {
    // Phase 3 intensity 75-85%. from 72 -> to 85 is IN range, but a 13-pt jump.
    const v = checkPlanEditItem({ field: 'targetIntensity', fromValue: 72, toValue: 85 }, 3);
    expect(v).toMatchObject({ verdict: 'in_doctrine', severity: 'caution' });
  });

  it('does NOT flag a normal one-step progression', () => {
    expect(checkPlanEditItem({ field: 'sets', fromValue: 3, toValue: 4 }, 3).severity).toBe('ok');
    expect(checkPlanEditItem({ field: 'targetIntensity', fromValue: 78, toValue: 82 }, 3).severity).toBe('ok');
  });
});