/**
 * ============================================================================
 * FILE: bootcampWorkIntervalApplication.test.mjs — R-H20 (slice E).
 *
 * WHY THIS FILE EXISTS (hostile-review finding F5)
 *   The application step inside `generateBootcampClass` —
 *   `if (progression?.applied) format = applyWorkIntervalToFormat(format, progression)`
 *   — was pinned by ZERO tests. A reviewer deleted it in a mirror checkout and
 *   **166 tests across 15 files that import the real generator still passed**,
 *   including the two files written for this feature. The cause: the wiring test
 *   MOCKS `generateBootcampClass` and asserts only its ARGUMENT, and
 *   `workIntervalProgression.test.mjs` calls `resolveBootcampStructure` plus pure
 *   helpers but never the generator itself. The module could therefore regress to
 *   the exact H20 dead-code state with no red test.
 *
 * WHAT IS REAL HERE: the WHOLE `generateBootcampClass`. Only the two model getters
 * it reaches on this path are stubbed — `getBootcampClassLog` (recent-history
 * exclusion) and `getBootcampSpaceProfile` (skipped entirely when no
 * `spaceProfileId` is passed). No LLM provider is configured, so the brain takes
 * its recorded fallback path.
 * ============================================================================
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../models/index.mjs', () => ({
  getBootcampClassLog: () => ({ findAll: async () => [] }),
  getBootcampSpaceProfile: () => null,
}));

const { generateBootcampClass } = await import('../../services/bootcamp/bootcampGenerator.mjs');
const { FORMAT_CONFIG } = await import('../../services/bootcamp/bootcampConstants.mjs');

const BASELINE = FORMAT_CONFIG.stations_4x.durationSec;

const call = (over = {}) => generateBootcampClass({
  classFormat: 'stations_4x',
  classStyle: 'standard',
  dayType: 'full_body',
  trainerId: 1,
  includeStretch: false,
  ...over,
});

describe('R-H20 — generateBootcampClass APPLIES the work-interval modifier', () => {
  it('prescribes the baseline interval and records no progression when none is supplied', async () => {
    const plain = await call();
    expect(plain.exerciseDurationSec).toBe(BASELINE);
    expect(plain.progression).toBeUndefined();
  });

  it('reports work TOTALS for the class actually built, after the collapse (MED-6)', async () => {
    // §6 line 266 wants provenance for the class in hand. The progression used to be computed
    // BEFORE the small-class collapse, so a 4-person class that collapsed from 5 stations to 2
    // still persisted totals for 5 — an overstatement of the class the trainer would run
    // (external review, round 99, MED-6).
    const small = await call({ workIntervalModifier: 1.2, workIntervalSource: 'test', expectedParticipants: 4 });
    const large = await call({ workIntervalModifier: 1.2, workIntervalSource: 'test', expectedParticipants: 24 });

    const slotsOf = (generated) => (
      generated.stationCount * generated.exercisesPerStation * generated.rounds
    );

    // The collapse really did fire, so the two classes differ in the unit that matters.
    expect(small.stationCount).toBeLessThan(large.stationCount);
    expect(slotsOf(small)).toBe(2 * 4 * 2);
    expect(slotsOf(large)).toBe(5 * 4 * 2);

    // …and the persisted totals are the BUILT class's work, not the requested one's.
    for (const generated of [small, large]) {
      expect(generated.progression.baseWorkTotalSec)
        .toBe(Math.round(generated.progression.baseWorkSec * slotsOf(generated)));
      expect(generated.progression.appliedWorkTotalSec)
        .toBe(Math.round(generated.progression.appliedWorkSec * slotsOf(generated)));
    }
    expect(small.progression.baseWorkTotalSec).toBe(BASELINE * 16);
    expect(large.progression.baseWorkTotalSec).toBe(BASELINE * 40);
  });

  it('actually changes the prescribed interval, and the exercises carry it', async () => {
    // The assertion F5 was missing: not the argument, the OUTCOME.
    const reduced = await call({ workIntervalModifier: 0.7, workIntervalSource: 'test' });
    const expected = Math.max(1, Math.round(BASELINE * 0.7));

    expect(reduced.exerciseDurationSec).toBe(expected);
    expect(reduced.progression).toMatchObject({
      applied: true,
      baseWorkSec: BASELINE,
      appliedWorkSec: expected,
      source: 'test',
    });
    // The prescribed per-exercise interval is what the trainer actually sees.
    expect(reduced.exercises.length).toBeGreaterThan(0);
    expect(reduced.exercises[0].durationSec).toBe(expected);
  });

  it('leaves the SHARED format config byte-identical after applying', async () => {
    // `resolveBootcampStructure` hands back `FORMAT_CONFIG[x]` by reference for
    // non-custom formats, so an in-place transform would corrupt every later class
    // in the process. Proven here against the real generator, not just the helper.
    await call({ workIntervalModifier: 0.6 });
    await call({ workIntervalModifier: 1.4 });
    expect(FORMAT_CONFIG.stations_4x.durationSec).toBe(BASELINE);
    expect((await call()).exerciseDurationSec).toBe(BASELINE);
  });

  it('holds — and says so — when the ceiling stops the increase', async () => {
    // 35s x 1.8 = 63s, which the 60s ceiling clips. (An earlier version of this test
    // used 1.5 and failed: 35 x 1.5 = 53s never reaches the ceiling at all, so the
    // assertion was about arithmetic I had not done, not about the policy.)
    const held = await call({ workIntervalModifier: 1.8, workIntervalSource: 'test' });
    expect(held.progression.applied).toBe(false);
    expect(held.progression.reason).toBe('work_interval_ceiling');
    // A hold means the class is NOT stretched: the prescribed interval is unchanged,
    // and the clipped proposal is reported separately rather than as `appliedWorkSec`.
    expect(held.progression.appliedWorkSec).toBe(BASELINE);
    expect(held.progression.proposedWorkSec).toBe(60);
    expect(held.exerciseDurationSec).toBe(BASELINE);
    expect(held.exercises[0].durationSec).toBe(BASELINE);
  });

  it('refuses to stretch a PYRAMID class (contract §6 line 270)', async () => {
    // `pyramid` rewrites LOAD structure, so stretching its interval changes what the
    // protocol means. This was a HIGH finding: the style never reached the policy.
    const pyramid = await call({
      classStyle: 'pyramid',
      workIntervalModifier: 1.2,
      workIntervalSource: 'test',
    });
    expect(pyramid.progression.mode).toBe('manual_protocol');
    expect(pyramid.progression.applied).toBe(false);
    expect(pyramid.exerciseDurationSec).toBe(BASELINE);
  });

  it('refuses to stretch a paced FORMAT', async () => {
    const emom = await call({ classFormat: 'emom', workIntervalModifier: 1.2, workIntervalSource: 'test' });
    expect(emom.progression.mode).toBe('manual_protocol');
    expect(emom.progression.applied).toBe(false);
    expect(emom.exerciseDurationSec).toBe(FORMAT_CONFIG.emom.durationSec);
  });

  it('BINDS on the requested work block when the budget is genuinely tight', async () => {
    // At the default 50-minute target the 60s ceiling always binds first, so the budget
    // check is live but unreachable — a probe over all 37 formats found 0 holds and 0
    // failures. This test supplies a target where the BUDGET is the binding constraint, so
    // the wiring is proven to do something rather than merely exist.
    //
    // stations_4x: 40 work slots, 570s of rest/transition.
    //   baseline 35s -> 1400 + 570 = 1970
    //   1.2x     42s -> 1680 + 570 = 2250  (over the 2100 budget below)
    //   largest fitting = floor((2100 - 570) / 40) = 38 -> 1520 + 570 = 2090
    const held = await call({
      targetDuration: 35, // 2100s
      workIntervalModifier: 1.2,
      workIntervalSource: 'test',
    });

    expect(held.progression.reason).toBe('budget_hold');
    expect(held.progression.appliedWorkSec).toBe(38);
    expect(held.progression.proposedWorkSec).toBe(42);
    expect(held.exerciseDurationSec).toBe(38);
    expect(held.progression.budgetSec).toBe(2100);

    // …and the compiled work block really does fit, one second per slot short of overrun.
    expect(40 * 38 + 570).toBeLessThanOrEqual(2100);
    expect(40 * 39 + 570).toBeGreaterThan(2100);
  });

  it('reports a budget FAILURE when even the baseline overruns', async () => {
    // A 25-minute target cannot hold a fixed 35s station format at all (1970 > 1500), so
    // nothing is applied and the record refuses to certify — §6 line 264's preflight case.
    const broken = await call({ targetDuration: 25, workIntervalModifier: 1.2, workIntervalSource: 'test' });
    expect(broken.progression.reason).toBe('budget_failure');
    expect(broken.progression.certifiable).toBe(false);
    expect(broken.progression.applied).toBe(false);
    expect(broken.exerciseDurationSec).toBe(BASELINE); // unchanged
  });
});
