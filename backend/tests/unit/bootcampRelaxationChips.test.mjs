/**
 * SWA-105 Slice 2 (Swan side) — the R5 always-legal guarantee, per-exercise
 * rung stamping, and honest fact-chip emission on generated records.
 *
 * The regression that matters most here is the one slice 1 left behind: under a
 * narrow equipment profile the old fail-open returned the UNFILTERED pool, so
 * the D1 bug came back through the door slice 1 built. These tests hold the
 * line that a starved room produces a SIMPLER class, never a wrong one.
 */
import { describe, expect, it } from 'vitest';

import { applyDayTypeContract } from '../../services/bootcamp/dayTypeContract.mjs';
import {
  ALWAYS_LEGAL_EXERCISES, alwaysLegalTopUp,
} from '../../services/bootcamp/alwaysLegal.mjs';
import { chipsForExercise, factsForExercise } from '../../services/bootcamp/bootcampChips.mjs';
import { generateBoard2 } from '../../services/bootcamp/classStyleModifiers.mjs';
import { __testing__ } from '../../services/bootcamp/bootcampGenerator.mjs';
import { CHIPS } from '../../../shared/bootcamp-core/constants.mjs';
import { summarizeRelaxations } from '../../../shared/bootcamp-core/relaxation.mjs';

const DAY_TYPES = ['lower_body', 'upper_body', 'cardio', 'full_body'];

describe('the always-legal set makes R5 a guarantee, not a search', () => {
  it('needs zero equipment and instant setup, by construction', () => {
    for (const exercise of ALWAYS_LEGAL_EXERCISES) {
      expect(exercise.equipment).toEqual([]);
      expect(exercise.setupTimeSec).toBe(0);
      expect(exercise.isAlwaysLegal).toBe(true);
    }
  });

  it('leaves EVERY day type enough pinned exercises to fill a collapsed class', () => {
    // A small class collapses to 1-2 stations x 3-4 exercises. If any rotation
    // could not clear that from the pinned set alone, R5 would not be a
    // guarantee and R6 would be reachable through pool construction.
    for (const dayType of DAY_TYPES) {
      const result = applyDayTypeContract([], dayType, 4);
      expect(result.pool.length, `${dayType} pinned coverage`).toBeGreaterThanOrEqual(4);
      expect(result.exhausted, `${dayType} must not exhaust`).toBe(false);
    }
  });

  it('gives upper day a real PULL, not a push-only fallback', () => {
    const result = applyDayTypeContract([], 'upper_body', 4);
    const patterns = result.pool.map((e) => e.coreMovement.pattern);
    expect(patterns.some((p) => p?.startsWith('push'))).toBe(true);
    expect(patterns.some((p) => p?.startsWith('pull'))).toBe(true);
  });

  it('runs the pinned set through the SAME day contract — no special path', () => {
    // A bodyweight squat is pinned, but it is still illegal on upper day.
    const upper = applyDayTypeContract([], 'upper_body', 4);
    expect(upper.pool.map((e) => e.key)).not.toContain('bodyweight_squat');

    const lower = applyDayTypeContract([], 'lower_body', 4);
    expect(lower.pool.map((e) => e.key)).not.toContain('push_up');
  });

  it('carries the mods Board 2/3 are generated from', () => {
    // Without these, the joint-friendly and low-impact boards silently vanish
    // in exactly the thin, equipment-poor room where R5 fired.
    for (const exercise of ALWAYS_LEGAL_EXERCISES) {
      expect(exercise.easy, `${exercise.key} needs an easier regression`).toBeTruthy();
      const jointMods = ['kneeMod', 'ankleMod', 'backMod', 'shoulderMod', 'wristMod', 'elbowMod', 'hipMod']
        .filter((field) => exercise[field]);
      expect(jointMods.length, `${exercise.key} needs at least one joint mod`).toBeGreaterThan(0);
    }
  });

  it('actually produces Board 2/3 rows once built into records', () => {
    const built = ALWAYS_LEGAL_EXERCISES.map((ex, i) => __testing__.buildExerciseRecord(ex, {
      durationSec: 40, sortOrder: i + 1,
    }));
    const alternatives = generateBoard2(built);
    expect(alternatives.length).toBeGreaterThanOrEqual(ALWAYS_LEGAL_EXERCISES.length);
  });

  it('de-dupes a pinned exercise the gym already stocks', () => {
    const pool = [{ key: 'push_up', name: 'Push-Up' }];
    expect(alwaysLegalTopUp(pool).map((e) => e.key)).not.toContain('push_up');
    // Matching is name-tolerant: a Rolodex row keyed differently but named the
    // same must not produce the same movement twice on two boards.
    expect(alwaysLegalTopUp([{ key: 'rolodex_991', name: 'Front Plank' }])
      .map((e) => e.key)).not.toContain('front_plank');
  });
});

