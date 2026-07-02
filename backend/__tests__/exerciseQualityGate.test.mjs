import { describe, expect, it } from 'vitest';
import {
  applyExerciseQualityGate,
  isHighImpactExercise,
  allowsHighImpact,
} from '../services/exerciseQualityGate.mjs';

const ankleHops = { key: 'ankle_hops', name: 'Ankle Hops', category: 'legs' };
const boxJump = { key: 'box_jump', name: 'Box Jump', category: 'legs' };
const gobletSquat = { key: 'goblet_squat', name: 'Goblet Squat', category: 'squat' };
const jumpRopeless = { key: 'push_up', name: 'Push Up', category: 'push' };

describe('isHighImpactExercise', () => {
  it('flags jumps, hops, bounds, plyo, and sprints by name/key', () => {
    expect(isHighImpactExercise(ankleHops)).toBe(true);
    expect(isHighImpactExercise(boxJump)).toBe(true);
    expect(isHighImpactExercise({ key: 'broad_bound', name: 'Broad Bound' })).toBe(true);
    expect(isHighImpactExercise({ key: 'plyo_lunge', name: 'Plyometric Lunge' })).toBe(true);
    expect(isHighImpactExercise({ key: 'hill_sprints', name: 'Hill Sprints' })).toBe(true);
  });

  it('does not flag proven low-impact strength staples', () => {
    expect(isHighImpactExercise(gobletSquat)).toBe(false);
    expect(isHighImpactExercise(jumpRopeless)).toBe(false);
    // Guard against substring false positives.
    expect(isHighImpactExercise({ key: 'hip_hinge', name: 'Hip Hinge' })).toBe(false);
  });
});

describe('applyExerciseQualityGate', () => {
  it('removes high-impact moves from a general low-impact selection (phase 2)', () => {
    const { allowed, rejected, gateStoodDown } = applyExerciseQualityGate(
      [ankleHops, gobletSquat, boxJump],
      { nasmPhase: 2 },
    );

    expect(allowed.map((e) => e.key)).toEqual(['goblet_squat']);
    expect(rejected.map((r) => r.key)).toEqual(['ankle_hops', 'box_jump']);
    expect(gateStoodDown).toBe(false);
  });

  it('allows high-impact work for hardcore style, power phase, and athletic goals', () => {
    expect(allowsHighImpact({ trainingStyleMode: 'hardcore' })).toBe(true);
    expect(allowsHighImpact({ nasmPhase: 5 })).toBe(true);
    expect(allowsHighImpact({ primaryGoal: 'athletic_performance' })).toBe(true);

    const { allowed, rejected } = applyExerciseQualityGate(
      [ankleHops, gobletSquat],
      { nasmPhase: 5 },
    );
    expect(allowed).toHaveLength(2);
    expect(rejected).toHaveLength(0);
  });

  it('fails open instead of emptying the pool when everything would be rejected', () => {
    const { allowed, gateStoodDown } = applyExerciseQualityGate(
      [ankleHops, boxJump],
      { nasmPhase: 2 },
    );
    expect(allowed).toHaveLength(2);
    expect(gateStoodDown).toBe(true);
  });
});
