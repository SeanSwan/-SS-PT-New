import { describe, expect, it } from 'vitest';
import {
  applyVolumeDeloadPrescription,
  DELOAD_POLICY_VERSION,
} from '../../services/workoutPrescriptionDeload.mjs';

describe('H20 volume-only deload prescription', () => {
  it('reduces sets without changing reps, rest, load or tempo', () => {
    const [exercise] = applyVolumeDeloadPrescription([{
      sets: 4,
      reps: '8-12',
      restPeriod: 60,
      tempo: '2-0-2',
      recommendedWeightMin: 100,
    }]);

    expect(exercise.sets).toBe(2);
    expect(exercise.reps).toBe('8-12');
    expect(exercise.setScheme).toBe('2x8-12');
    expect(exercise.restPeriod).toBe(60);
    expect(exercise.tempo).toBe('2-0-2');
    expect(exercise.recommendedWeightMin).toBe(100);
    expect(exercise.deload).toEqual(expect.objectContaining({
      policyVersion: DELOAD_POLICY_VERSION,
      applied: true,
      reason: 'sets_reduced',
    }));
  });

  it('reduces a one-set numeric target and leaves unsupported prose unchanged', () => {
    const [reps, prose] = applyVolumeDeloadPrescription([
      { sets: 1, reps: '10-15', repGoal: '10-15' },
      { sets: 1, reps: 'controlled quality work' },
    ]);

    expect(reps.reps).toBe('7-10');
    expect(reps.repGoal).toBe('7-10');
    expect(reps.deload.reason).toBe('reps_reduced');
    expect(prose.reps).toBe('controlled quality work');
    expect(prose.deload).toEqual(expect.objectContaining({ applied: false, reason: 'unsupported_prescription' }));
  });
});

describe('lane F: numeric-string prescriptions keep their type through a deload', () => {
  it('reduces a string sets value and writes back a STRING, not a number', () => {
    const [exercise] = applyVolumeDeloadPrescription([{ sets: '4', reps: '10' }]);
    expect(exercise.sets).toBe('2');
    expect(typeof exercise.sets).toBe('string');
    expect(exercise.deload).toMatchObject({ applied: true, reason: 'sets_reduced' });
    expect(exercise.setScheme).toBe('2x10');
  });

  it('still writes a NUMBER when the input was numeric', () => {
    const [exercise] = applyVolumeDeloadPrescription([{ sets: 4, reps: 10 }]);
    expect(exercise.sets).toBe(2);
    expect(typeof exercise.sets).toBe('number');
  });
});
