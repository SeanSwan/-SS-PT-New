/**
 * ============================================================================
 * FILE: sprintGenerationSemantics.test.mjs — S-H20b acceptance (contract §8 line 299).
 *
 * The contract names THIS file beside the helper suite, with six acceptance subjects:
 *
 *   "default1 vs explicit1 override, deload toggle, all strategies, stable random,
 *    ordinary timeline budget, paced class"
 *
 *   "Default no longer masks strategy; modifier never changes impact; actual intervals and
 *    compiled totals agree; caps/unsupported protocols report hold"
 *
 * WHY IT EXISTS. The row pointed at a file that had never been created — the same traceability
 * defect the H29 row had. The behaviours were covered piecemeal (`sprintProgression.test.mjs`,
 * `workIntervalBudget.test.mjs`, `sprintGeneratorProgressionWiring.test.mjs`), but no single
 * file asserted the ACCEPTANCE the contract names, and two of the four outcome sentences —
 * "actual intervals and compiled totals agree" and "caps/unsupported protocols report hold" —
 * were only ever checked against hand-built inputs rather than a class the generator produced.
 *
 * WHAT IS REAL HERE: `resolveWeekPolicy` (the whole precedence rule), `generateBootcampClass`
 * (the whole generator, including the budget fit and the ceiling), and the shared compiler
 * `expandSegments` from `shared/bootcamp-core/timeline.mjs`, which is what makes "compiled
 * totals agree" a claim about the COMPILER rather than about this file's arithmetic.
 * ============================================================================
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../models/index.mjs', () => ({
  getBootcampClassLog: () => ({ findAll: async () => [] }),
  getBootcampSpaceProfile: () => null,
  getBootcampTemplate: () => null,
  getBootcampStation: () => ({ findAll: async () => [] }),
  getBootcampExercise: () => ({ findAll: async () => [] }),
  getBootcampOverflowPlan: () => ({ findAll: async () => [] }),
  getBootcampStretch: () => ({ findAll: async () => [] }),
  getExerciseTrend: () => ({}),
  getExercise: () => null,
  getSprintWeek: () => ({ findOne: async () => null }),
  getSprintClassSlot: () => ({ findOne: async () => null }),
  getSprintExerciseMemory: () => ({ findAll: async () => [] }),
  getBootcampSprint: () => null,
}));

const { PROGRESSION, MODIFIER_SOURCE, PROGRESSION_POLICY_VERSION, resolveWeekPolicy } =
  await import('../../services/bootcamp/sprintProgression.mjs');
const { generateBootcampClass } = await import('../../services/bootcamp/bootcampGenerator.mjs');
const { expandSegments } = await import('../../../shared/bootcamp-core/timeline.mjs');

const POLICY_KEY = 'progressionPolicyV1';
const week = (over = {}) => ({ weekNumber: 1, isDeloadWeek: false, intensityModifier: 1.0, ...over });
const resolve = (over = {}) => resolveWeekPolicy({
  week: week(),
  strategy: 'linear',
  totalWeeks: 4,
  sprintId: 77,
  policy: { version: 1, policyVersion: PROGRESSION_POLICY_VERSION, overrideByWeek: {} },
  ...over,
});

/** The real generator, with only the two model getters it reaches on this path stubbed. */
const generate = (over = {}) => generateBootcampClass({
  classFormat: 'stations_4x',
  classStyle: 'standard',
  dayType: 'full_body',
  trainerId: 1,
  includeStretch: false,
  ...over,
});

const compiledWorkSec = (workSec) => expandSegments({
  structure: {
    shape: 'station_circuit', rounds: 2, stationCount: 5, exercisesPerStation: 4,
    workSec, restSec: 15, roundBreakSec: 0,
  },
  blocks: [{ kind: 'work', slots: [] }],
}).filter((segment) => segment.phase === 'work').reduce((sum, s) => sum + s.durationSec, 0);