describe('per-exercise rung stamping', () => {
  const UPPERS = [
    { key: 'db_bench', muscles: ['chest', 'triceps'], category: 'push' },
    { key: 'row', muscles: ['lats', 'biceps'], category: 'pull' },
  ];

  it('stamps R0 on a pool that never had to relax', () => {
    const result = applyDayTypeContract(UPPERS, 'upper_body', 2);
    expect(result.rung).toBe('R0');
    for (const exercise of result.pool) expect(exercise.selectionRung).toBe('R0');
  });

  it('keeps strict members at R0 while the pool as a whole descends to R5', () => {
    // One real upper exercise, four needed -> bodyweight top-up.
    const result = applyDayTypeContract([UPPERS[0]], 'upper_body', 4);
    expect(result.rung).toBe('R5');

    const byKey = Object.fromEntries(result.pool.map((e) => [e.key, e.selectionRung]));
    expect(byKey.db_bench).toBe('R0');
    expect(byKey.push_up).toBe('R5');
    expect(result.relaxedCounts.R5).toBeGreaterThan(0);
  });

  it('a healthy pool never pulls a bodyweight substitute in', () => {
    // The false-alarm regression: an over-stated slot requirement made a
    // sufficient pool look starved, injected pinned exercises, and warned the
    // trainer about a relaxation the shipped class never used.
    const healthy = Array.from({ length: 20 }, (_, i) => ({
      key: `chest_${i}`, muscles: ['chest', 'triceps'], category: 'push',
    }));
    const result = applyDayTypeContract(healthy, 'upper_body', 12);
    expect(result.rung).toBe('R0');
    expect(result.pool.map((e) => e.key)).not.toContain('push_up');
    expect(result.relaxedCounts).toEqual({});
  });

  it('names WHICH constraint relaxed in the explanation, per the R3 DoD', () => {
    const result = applyDayTypeContract([UPPERS[0]], 'upper_body', 4);
    expect(result.explanation).toMatch(/EQUIPMENT/);
    expect(result.explanation).toMatch(/R5/);
  });

  it('does not leak the internal pattern-legality marker onto the pool', () => {
    const result = applyDayTypeContract(UPPERS, 'upper_body', 2);
    for (const exercise of result.pool) {
      expect(exercise).not.toHaveProperty('__patternLegal');
    }
  });
});

describe('fact chips are derived, capped, and never invented', () => {
  it('emits only what generate-time can prove', () => {
    const lowImpactInstant = {
      coreMovement: { primaryRegion: 'upper', regions: ['upper'], pattern: 'push_horizontal', joints: [], impact: 'low' },
      setupTimeSec: 0,
      selectionRung: 'R0',
    };
    expect(chipsForExercise(lowImpactInstant)).toEqual(['low_impact', 'no_setup']);
  });

  it('refuses to call a moderate-impact movement low impact', () => {
    const moderate = {
      coreMovement: { primaryRegion: 'lower', regions: ['lower'], pattern: 'gait', joints: [], impact: 'moderate' },
      setupTimeSec: 60,
    };
    expect(factsForExercise(moderate).lowImpact).toBe(false);
    expect(chipsForExercise(moderate)).toEqual([]);
  });

  it('leads with the bent rule on a relaxed pick', () => {
    const relaxed = {
      coreMovement: { primaryRegion: 'upper', regions: ['upper'], pattern: 'push_horizontal', joints: [], impact: 'low' },
      setupTimeSec: 0,
      selectionRung: 'R5',
    };
    expect(chipsForExercise(relaxed)[0]).toBe('bodyweight_sub');
    expect(chipsForExercise(relaxed)).toHaveLength(2);
  });

  it('emits nothing when the exercise was never classified', () => {
    expect(chipsForExercise({ key: 'mystery' })).toEqual([]);
  });

  it('only ever emits members of the closed enum', () => {
    const result = applyDayTypeContract([], 'full_body', 6);
    for (const exercise of result.pool) {
      for (const chip of chipsForExercise(exercise)) expect(CHIPS).toContain(chip);
    }
  });
});

describe('generated records carry the selection story', () => {
  const pooled = {
    key: 'push_up',
    name: 'Push-Up',
    muscles: ['chest', 'triceps'],
    equipment: [],
    setupTimeSec: 0,
    coreMovement: { primaryRegion: 'upper', regions: ['upper'], pattern: 'push_horizontal', joints: [], impact: 'low' },
    selectionRung: 'R5',
  };

  it('buildExerciseRecord stamps rung + chips onto the record', () => {
    const record = __testing__.buildExerciseRecord(pooled, { durationSec: 40, sortOrder: 1 });
    expect(record.selectionRung).toBe('R5');
    expect(record.selectionChips[0]).toBe('bodyweight_sub');
  });

  it('defaults to R0 with no relaxation chip for anything the ladder never touched', () => {
    const finisher = { name: 'Jumping Jacks', muscles: 'full_body' };
    const record = __testing__.buildExerciseRecord(finisher, { durationSec: 30, sortOrder: 1 });
    expect(record.selectionRung).toBe('R0');
    expect(record.selectionChips.includes('bodyweight_sub')).toBe(false);
  });

  it('the class-level summary composes from the built records', () => {
    // This is the exact composition the generator performs before returning.
    const records = [
      __testing__.buildExerciseRecord(pooled, { durationSec: 40, sortOrder: 1 }),
      __testing__.buildExerciseRecord({ ...pooled, key: 'x', selectionRung: 'R0' }, { durationSec: 40, sortOrder: 2 }),
    ];
    const summary = summarizeRelaxations(records.map((r) => ({ rung: r.selectionRung })));
    expect(summary.counts).toEqual({ R5: 1 });
    expect(summary.constraints).toEqual(['equipment']);
  });

  it('a Board-2 alternative does NOT inherit the parent selection story', () => {
    // The alternative is a different exercise, derived from a modification
    // name. Inheriting the parent's chips would have it claim "bodyweight
    // substitute" because the exercise it replaces was one.
    const parent = __testing__.buildExerciseRecord(
      { ...pooled, kneeMod: 'Wall Push-Up', easyVariation: 'Incline Push-Up' },
      { durationSec: 40, sortOrder: 1 },
    );
    expect(parent.selectionChips).toContain('bodyweight_sub');

    const alternatives = generateBoard2([parent]);
    expect(alternatives.length).toBeGreaterThan(0);
    for (const alternative of alternatives) {
      expect(alternative.selectionRung).toBe('R0');
      expect(alternative.selectionChips).toEqual([]);
    }
  });
});
