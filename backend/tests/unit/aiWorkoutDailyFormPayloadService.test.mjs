import { describe, expect, it } from 'vitest';

import { normalizeAiExercises } from '../../services/workout/aiWorkoutDailyFormPayloadService.mjs';

describe('aiWorkoutDailyFormPayloadService', () => {
  it('normalizes Coach-generated rep ranges without writing zero-rep chart data', () => {
    const [exercise] = normalizeAiExercises([{
      name: 'Split Squat',
      sets: [
        { reps: '10-12', weight: 40, rpe: 'hard' },
        { reps: '8', weight: 35, rpe: '7' },
      ],
    }]);

    expect(exercise.sets[0]).toMatchObject({
      reps: 10,
      weight: 40,
      rpe: null,
    });
    expect(exercise.sets[1]).toMatchObject({
      reps: 8,
      weight: 35,
      rpe: 7,
    });
  });
});
