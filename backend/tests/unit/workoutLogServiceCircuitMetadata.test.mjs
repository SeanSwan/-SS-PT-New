import { describe, expect, it } from 'vitest';
import {
  buildWorkoutRows,
  normalizeAiExercises,
} from '../../services/workout/aiWorkoutDailyFormPayloadService.mjs';

describe('canonical daily-form circuit metadata', () => {
  it('stamps circuit structure on every exercise row and preserves drop-set details', () => {
    const exercises = normalizeAiExercises([{
      exerciseName: 'Standing Cable High Row',
      circuitName: 'Circuit 1',
      circuitOrder: 1,
      exerciseRole: 'primary',
      sets: [
        { reps: 12, weight: 50, tempo: '2-1-2', setType: 'working', isometricHoldSeconds: 10 },
        { reps: 10, weight: 30, tempo: '2-1-2', setType: 'dropset', isometricHoldSeconds: 10 },
      ],
    }]);

    expect(buildWorkoutRows(exercises, 'session-circuit-1')).toEqual([
      expect.objectContaining({ circuitName: 'Circuit 1', circuitOrder: 1, exerciseRole: 'primary', setType: 'working', isometricHoldSeconds: 10 }),
      expect.objectContaining({ circuitName: 'Circuit 1', circuitOrder: 1, exerciseRole: 'primary', setType: 'dropset', isometricHoldSeconds: 10 }),
    ]);
  });
});
