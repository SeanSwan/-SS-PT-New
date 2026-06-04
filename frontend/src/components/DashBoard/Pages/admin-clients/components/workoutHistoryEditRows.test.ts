import { describe, expect, it } from 'vitest';

import {
  appendWorkoutEditRow,
  removeWorkoutEditRow,
  updateWorkoutEditField,
  updateWorkoutExerciseNote,
} from './workoutHistoryEditRows';

describe('workoutHistoryEditRows', () => {
  it('updates text fields as strings and numeric fields as numbers', () => {
    const logs = [
      { id: 1, exerciseName: 'Bench', setNumber: 1, reps: 8, weight: 100, notes: 'old' },
    ];

    expect(updateWorkoutEditField(logs as any, 0, 'notes', 'new note')).toMatchObject([
      { notes: 'new note', reps: 8 },
    ]);
    expect(updateWorkoutEditField(logs as any, 0, 'reps', '12')).toMatchObject([
      { reps: 12, notes: 'old' },
    ]);
  });

  it('clears numeric fields to undefined and coerces invalid numeric input to zero', () => {
    const logs = [
      { id: 1, exerciseName: 'Row', setNumber: 1, reps: 10, weight: 95 },
    ];

    expect(updateWorkoutEditField(logs as any, 0, 'weight', '  ')).toMatchObject([
      { weight: undefined },
    ]);
    expect(updateWorkoutEditField(logs as any, 0, 'weight', 'oops')).toMatchObject([
      { weight: 0 },
    ]);
  });

  it('updates an exercise-level note across the matching group only', () => {
    const logs = [
      { id: 1, exerciseName: 'Curl', setNumber: 1, reps: 8, weight: 40 },
      { id: 2, exerciseName: 'Curl', setNumber: 2, reps: 8, weight: 45 },
      { id: 3, exerciseName: 'Press', setNumber: 1, reps: 6, weight: 90 },
    ];

    const result = updateWorkoutExerciseNote(logs as any, 'Curl', 'elbow quiet');

    expect(result).toMatchObject([
      { exerciseNote: 'elbow quiet' },
      { exerciseNote: 'elbow quiet' },
      { exerciseName: 'Press' },
    ]);
    expect(result[2]).not.toHaveProperty('exerciseNote');
  });

  it('adds a row with the next set number and preserves the group exercise note', () => {
    const logs = [
      {
        id: 1,
        exerciseName: 'Squat',
        setNumber: 1,
        reps: 5,
        weight: 135,
        exerciseNote: 'knee tracking clean',
      },
      { id: 2, exerciseName: 'Squat', setNumber: 2, reps: 5, weight: 145 },
    ];

    expect(appendWorkoutEditRow(logs as any, 'Squat', -1)).toMatchObject([
      { id: 1 },
      { id: 2 },
      {
        id: -1,
        exerciseName: 'Squat',
        setNumber: 3,
        reps: 0,
        weight: 0,
        exerciseNote: 'knee tracking clean',
      },
    ]);
  });

  it('removes a row by index without mutating the original list', () => {
    const logs = [
      { id: 1, exerciseName: 'Bench', setNumber: 1, reps: 8, weight: 100 },
      { id: 2, exerciseName: 'Bench', setNumber: 2, reps: 6, weight: 110 },
    ];

    expect(removeWorkoutEditRow(logs as any, 0)).toMatchObject([{ id: 2 }]);
    expect(logs).toHaveLength(2);
  });
});
