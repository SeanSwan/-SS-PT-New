/**
 * ExerciseDetailPanel content-honesty guards (2026-06-18)
 * -------------------------------------------------------
 * Sean reported the Bootcamp exercise-detail content as "largely incorrect".
 * Two confirmed causes: (1) the generator sets mediumVariation = the exercise's
 * own name, rendering a nonsensical "Medium: <same exercise>" tier; (2) the
 * "How to Perform" cues are synthesized from the exercise NAME when no real
 * description exists, but were labeled as authoritative "Instructions".
 * These tests lock the guards.
 */
import { describe, expect, it } from 'vitest';
import { getExerciseTeachMe, isMeaningfulVariation } from './ExerciseDetailPanel';
import type { BootcampExercise } from '../../hooks/useBootcampAPI';

const base = (over: Partial<BootcampExercise>): BootcampExercise =>
  ({ exerciseName: 'Goblet Squat', muscleTargets: '', equipmentRequired: '', ...over } as BootcampExercise);

describe('isMeaningfulVariation', () => {
  it('rejects empty / whitespace / null / undefined', () => {
    expect(isMeaningfulVariation('', 'Squat')).toBe(false);
    expect(isMeaningfulVariation('   ', 'Squat')).toBe(false);
    expect(isMeaningfulVariation(null, 'Squat')).toBe(false);
    expect(isMeaningfulVariation(undefined, 'Squat')).toBe(false);
  });

  it('rejects a variation that just repeats the exercise name (the mediumVariation=ex.name bug)', () => {
    expect(isMeaningfulVariation('Goblet Squat', 'Goblet Squat')).toBe(false);
    expect(isMeaningfulVariation('  goblet squat ', 'Goblet Squat')).toBe(false); // case/space-insensitive
  });

  it('accepts a real alternative', () => {
    expect(isMeaningfulVariation('Box Squat to a higher target', 'Goblet Squat')).toBe(true);
  });
});

describe('getExerciseTeachMe honesty flag', () => {
  it('marks cues generic when there is no real description (name-keyword fallback)', () => {
    const info = getExerciseTeachMe(base({ exerciseName: 'Barbell Bench Press' }));
    expect(info.isGeneric).toBe(true);
    expect(info.tips.length).toBeGreaterThan(0);
  });

  it('uses the real description (not generic) when one is present and substantial', () => {
    const info = getExerciseTeachMe(base({
      exerciseName: 'Some Obscure Lift',
      ...( { description: 'Brace the core, hinge at the hips, and drive through the heels with control.' } as object),
    }));
    expect(info.isGeneric).toBe(false);
    expect(info.tips[0]).toContain('hinge at the hips');
  });

  it('falls back to generic when the description is too short to be useful', () => {
    const info = getExerciseTeachMe(base({
      exerciseName: 'Curl',
      ...( { description: 'do it' } as object),
    }));
    expect(info.isGeneric).toBe(true);
  });
});
