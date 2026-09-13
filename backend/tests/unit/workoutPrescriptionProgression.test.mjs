/**
 * ============================================================================
 * FILE: workoutPrescriptionProgression.test.mjs — R-H20 (slice E).
 *
 * WHAT THIS LOCKS
 *   `resolveWeekModifier` decides the intensity modifier a Sprint week gets. It
 *   used to be written inline in sprintGenerator.mjs as
 *       `week.intensityModifier || progressionFn(week.weekNumber, durationWeeks)`
 *   while the calendar contract persists `intensityModifier: 1.0` for every
 *   non-deload week (sprintCalendarContract.mjs:257). `1.0` is truthy, so the
 *   left side always won and **every strategy function was dead code** — a
 *   12-week probe against the real generator recorded zero calls. A trainer could
 *   pick `undulating`, see it on the sprint card, and receive twelve identical
 *   weeks; that is contract §6's forbidden row verbatim ("a generated label can
 *   claim progress while prescriptions remain unchanged").
 *
 * THE DISCRIMINATING CASE is `undulating` week 2 against the REAL persisted
 * scaffold value: it must resolve to 0.85, and the buggy precedence returns 1.0.
 *
 * WHAT THIS FILE DOES *NOT* PROVE (hostile-review finding D1)
 *   It exercises the resolver as a PURE FUNCTION and never imports the generator.
 *   Re-inlining the buggy precedence into `sprintGenerator.mjs` leaves all 12 tests
 *   here GREEN — verified by doing exactly that. The production WIRING is pinned by
 *   `sprintGeneratorProgressionWiring.test.mjs`, which drives the real generator
 *   and reads the value that reaches a generated class. Read the two together.
 *
 * SCOPE — WHAT THIS FILE DOES *NOT* CLAIM
 *   The modifier currently reaches only the `explanations` log entry
 *   (sprintGenerator.mjs), not a prescribed number: `generateBootcampClass` is
 *   called with no modifier parameter. **H20 is therefore NOT complete after this
 *   slice** — it is complete only once a modifier changes a prescription. These
 *   tests lock the RESOLUTION half, which was unambiguously unreachable.
 *
 *   NOTE ON THE FAILURE ROW THIS SERVES: the risk sentence quoted above is contract
 *   line 29, inside §1 ("Hostile verdict on the repair plan"), NOT §6. Its required
 *   control — "actual typed prescriptions and recorded before/after values govern
 *   labels" — is NOT delivered by this slice, and after it the generator writes an
 *   explicit per-week intensity label while no prescription changes. That risk
 *   condition is therefore still true, and more visible, until the prescription
 *   half lands.
 *
 * STILL OPEN (needs the progressionPolicyV1 slice): a stored `1.0` cannot be told
 * apart from "the trainer explicitly chose 1.0", so `1.0` means "no override".
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  DELOAD_MODIFIER,
  MODIFIER_SOURCE,
  PROGRESSION,
  SCAFFOLD_MODIFIER,
  resolveWeekModifier,
  resolveWeekPolicy,
} from '../../services/bootcamp/sprintProgression.mjs';
import { buildSprintSchedule, SPRINT_DEFAULTS } from '../../services/bootcamp/sprintCalendarContract.mjs';

/** A week shaped the way the generator receives it from the persisted models. */
const week = (weekNumber, isDeloadWeek = false, intensityModifier = SCAFFOLD_MODIFIER) => ({
  weekNumber,
  isDeloadWeek,
  intensityModifier,
});

const resolve = (w, strategy, totalWeeks = 12, ctx = {}) =>
  resolveWeekModifier({ week: w, strategy, totalWeeks, sprintId: 77, ...ctx });

