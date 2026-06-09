import { describe, expect, it } from 'vitest';
import type { ExerciseEntry } from '../../services/nasmApiService';
import { mapWorkoutExercisesForPdf } from './WorkoutLogger.pdf';

describe('WorkoutLogger PDF export mapper', () => {
  it('preserves missing rating fields as null instead of PDF zero scores', () => {
    const exercises: ExerciseEntry[] = [
      {
        exerciseId: 'deadlift',
        exerciseName: 'Deadlift',
        sets: [
          {
            setNumber: 1,
            weight: 135,
            reps: 5,
            rpe: null,
            tempo: '2-0-2',
            restTime: 90,
            formQuality: null,
          },
        ],
        formRating: null,
        painLevel: 0,
      },
    ];

    expect(mapWorkoutExercisesForPdf(exercises)).toEqual([
      expect.objectContaining({
        formRating: null,
        sets: [
          expect.objectContaining({
            rpe: null,
            formQuality: null,
          }),
        ],
      }),
    ]);
  });
});
