import { describe, expect, it } from 'vitest';
import {
  buildRecentExercisePerformance,
  computeMicroProgression,
  applyMicroProgressionToExercises,
  smallestLoadIncrementFor,
} from '../services/workoutProgressionService.mjs';

const perf = (sets) => ({ exerciseName: 'Goblet Squat', date: '2026-06-28', sets });

describe('buildRecentExercisePerformance', () => {
  it('keeps only the most recent session per exercise (rows newest-first)', () => {
    const map = buildRecentExercisePerformance([
      { date: '2026-06-28', formData: { exercises: [
        { exerciseName: 'Goblet Squat', weight: 50, reps: 10, rpe: 7 },
        { exerciseName: 'Goblet Squat', weight: 50, reps: 8, rpe: 8 },
      ] } },
      { date: '2026-06-21', formData: { exercises: [
        { exerciseName: 'Goblet Squat', weight: 45, reps: 12, rpe: 7 },
      ] } },
    ]);

    expect(map.goblet_squat.sets).toHaveLength(2);
    expect(map.goblet_squat.sets[0].weight).toBe(50);
    expect(map.goblet_squat.date).toBe('2026-06-28');
  });

  it('normalizes malformed values to null instead of crashing', () => {
    const map = buildRecentExercisePerformance([
      { date: '2026-06-28', formData: { exercises: [
        { exerciseName: 'Row', weight: 'heavy', reps: -2, rpe: null },
      ] } },
      { date: '2026-06-27', formData: { exercises: null } },
    ]);

    expect(map.row.sets[0]).toEqual({ weight: null, reps: null, rpe: null });
  });
});

describe('computeMicroProgression', () => {
  const exercise = { name: 'Goblet Squat', exerciseKey: 'goblet_squat', movementPattern: 'squat', reps: '8-12', muscles: ['quads', 'glutes'] };

  it('returns null with no comparable history (caller keeps %1RM)', () => {
    expect(computeMicroProgression(exercise, null, {})).toBeNull();
    expect(computeMicroProgression(exercise, perf([{ weight: null, reps: null, rpe: null }]), {})).toBeNull();
  });

  it('progresses by ONE rep before touching load', () => {
    const result = computeMicroProgression(exercise, perf([{ weight: 50, reps: 10, rpe: 7 }]), {});
    expect(result).toMatchObject({ action: 'add_rep', weight: 50, targetReps: 11 });
  });

  it('adds only the smallest load jump at the top of the rep range and resets reps', () => {
    const result = computeMicroProgression(exercise, perf([{ weight: 50, reps: 12, rpe: 7 }]), {});
    expect(result).toMatchObject({ action: 'add_load', weight: 55, targetReps: 8 });
  });

  it('uses a 2.5 lb increment for upper-body movements', () => {
    const press = { ...exercise, name: 'DB Bench Press', movementPattern: 'push' };
    expect(smallestLoadIncrementFor(press)).toBe(2.5);
    const result = computeMicroProgression(press, perf([{ weight: 40, reps: 12, rpe: 7 }]), {});
    expect(result).toMatchObject({ action: 'add_load', weight: 42.5 });
  });

  it('holds when the last exposure was near-max effort (RPE >= 9)', () => {
    const result = computeMicroProgression(exercise, perf([{ weight: 50, reps: 10, rpe: 9 }]), {});
    expect(result.action).toBe('hold');
    expect(result.weight).toBe(50);
  });

  it('holds when reported pain touches the movement muscles', () => {
    const result = computeMicroProgression(
      exercise,
      perf([{ weight: 50, reps: 10, rpe: 7 }]),
      { painWarnings: [{ bodyRegion: 'quads', painLevel: 5 }] },
    );
    expect(result.action).toBe('hold');
  });
});

describe('applyMicroProgressionToExercises', () => {
  it('stamps progression targets in place and reports the count', () => {
    const exercises = [
      { name: 'Goblet Squat', exerciseKey: 'goblet_squat', movementPattern: 'squat', reps: '8-12', muscles: [] },
      { name: 'Face Pull', exerciseKey: 'face_pull', movementPattern: 'pull', reps: '10-15', muscles: [] },
    ];
    const count = applyMicroProgressionToExercises(exercises, {
      goblet_squat: perf([{ weight: 50, reps: 10, rpe: 7 }]),
    }, {});

    expect(count).toBe(1);
    expect(exercises[0].progression.action).toBe('add_rep');
    expect(exercises[0].recommendedWeightMin).toBe(50);
    expect(exercises[0].recommendedWeightMax).toBe(50);
    expect(exercises[1].progression).toBeUndefined();
  });
});