describe('R-H20 — the progression strategy actually resolves', () => {
  it('lets `undulating` decide week 2 instead of the scaffold default', () => {
    // THE discriminating assertion. Undulating is [1.0, 0.85, 1.1]; the persisted
    // scaffold value is 1.0, so the old `stored || fn(...)` returned 1.0 here.
    expect(resolve(week(2), 'undulating')).toBe(0.85);
  });

  it('lets `linear` ramp instead of pinning every week to the scaffold default', () => {
    expect(resolve(week(1), 'linear')).toBe(1.0);
    expect(resolve(week(3), 'linear')).toBeCloseTo(1.1, 10);
    expect(resolve(week(12), 'linear')).toBe(1.5); // capped
  });

  it('follows the block boundaries', () => {
    expect(resolve(week(1), 'block')).toBe(0.9);
    expect(resolve(week(4), 'block')).toBe(1.0); // (<=6 branch — deload is an INPUT)
    expect(resolve(week(4, true), 'block')).toBe(0.7); // deload still wins over block
    expect(resolve(week(5), 'block')).toBe(1.0);
    expect(resolve(week(7), 'block')).toBe(1.1);
    expect(resolve(week(10), 'block')).toBe(1.05);
  });

  it('keeps a deload week at the deload modifier for every strategy', () => {
    for (const strategy of Object.keys(PROGRESSION)) {
      expect(resolve(week(4, true), strategy)).toBe(DELOAD_MODIFIER);
    }
    // …and an explicit override cannot buy its way out of a deload.
    expect(resolve(week(4, true, 1.4), 'linear')).toBe(DELOAD_MODIFIER);
  });

  it('honours an explicit non-scaffold override over the strategy', () => {
    expect(resolve(week(2, false, 0.8), 'undulating')).toBe(0.8);
    expect(resolve(week(2, false, 1.25), 'undulating')).toBe(1.25);
  });

  it('ignores an override that is not a usable intensity', () => {
    // `validateWeekUpdate` (sprintUpdateContract.mjs:81-87) accepts any finite
    // number, so these are REACHABLE, and none of them is a training intensity.
    // The old `stored || fn(...)` fell through to the strategy for the falsy ones;
    // the fix must not turn them into instantiated garbage.
    for (const bad of [0, -0.5, NaN, Infinity, '1.5', null, undefined]) {
      expect(resolve(week(3, false, bad), 'linear')).toBe(resolve(week(3), 'linear'));
    }
  });

  it('falls back to `linear` for an unknown strategy', () => {
    expect(resolve(week(3), 'not_a_real_strategy')).toBe(resolve(week(3), 'linear'));
  });

  it('never returns `undefined` for a non-positive week number', () => {
    // `pattern[(weekNum - 1) % 3]` is index -1 for weekNum 0 and -2 for -1, which
    // indexed off the array. Unreachable while the strategies were dead code;
    // making them live made it reachable, and the generator would have recorded
    // "modifier undefined". Not reachable from the calendar (which emits w + 1),
    // so this is a bound, not a live bug.
    for (const strategy of Object.keys(PROGRESSION)) {
      for (const weekNumber of [0, -1, -5]) {
        const value = resolve(week(weekNumber), strategy);
        expect(typeof value).toBe('number');
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  describe('progressionPolicyV1 metadata (contract §6 line 258)', () => {
    const policyFor = (overrideByWeek) => ({ progressionPolicyV1: { version: 1, overrideByWeek } });
    const withPolicy = (weekNumber, overrideByWeek, strategy = 'undulating') => resolveWeekPolicy({
      week: week(weekNumber), strategy, totalWeeks: 12, sprintId: 77,
      policy: { overrideByWeek },
    });

    it('honours an EXPLICIT 1.0, which the persisted column cannot express', () => {
      // THE discriminating assertion for this slice: without metadata a stored 1.0
      // is indistinguishable from the scaffold default and routes to the strategy,
      // so a trainer who deliberately chose "no progression" was silently given
      // undulating's 0.85. Line 258: "a PUT containing intensityModifier marks that
      // week explicit even when it equals 1.0".
      const record = withPolicy(2, { 2: 1.0 });
      expect(record.modifier).toBe(1.0);
      expect(record.source).toBe(MODIFIER_SOURCE.EXPLICIT_OVERRIDE);
      expect(record.requiresCorrection).toBe(false);
    });

    it('honours an explicit override for a week the strategy would move', () => {
      expect(withPolicy(2, { 2: 1.2 }).modifier).toBe(1.2);
      expect(withPolicy(2, {}).modifier).toBe(0.85); // strategy, unchanged
    });

    it('lets a deload outrank an explicit override', () => {
      const record = resolveWeekPolicy({
        week: week(4, true), strategy: 'undulating', totalWeeks: 12, sprintId: 77,
        policy: { overrideByWeek: { 4: 1.3 } },
      });
      expect(record.modifier).toBe(DELOAD_MODIFIER);
      expect(record.source).toBe(MODIFIER_SOURCE.DELOAD);
    });

    it('flags an out-of-range legacy value instead of clamping it', () => {
      // 1.9 is outside the retained 0.7-1.5 band: "require correction, not silent
      // clamping". The strategy decides meanwhile and the flag travels with it.
      const high = resolveWeekPolicy({ week: week(2, false, 1.9), strategy: 'undulating', totalWeeks: 12, sprintId: 77 });
      expect(high.requiresCorrection).toBe(true);
      expect(high.modifier).toBe(0.85);
      const low = resolveWeekPolicy({ week: week(2, false, 0.3), strategy: 'undulating', totalWeeks: 12, sprintId: 77 });
      expect(low.requiresCorrection).toBe(true);
    });

    it('retains an in-band legacy override and labels its source', () => {
      const record = resolveWeekPolicy({ week: week(2, false, 1.25), strategy: 'undulating', totalWeeks: 12, sprintId: 77 });
      expect(record.modifier).toBe(1.25);
      expect(record.source).toBe(MODIFIER_SOURCE.LEGACY_OVERRIDE);
      expect(record.requiresCorrection).toBe(false);
    });

    it('treats the scaffold 1.0 without metadata as the old default', () => {
      const record = resolveWeekPolicy({ week: week(2, false, 1.0), strategy: 'undulating', totalWeeks: 12, sprintId: 77 });
      expect(record.modifier).toBe(0.85);
      expect(record.source).toBe(MODIFIER_SOURCE.STRATEGY);
    });

    it('flags an explicit but unusable recorded override', () => {
      expect(withPolicy(2, { 2: 0 }).requiresCorrection).toBe(true);
      expect(withPolicy(2, { 2: 'x' }).requiresCorrection).toBe(true);
    });

    it('keeps resolveWeekModifier as the number-only view', () => {
      // Backward compatibility: existing callers must not have to change.
      expect(resolve(week(2), 'undulating')).toBe(0.85);
      expect(resolveWeekModifier({
        week: week(2), strategy: 'undulating', totalWeeks: 12, sprintId: 77,
        policy: { overrideByWeek: { 2: 1.0 } },
      })).toBe(1.0);
    });
  });

  describe('`random` is STABLE, not rerolled (contract §6 line 256)', () => {
    it('returns the same modifier for the same sprint and week, every time', () => {
      // "use a stable seed derived from Sprint ID + ordinal week + policyVersion…
      //  Regeneration/retry does not reroll the week's load."
      // With a bare Math.random() every regeneration changed the prescribed load.
      const first = resolve(week(2), 'random');
      for (let i = 0; i < 25; i++) {
        expect(resolve(week(2), 'random')).toBe(first);
      }
    });

    it('varies by week and by sprint, so it is still a real strategy', () => {
      const weeks = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => resolve(week(n), 'random'));
      expect(new Set(weeks).size).toBeGreaterThan(1);
      const sprints = [1, 2, 3, 4, 5, 6].map((id) => resolve(week(2), 'random', 12, { sprintId: id }));
      expect(new Set(sprints).size).toBeGreaterThan(1);
    });

    it('stays inside the [0.85, 1.15) band the contract preserves', () => {
      for (let weekNumber = 1; weekNumber <= 60; weekNumber++) {
        const value = resolve(week(weekNumber), 'random');
        expect(value).toBeGreaterThanOrEqual(0.85);
        expect(value).toBeLessThan(1.15);
      }
    });

    it('survives a missing sprintId without becoming non-deterministic', () => {
      // Legacy/unit callers may not supply one; determinism must not depend on it.
      const a = resolveWeekModifier({ week: week(2), strategy: 'random', totalWeeks: 12 });
      const b = resolveWeekModifier({ week: week(2), strategy: 'random', totalWeeks: 12 });
      expect(a).toBe(b);
    });
  });

  it('still reads the scaffold default the calendar contract actually persists', () => {
    // Pins the coupling: if the scaffold ever stops persisting 1.0 (e.g. moves to
    // `null` for "unset"), the meaning of "no override" changes and this fails
    // loudly rather than silently re-routing every week through the strategy.
    const schedule = buildSprintSchedule({
      ...SPRINT_DEFAULTS,
      startDate: '2026-03-02',
      durationWeeks: 5,
      classesPerWeek: 2,
      // The generator's own predicate for this rotation, so the fixture cannot
      // drift from the contract's vocabulary.
      focusRotation: [...SPRINT_DEFAULTS.focusRotation],
      frequencyPattern: ['monday', 'wednesday'],
    });
    const nonDeload = schedule.filter((w) => !w.isDeloadWeek);
    expect(nonDeload.length).toBeGreaterThan(0);
    for (const w of nonDeload) {
      expect(w.intensityModifier).toBe(SCAFFOLD_MODIFIER);
    }
    expect(schedule.find((w) => w.isDeloadWeek)?.intensityModifier).toBe(DELOAD_MODIFIER);
  });
});
