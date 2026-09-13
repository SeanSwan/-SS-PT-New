/**
 * ============================================================================
 * FILE: sprintProgressionPolicy.test.mjs — R-H20 (contract §6 line 258, create half).
 *
 * WHAT THIS LOCKS
 *   "New create resolves strategy defaults" and "Add Sprint.metadata.progressionPolicyV1 with
 *   version, overrideByWeek and resolved modifier provenance". Before this, the policy was
 *   written only when a trainer touched a week, so a new Sprint recorded nothing about the
 *   load its own weeks had been resolved to.
 *
 * THE CROSS-CHECK THAT MATTERS
 *   The create-time resolution must equal what GENERATION resolves for the same untouched
 *   week — including `random`, whose stable seed is built from sprintId + ordinal week +
 *   policyVersion (§6 line 256). If the two ever disagree, the recorded provenance would
 *   describe a class nobody generates.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';

import {
  MODIFIER_SOURCE,
  PROGRESSION_POLICY_VERSION,
  resolveSprintWeekPolicy,
  resolveWeekPolicy,
} from '../../services/bootcamp/sprintProgression.mjs';
import {
  PROGRESSION_POLICY_KEY,
  buildInitialProgressionPolicy,
} from '../../services/bootcamp/sprintProgressionPolicy.mjs';

const schedule = (over = []) => ([
  { weekNumber: 1, isDeloadWeek: false, intensityModifier: 1.0 },
  { weekNumber: 2, isDeloadWeek: false, intensityModifier: 1.0 },
  { weekNumber: 3, isDeloadWeek: false, intensityModifier: 1.0 },
  { weekNumber: 4, isDeloadWeek: true, intensityModifier: 0.7 },
  ...over,
]);

const build = (over = {}) => buildInitialProgressionPolicy({
  sprintId: 77,
  strategy: 'linear',
  schedule: schedule(),
  ...over,
});

describe('R-H20 — a new Sprint records how its own weeks were resolved (§6 line 258)', () => {
  it('names the metadata key the contract names and versions the record', () => {
    expect(PROGRESSION_POLICY_KEY).toBe('progressionPolicyV1');
    const policy = build();
    expect(policy.version).toBe(1);
    expect(policy.policyVersion).toBe(PROGRESSION_POLICY_VERSION);
    // A new Sprint has no trainer overrides yet — that is the whole reason the resolution is
    // recorded: to say what the STRATEGY decided before any trainer touched it.
    expect(policy.overrideByWeek).toEqual({});
  });

  it('resolves one entry per week, keyed by week number', () => {
    const policy = build();
    expect(Object.keys(policy.resolvedByWeek).sort()).toEqual(['1', '2', '3', '4']);
    for (const entry of Object.values(policy.resolvedByWeek)) {
      expect(typeof entry.modifier).toBe('number');
      expect(entry.modifier).toBeGreaterThan(0);
      expect(typeof entry.source).toBe('string');
      expect(typeof entry.requiresCorrection).toBe('boolean');
    }
  });

  it('records a deload week as DELOAD and the others as STRATEGY', () => {
    const policy = build();
    expect(policy.resolvedByWeek['4']).toEqual({ modifier: 0.7, source: MODIFIER_SOURCE.DELOAD, requiresCorrection: false });
    // linear: min(1 + 0.05*(n-1), 1.5)
    expect(policy.resolvedByWeek['1'].modifier).toBe(1);
    expect(policy.resolvedByWeek['2'].modifier).toBeCloseTo(1.05);
    expect(policy.resolvedByWeek['3'].modifier).toBeCloseTo(1.10);
    expect(policy.resolvedByWeek['2'].source).toBe(MODIFIER_SOURCE.STRATEGY);
  });

  it('agrees EXACTLY with what generation resolves for the same untouched week', () => {
    // The cross-check that makes the record trustworthy, run for every strategy — `random`
    // included, because its seed (sprintId + week + policyVersion) is the part that could
    // silently differ between create and generation.
    for (const strategy of ['linear', 'undulating', 'block', 'random']) {
      const policy = build({ strategy });
      for (const week of schedule()) {
        const generated = resolveWeekPolicy({
          week, strategy, totalWeeks: 4, sprintId: 77,
        });
        expect(policy.resolvedByWeek[String(week.weekNumber)].modifier).toBe(generated.modifier);
        expect(policy.resolvedByWeek[String(week.weekNumber)].source).toBe(generated.source);
      }
    }
  });

  it('is STABLE: resolving twice never re-rolls a random week (§6 line 256)', () => {
    const first = build({ strategy: 'random' });
    const second = build({ strategy: 'random' });
    expect(second.resolvedByWeek).toEqual(first.resolvedByWeek);
  });

  it('flags an out-of-band stored value for correction instead of clamping it', () => {
    const policy = build({
      schedule: [{ weekNumber: 1, isDeloadWeek: false, intensityModifier: 1.9 }],
    });
    expect(policy.resolvedByWeek['1'].requiresCorrection).toBe(true);
    // NOT 1.5 (the strategy's ceiling) and NOT 1.9 (the stored value): the strategy decides
    // and the flag travels with it, which is what "correction, not silent clamping" means.
    expect(policy.resolvedByWeek['1'].modifier).toBe(1);
  });

  it('treats the scaffold 1.0 as the old default, not as a trainer override', () => {
    const policy = build({
      schedule: [{ weekNumber: 3, isDeloadWeek: false, intensityModifier: 1.0 }],
    });
    expect(policy.resolvedByWeek['3'].source).toBe(MODIFIER_SOURCE.STRATEGY);
    expect(policy.resolvedByWeek['3'].modifier).toBeCloseTo(1.10);
  });

  it('retains a legacy in-band value as a legacy override', () => {
    const policy = build({
      schedule: [{ weekNumber: 2, isDeloadWeek: false, intensityModifier: 1.15 }],
    });
    expect(policy.resolvedByWeek['2']).toEqual({
      modifier: 1.15, source: MODIFIER_SOURCE.LEGACY_OVERRIDE, requiresCorrection: false,
    });
  });

  it('survives an absent or malformed schedule without inventing weeks', () => {
    expect(build({ schedule: undefined }).resolvedByWeek).toEqual({});
    expect(build({ schedule: null }).resolvedByWeek).toEqual({});
  });

  // ── The WRAPPER the generators actually call (round 103, HIGH-1 / F3 / F12) ──────────
  it('seeds the roll from the RECORDED policyVersion, so a resolved week stays resolved', () => {
    // The whole point of recording `policyVersion` is that the `random` seed is
    // sprintId + week + policyVersion (§6 line 256). Passing no version made the recorded one
    // write-only: bumping the constant re-rolled every existing Sprint's random weeks while
    // `resolvedByWeek` still claimed the old value — the exact "regeneration does not reroll
    // the week's load" guarantee the contract makes.
    const week = { weekNumber: 2, isDeloadWeek: false, intensityModifier: 1.0 };
    const sprint = (policyVersion) => ({
      id: 77,
      durationWeeks: 4,
      progressionStrategy: 'random',
      metadata: { [PROGRESSION_POLICY_KEY]: { version: 1, policyVersion, overrideByWeek: {}, resolvedByWeek: {} } },
    });

    const recorded = resolveSprintWeekPolicy({ sprint: sprint('progressionPolicyV1'), week, sprintId: 77 });
    const bumped = resolveSprintWeekPolicy({ sprint: sprint('progressionPolicyV2'), week, sprintId: 77 });

    // A DIFFERENT recorded version must actually change the roll — otherwise the field is
    // decorative and the test above is vacuous.
    expect(recorded.modifier).not.toBe(bumped.modifier);
    // …and the DEFAULT (no recorded version) is the constant, which is what create writes.
    expect(resolveSprintWeekPolicy({ sprint: sprint(undefined), week, sprintId: 77 }).modifier)
      .toBe(recorded.modifier);
    expect(PROGRESSION_POLICY_VERSION).toBe('progressionPolicyV1');
  });

  it('the create record and the generator wrapper agree, THROUGH the wrapper', () => {
    // The earlier version of this cross-check called `resolveWeekPolicy` twice with a literal
    // `totalWeeks`, so deleting the production wiring left it green. This one drives the
    // recorded metadata through the wrapper the generators call.
    const schedule = [
      { weekNumber: 1, isDeloadWeek: false, intensityModifier: 1.0 },
      { weekNumber: 2, isDeloadWeek: false, intensityModifier: 1.0 },
      { weekNumber: 3, isDeloadWeek: true, intensityModifier: 0.7 },
    ];
    const policy = buildInitialProgressionPolicy({ sprintId: 77, strategy: 'random', schedule });
    const sprintRow = {
      id: 77,
      durationWeeks: schedule.length,
      progressionStrategy: 'random',
      metadata: { [PROGRESSION_POLICY_KEY]: policy },
    };

    for (const week of schedule) {
      expect(resolveSprintWeekPolicy({ sprint: sprintRow, week, sprintId: 77 }).modifier)
        .toBe(policy.resolvedByWeek[String(week.weekNumber)].modifier);
    }
  });
});
