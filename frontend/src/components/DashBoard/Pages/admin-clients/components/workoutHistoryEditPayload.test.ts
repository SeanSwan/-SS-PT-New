import { describe, expect, it } from 'vitest';

import { buildWorkoutEditExercises } from './workoutHistoryEditPayload';

describe('workoutHistoryEditPayload', () => {
  it('groups edit rows by exercise and renumbers sets sequentially', () => {
    const exercises = buildWorkoutEditExercises([
      { id: 1, exerciseName: 'Bench', setNumber: 3, reps: 8, weight: 100 },
      { id: 2, exerciseName: 'Bench', setNumber: 7, reps: 6, weight: 110 },
      { id: 3, exerciseName: 'Squat', setNumber: 2, reps: 5, weight: 135 },
    ] as any);

    expect(exercises).toEqual([
      {
        name: 'Bench',
        sets: [
          { setNumber: 1, reps: 8, weight: 100 },
          { setNumber: 2, reps: 6, weight: 110 },
        ],
      },
      {
        name: 'Squat',
        sets: [{ setNumber: 1, reps: 5, weight: 135 }],
      },
    ]);
  });

  it('keeps optional training fields only when meaningful', () => {
    const exercises = buildWorkoutEditExercises([
      {
        id: 1,
        exerciseName: 'Row',
        setNumber: 1,
        reps: undefined,
        weight: undefined,
        tempo: ' 3-1-1 ',
        rest: 90,
        rpe: 8,
        notes: ' grip ',
      },
      {
        id: 2,
        exerciseName: 'Row',
        setNumber: 2,
        reps: 10,
        weight: 95,
        tempo: '   ',
        rest: 0,
        rpe: 0,
        notes: '',
      },
    ] as any);

    expect(exercises).toEqual([
      {
        name: 'Row',
        sets: [
          { setNumber: 1, reps: 0, weight: 0, tempo: '3-1-1', rest: 90, rpe: 8, notes: 'grip' },
          { setNumber: 2, reps: 10, weight: 95 },
        ],
      },
    ]);
  });

  it('promotes the first canonical exercise note to exercise-level payload', () => {
    const exercises = buildWorkoutEditExercises([
      { id: 1, exerciseName: 'Curl', setNumber: 1, reps: 8, weight: 40 },
      {
        id: 2,
        exerciseName: 'Curl',
        setNumber: 2,
        reps: 8,
        weight: 45,
        exerciseNote: ' elbow stayed quiet ',
      },
    ] as any);

    expect(exercises).toEqual([
      {
        name: 'Curl',
        exerciseNote: 'elbow stayed quiet',
        sets: [
          { setNumber: 1, reps: 8, weight: 40 },
          { setNumber: 2, reps: 8, weight: 45 },
        ],
      },
    ]);
  });
});
