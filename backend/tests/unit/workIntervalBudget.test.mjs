/**
 * ============================================================================
 * FILE: workIntervalBudget.test.mjs — R-H20 (contract §6 line 264).
 *
 * Extracted from `workIntervalProgression.test.mjs` (rule 4 cap) along the same seam the
 * service was split on: this file covers the BUDGET FIT — "the largest integer work
 * interval whose compiled work block fits the requested budget" — while that one covers
 * precedence (deload, override, strategy, ceiling, paced refusal).
 *
 * The arithmetic is pinned against the SHARED COMPILER rather than against its own
 * algebra: `expandSegments` from `shared/bootcamp-core/timeline.mjs` is used to prove that
 * a station circuit really compiles to `rounds × stations × exercisesPerStation × workSec`,
 * and that the chosen interval fits while ONE SECOND MORE does not.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import { expandSegments } from '../../../shared/bootcamp-core/timeline.mjs';
import {
  BUDGET_NOT_CHECKED,
  BUDGET_STATUS,
  WORK_INTERVAL_MODE,
  fitWorkIntervalToBudget,
  resolveWorkInterval,
} from '../../services/bootcamp/workIntervalProgression.mjs';

/** The shape a station circuit resolves to: 5 stations x 4 exercises x 2 rounds. */
const ordinary = { exercisesPerStation: 4, rounds: 2, fixedStations: 5 };
describe('R-H20 — the interval is fitted to the work-block budget (contract §6 line 264)', () => {
  const TOTAL_SLOTS = 40; // 5 stations x 4 exercises x 2 rounds

  /** Compiled WORK seconds for a station circuit, per the SHARED compiler. */
  const compiledWorkSec = (workSec) => expandSegments({
    structure: {
      shape: 'station_circuit',
      rounds: 2,
      stationCount: 5,
      exercisesPerStation: 4,
      workSec,
      restSec: 15,
      roundBreakSec: 0,
    },
    blocks: [{ kind: 'work', slots: [] }],
  }).filter((segment) => segment.phase === 'work').reduce((sum, s) => sum + s.durationSec, 0);

  it('the compiler really does produce slots x workSec, which is the arithmetic used', () => {
    // If this ever stops holding, the fit below is measuring the wrong thing.
    expect(compiledWorkSec(30)).toBe(TOTAL_SLOTS * 30);
    expect(compiledWorkSec(42)).toBe(TOTAL_SLOTS * 42);
  });

  it('takes the largest integer interval whose COMPILED work block fits', () => {
    // Budget 1500s of work -> floor(1500/40) = 37s. A 42s proposal must be held to 37.
    const fitted = fitWorkIntervalToBudget({
      baseWorkSec: 30, proposedWorkSec: 42, totalWorkSlots: TOTAL_SLOTS, budgetSec: 1500,
    });
    expect(fitted.workSec).toBe(37);
    expect(fitted.reason).toBe('budget_hold');
    expect(fitted.applied).toBe(true);
    // The fit is tight: 37 fits, 38 does not.
    expect(compiledWorkSec(fitted.workSec)).toBeLessThanOrEqual(1500);
    expect(compiledWorkSec(fitted.workSec + 1)).toBeGreaterThan(1500);
  });

  it('does not hold when the whole proposal already fits', () => {
    const fitted = fitWorkIntervalToBudget({
      baseWorkSec: 30, proposedWorkSec: 32, totalWorkSlots: TOTAL_SLOTS, budgetSec: 1500,
    });
    expect(fitted.workSec).toBe(32);
    expect(fitted.reason).toBe('within_budget');
    expect(fitted.certifiable).toBe(true);
  });

  it('reports a PREFLIGHT FAILURE when even the baseline does not fit', () => {
    // "If even baseline fails, return a Preflight budget failure rather than certify."
    const fitted = fitWorkIntervalToBudget({
      baseWorkSec: 50, proposedWorkSec: 60, totalWorkSlots: TOTAL_SLOTS, budgetSec: 1500, // 37 max
    });
    expect(fitted.certifiable).toBe(false);
    expect(fitted.reason).toBe('budget_failure');
    expect(fitted.applied).toBe(false);
    expect(fitted.workSec).toBe(50); // unchanged; the caller must not certify
  });

  it('counts rest and transition seconds against the budget', () => {
    // 40 slots x 35s = 1400 of work, plus 200 of fixed rest -> 1600 > 1500.
    const fitted = fitWorkIntervalToBudget({
      baseWorkSec: 35, proposedWorkSec: 35, totalWorkSlots: TOTAL_SLOTS, otherBlockSec: 200, budgetSec: 1500,
    });
    expect(fitted.certifiable).toBe(false);
    expect(fitted.reason).toBe('budget_failure');
  });

  it('never invents a budget: an unusable budget returns null', () => {
    for (const budgetSec of [undefined, null, 0, -1, NaN, '1500']) {
      expect(fitWorkIntervalToBudget({
        baseWorkSec: 30, proposedWorkSec: 42, totalWorkSlots: TOTAL_SLOTS, budgetSec,
      })).toBeNull();
    }
  });

  it('holds to the baseline, not to zero, when only one step fits', () => {
    const fitted = fitWorkIntervalToBudget({
      baseWorkSec: 30, proposedWorkSec: 42, totalWorkSlots: TOTAL_SLOTS, budgetSec: 1240, // 31 max
    });
    expect(fitted.workSec).toBe(31);
    expect(fitted.applied).toBe(true);
    expect(compiledWorkSec(31)).toBeLessThanOrEqual(1240);
  });

  // ── §6 line 264 as the RESOLVER applies it, not just the helper ─────────────
  describe('the resolver budgets an INCREASE against the requested work block', () => {
    const budgeted = (over = {}) => resolveWorkInterval({
      baseWorkSec: 30,
      requestedModifier: 1.4, // 42 proposed
      format: ordinary,
      classFormat: 'stations_4x',
      classStyle: 'standard',
      totalWorkSlots: TOTAL_SLOTS,
      otherBlockSec: 100,
      budgetSec: 1500, // floor((1500-100)/40) = 35
      ...over,
    });

    it('holds the increase to the largest interval whose work block fits', () => {
      const record = budgeted();
      expect(record.reason).toBe('budget_hold');
      expect(record.appliedWorkSec).toBe(35);
      expect(record.applied).toBe(true); // 35 > 30 baseline, so a real (smaller) increase
      expect(record.proposedWorkSec).toBe(42);
      expect(compiledWorkSec(35) + 100).toBeLessThanOrEqual(1500);
      expect(compiledWorkSec(36) + 100).toBeGreaterThan(1500);
    });

    it('takes the whole proposal when it fits, and says so', () => {
      const record = budgeted({ budgetSec: 2000 });
      expect(record.appliedWorkSec).toBe(42);
      expect(record.applied).toBe(true);
      expect(record.certifiable).toBe(true);
    });

    it('reports a budget FAILURE when even the baseline does not fit', () => {
      // floor((1200-100)/40) = 27 < 30 baseline: cannot certify, and changes nothing.
      const record = budgeted({ budgetSec: 1200 });
      expect(record.reason).toBe('budget_failure');
      expect(record.certifiable).toBe(false);
      expect(record.applied).toBe(false);
      expect(record.appliedWorkSec).toBe(30);
    });

    it('never budgets a REDUCTION — shortening cannot overrun (§6 line 265)', () => {
      const record = budgeted({ requestedModifier: 0.7, budgetSec: 1200 });
      expect(record.appliedWorkSec).toBe(21);
      expect(record.applied).toBe(true);
      expect(record.reason).toBe(WORK_INTERVAL_MODE);
    });

    it('makes NO budget claim when the caller supplies no budget', () => {
      const record = budgeted({ budgetSec: undefined, otherBlockSec: undefined });
      expect(record.appliedWorkSec).toBe(42); // ceiling only, unchanged behaviour
      expect(record.certifiable).toBeUndefined();
      expect(record.budgetSec).toBeUndefined();
    });
  });

  // ── F2 (external review round 97): an UNCHECKED budget must never look like a pass ──
  describe('every record states its budget disposition explicitly (F2 lock)', () => {
    // REACHABILITY (measured with a temporary probe over all 16 formats at modifier 1.2, then
    // deleted — see the slice artifact `hg10-reach.log`):
    //   * `certifiable:false` appears for NO format at the Sprint call shape, because neither
    //     Sprint caller passes `targetDuration` (default 50). It appears for custom /
    //     stations_4x / stations_3x5 / stations_2x7 / partner at `targetDuration: 25`.
    //     So the Preflight block is a GUARD today, not live behaviour — do not claim otherwise.
    //   * `not_checked` IS live: full_group / circuit / hybrid apply the increase with no
    //     budget comparison, which is exactly what the F2 tests below pin.
    const resolve = (over = {}) => resolveWorkInterval({
      baseWorkSec: 30,
      requestedModifier: 1.4,
      format: ordinary,
      classFormat: 'stations_4x',
      classStyle: 'standard',
      totalWorkSlots: 40,
      otherBlockSec: 100,
      budgetSec: 1500,
      ...over,
    });

    it('reports the CHECKED outcomes, not just the failure', () => {
      expect(resolve({ budgetSec: 2000 }).budgetStatus).toBe(BUDGET_STATUS.WITHIN_BUDGET);
      expect(resolve().budgetStatus).toBe(BUDGET_STATUS.BUDGET_HOLD);
      expect(resolve({ budgetSec: 1200 }).budgetStatus).toBe(BUDGET_STATUS.BUDGET_FAILURE);
    });

    it('sets `certifiable: true` on EVERY path where the budget was actually checked', () => {
      // External review round 103 (F7) claimed `certifiable` stays undefined on the
      // fitted-and-unchanged path, leaving a checked-and-passed record indistinguishable from a
      // never-checked one. A probe over all five budgeted shapes showed `true` on all four
      // checked paths, so the claim is false for THIS code — and this test is what keeps it
      // false, because both consumers only ever test `=== false`.
      for (const record of [
        resolve({ budgetSec: 2000 }),                       // proposal fits whole
        resolve(),                                          // partial fit (hold)
        resolve({ requestedModifier: 1.05, budgetSec: 5000 }), // fitted equals proposal
        resolve({ requestedModifier: 1.01, budgetSec: 5000 }), // rounds back to baseline
      ]) {
        expect(record.budgetStatus).not.toBe(BUDGET_STATUS.NOT_CHECKED);
        expect(record.certifiable).toBe(true);
      }
      // The ONLY false: the budget was checked and even the baseline does not fit.
      expect(resolve({ budgetSec: 1200 }).certifiable).toBe(false);
      // …and the one path that never reaches the check (the 60s ceiling held the increase) is
      // `not_checked`, which is a different statement and is not `false`.
      const ceiling = resolve({ baseWorkSec: 50, requestedModifier: 1.4, budgetSec: 5000 });
      expect(ceiling.reason).toBe('work_interval_ceiling');
      expect(ceiling.budgetStatus).toBe(BUDGET_STATUS.NOT_CHECKED);
      expect(ceiling.certifiable).toBeUndefined();
    });

    it('says the work block was NEVER COMPARED when the slot count is unknown', () => {
      // The F2 defect: full_group / circuit / hybrid carry `exercisesPerStation: null`
      // (`bootcampConstants.mjs:52-58`), so `totalWorkSlots` is 0, `fitWorkIntervalToBudget`
      // returns null, and the increase is applied under the ceiling with no budget check.
      // That is still the behaviour — but the record now SAYS so instead of leaving the
      // field absent, which a consumer could only read as "verified".
      for (const totalWorkSlots of [0, undefined, null]) {
        const record = resolve({ totalWorkSlots });
        expect(record.applied).toBe(true);
        expect(record.appliedWorkSec).toBe(42);
        expect(record.budgetStatus).toBe(BUDGET_STATUS.NOT_CHECKED);
        expect(record.budgetNotCheckedReason).toBe(BUDGET_NOT_CHECKED.INPUTS_UNAVAILABLE);
        expect(record.certifiable).toBeUndefined(); // never a silent `true`
      }
    });

    it('says WHY for every other unchecked path', () => {
      // Paced protocol: the exact protocol is kept for trainer review (§6 line 270).
      expect(resolve({ classFormat: 'emom' }).budgetNotCheckedReason)
        .toBe(BUDGET_NOT_CHECKED.PACED_PROTOCOL);
      // Nothing requested.
      expect(resolve({ requestedModifier: 1 }).budgetNotCheckedReason)
        .toBe(BUDGET_NOT_CHECKED.NO_INTERVAL_CHANGE);
      // A reduction shortens the class and cannot overrun (§6 line 265).
      const reduced = resolve({ requestedModifier: 0.7, budgetSec: 1200 });
      expect(reduced.applied).toBe(true);
      expect(reduced.budgetStatus).toBe(BUDGET_STATUS.NOT_CHECKED);
      expect(reduced.budgetNotCheckedReason).toBe(BUDGET_NOT_CHECKED.REDUCTION_CANNOT_OVERRUN);
      // No reducible interval exists at all.
      expect(resolve({ baseWorkSec: undefined }).budgetNotCheckedReason)
        .toBe(BUDGET_NOT_CHECKED.NO_REDUCIBLE_INTERVAL);
    });

    it('LEAVES the blocked path unchanged: a failure still refuses to certify', () => {
      const record = resolve({ budgetSec: 1200 });
      expect(record.certifiable).toBe(false);
      expect(record.applied).toBe(false);
      expect(record.appliedWorkSec).toBe(30);
    });
  });
});

