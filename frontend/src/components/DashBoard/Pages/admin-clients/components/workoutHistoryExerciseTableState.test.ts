import { describe, expect, it } from 'vitest';

import { buildWorkoutHistoryExerciseTableState } from './workoutHistoryExerciseTableState';

describe('workoutHistoryExerciseTableState', () => {
  it('derives optional column flags from the active log buffer', () => {
    const state = buildWorkoutHistoryExerciseTableState([
      {
        id: 1,
        exerciseName: 'Bench',
        setNumber: 1,
        reps: 8,
        weight: 0,
        tempo: '3-1-1',
        rest: 90,
        rpe: 8,
      },
      { id: 2, exerciseName: 'Bench', setNumber: 2, reps: 8, weight: 100 },
    ] as any);

    expect(state).toMatchObject({
      hasTempo: true,
      hasRest: true,
      hasRPE: true,
      hasWeight: true,
    });
  });

  it('keeps optional flags false when fields are empty or zero', () => {
    const state = buildWorkoutHistoryExerciseTableState([
      { id: 1, exerciseName: 'Row', setNumber: 1, reps: 10, weight: 0, tempo: '', rest: 0, rpe: 0 },
    ] as any);

    expect(state).toMatchObject({
      hasTempo: false,
      hasRest: false,
      hasRPE: false,
      hasWeight: false,
    });
  });

  it('groups rows by exercise while preserving group and row order', () => {
    const logs = [
      { id: 1, exerciseName: 'Squat', setNumber: 1, reps: 5, weight: 135 },
      { id: 2, exerciseName: 'Press', setNumber: 1, reps: 6, weight: 90 },
      { id: 3, exerciseName: 'Squat', setNumber: 2, reps: 5, weight: 145 },
    ];

    const state = buildWorkoutHistoryExerciseTableState(logs as any);

    expect(state.exerciseGroups.map(([name]) => name)).toEqual(['Squat', 'Press']);
    expect(state.exerciseGroups[0][1].map((row) => row.id)).toEqual([1, 3]);
    expect(state.exerciseGroups[1][1].map((row) => row.id)).toEqual([2]);
    expect(logs).toHaveLength(3);
  });
});
