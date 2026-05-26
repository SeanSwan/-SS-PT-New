import { describe, expect, it } from 'vitest';
import type { ExerciseEntry } from '../../services/nasmApiService';
import { applyAIUpdateSet } from './aiWorkoutEventReducers';

const makeExercise = (exerciseName: string): ExerciseEntry => ({
  exerciseId: `fixture-${exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
  exerciseName,
  sets: [
    {
      setNumber: 1,
      weight: 0,
      reps: 0,
      rpe: null,
      tempo: '2-0-2',
      restTime: 60,
      formQuality: null,
      notes: '',
    },
    {
      setNumber: 2,
      weight: 0,
      reps: 0,
      rpe: null,
      tempo: '2-0-2',
      restTime: 60,
      formQuality: null,
      notes: '',
    },
  ],
  formRating: null,
  painLevel: 0,
  performanceNotes: '',
});

describe('applyAIUpdateSet', () => {
  it('updates the dictated set for a matching exercise without mutating siblings', () => {
    const exercises = [makeExercise('Bench Press'), makeExercise('Goblet Squat')];

    const next = applyAIUpdateSet(exercises, {
      exerciseName: 'bench press',
      setNumber: 2,
      weight: 135,
      reps: 8,
      rpe: 7,
      tempo: '3-1-1',
    });

    expect(next).not.toBe(exercises);
    expect(next[0].sets[1]).toMatchObject({
      setNumber: 2,
      weight: 135,
      reps: 8,
      rpe: 7,
      tempo: '3-1-1',
    });
    expect(next[0].sets[0]).toEqual(exercises[0].sets[0]);
    expect(next[1]).toBe(exercises[1]);
  });

  it('falls back to the last set when no set number is supplied', () => {
    const exercises = [makeExercise('Lat Pulldown')];

    const next = applyAIUpdateSet(exercises, {
      exerciseName: 'lat',
      reps: 12,
    });

    expect(next[0].sets[1].reps).toBe(12);
    expect(next[0].sets[0].reps).toBe(0);
  });

  it('returns the original array when the exercise cannot be matched', () => {
    const exercises = [makeExercise('Pushup')];

    const next = applyAIUpdateSet(exercises, {
      exerciseName: 'deadlift',
      weight: 225,
    });

    expect(next).toBe(exercises);
  });

  it('rejects invalid zero-based set numbers instead of updating the last set', () => {
    const exercises = [makeExercise('Cable Row')];

    const next = applyAIUpdateSet(exercises, {
      exerciseName: 'row',
      setNumber: 0,
      reps: 15,
    });

    expect(next).toBe(exercises);
  });
});