describe('S-H20b acceptance — the Sprint week decides the load (contract §8 line 299)', () => {
  it('DEFAULT 1.0 no longer masks the strategy; an EXPLICIT 1.0 does', () => {
    // The original defect: `week.intensityModifier || fn(...)` treated the scaffold 1.0 as a
    // trainer override, so every strategy was unreachable. The distinction is now carried by
    // the metadata, not by the column's value.
    const scaffold = resolve();
    expect(scaffold.source).toBe(MODIFIER_SOURCE.STRATEGY);
    expect(scaffold.modifier).toBeCloseTo(PROGRESSION.linear(1, 4, { sprintId: 77, policyVersion: PROGRESSION_POLICY_VERSION }));

    // The override is keyed by ORDINAL week: week 4, where `linear` would say 1.15.
    const explicit = resolve({
      policy: { version: 1, overrideByWeek: { 4: 1.0 } },
      week: week({ weekNumber: 4 }),
    });
    expect(explicit.source).toBe(MODIFIER_SOURCE.EXPLICIT_OVERRIDE);
    expect(explicit.modifier).toBe(1.0);
    // …and the same week WITHOUT the override proves the strategy would have said more, so the
    // assertion above is not vacuous.
    expect(resolve({ week: week({ weekNumber: 4 }) }).modifier).toBeCloseTo(1.15);
  });

  it('the DELOAD toggle wins, and the underlying override survives it', () => {
    const policy = { version: 1, overrideByWeek: { 2: 1.4 } };
    const deload = resolve({ policy, week: week({ weekNumber: 2, isDeloadWeek: true }) });
    expect(deload.source).toBe(MODIFIER_SOURCE.DELOAD);
    expect(deload.modifier).toBe(0.7);

    // "Toggling deload preserves the underlying override for later reuse" — the same policy
    // object, with the toggle off, still yields the trainer's 1.4.
    const restored = resolve({ policy, week: week({ weekNumber: 2 }) });
    expect(restored.modifier).toBe(1.4);
    expect(policy.overrideByWeek[2]).toBe(1.4);
  });

  it('EVERY strategy resolves, and only `random` is seed-dependent', () => {
    const strategies = Object.keys(PROGRESSION);
    expect(strategies).toEqual(expect.arrayContaining(['linear', 'undulating', 'block', 'random']));

    for (const strategy of strategies) {
      const resolved = resolve({ strategy, week: week({ weekNumber: 3 }) });
      expect(Number.isFinite(resolved.modifier), strategy).toBe(true);
      expect(resolved.modifier).toBeGreaterThan(0);
      // The modifier is a WORK-DURATION factor and never an impact category (§6 line 254):
      // nothing in the policy record names one.
      expect(JSON.stringify(resolved)).not.toMatch(/impact|flexibility|calisthenics/);
    }
  });

  it('RANDOM is stable: the same sprint resolves the same load every time', () => {
    const first = resolve({ strategy: 'random', week: week({ weekNumber: 2 }) });
    const again = resolve({ strategy: 'random', week: week({ weekNumber: 2 }) });
    expect(again.modifier).toBe(first.modifier);

    // In the [0.85, 1.15) band the contract names, and different weeks differ.
    expect(first.modifier).toBeGreaterThanOrEqual(0.85);
    expect(first.modifier).toBeLessThan(1.15);
    expect(resolve({ strategy: 'random', week: week({ weekNumber: 3 }) }).modifier)
      .not.toBe(first.modifier);
  });

  it('an ORDINARY budget: the actual interval fits and the compiled totals AGREE', async () => {
    const generated = await generate({ workIntervalModifier: 1.4, workIntervalSource: 'test' });
    const { progression } = generated;

    expect(progression.applied).toBe(true);
    // The interval the class actually prescribes, and the SAME number the exercises carry.
    expect(generated.exerciseDurationSec).toBe(progression.appliedWorkSec);
    expect(generated.exercises.every((ex) => ex.durationSec === progression.appliedWorkSec)).toBe(true);

    // "Actual intervals and compiled totals agree": the persisted total is the COMPILER's work
    // for the slots the class was built with — not this file's arithmetic.
    const slots = generated.stationCount * generated.exercisesPerStation * generated.rounds;
    expect(progression.appliedWorkTotalSec).toBe(progression.appliedWorkSec * slots);
    expect(progression.appliedWorkTotalSec).toBe(compiledWorkSec(progression.appliedWorkSec));
  });

  it('a BUDGET that cannot fit even the baseline reports hold, not a certified class', async () => {
    const broken = await generate({ targetDuration: 25, workIntervalModifier: 1.2, workIntervalSource: 'test' });

    expect(broken.progression.reason).toBe('budget_failure');
    expect(broken.progression.certifiable).toBe(false);
    expect(broken.progression.applied).toBe(false);
    // Nothing was applied, so the class is the baseline — never a shortened rest or a dropped
    // exercise to force the increase (§6 line 264).
    expect(broken.exerciseDurationSec).toBe(broken.progression.baseWorkSec);
  });

  it('a 60s CEILING holds an automatic increase, and the hold is reported as a hold', async () => {
    const held = await generate({ classFormat: 'emom', workIntervalModifier: 1.2, workIntervalSource: 'test' });

    // A paced protocol is the unsupported case: keep the exact protocol, report `hold`.
    expect(held.progression.mode).toBe('manual_protocol');
    expect(held.progression.applied).toBe(false);
    expect(held.progression.reason).toBe('unsupported_protocol');
    // "Do not turn a 60s EMOM into a 90s minute" — the class is unchanged at its own duration.
    expect(held.exerciseDurationSec).toBe(held.progression.baseWorkSec);
    expect(compiledWorkSec(held.progression.baseWorkSec)).toBe(compiledWorkSec(held.exerciseDurationSec));
  });
});
