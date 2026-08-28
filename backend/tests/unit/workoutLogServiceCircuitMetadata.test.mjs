import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logWorkoutForClient } from '../../services/workout/workoutLogService.mjs';

vi.mock('../../models/index.mjs', () => {
  const WorkoutSession = {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn(async attrs => ({
      id: 'session-circuit-1',
      completedAt: attrs.completedAt,
      update: vi.fn().mockResolvedValue(undefined),
    })),
    update: vi.fn().mockResolvedValue([1]),
  };
  const WorkoutLog = { bulkCreate: vi.fn().mockResolvedValue([]) };
  return { getAllModels: () => ({ WorkoutSession, WorkoutLog }) };
});

vi.mock('../../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: vi.fn().mockResolvedValue({ alreadyAwarded: true }),
}));

import { getAllModels } from '../../models/index.mjs';

const sequelize = {
  transaction: vi.fn(async () => ({
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
  })),
};

describe('workoutLogService circuit metadata', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stamps circuit structure on every exercise row and preserves drop-set details', async () => {
    await logWorkoutForClient({
      clientId: 42,
      trainerId: 7,
      date: '2026-08-28',
      title: 'Back and Biceps',
      duration: 60,
      intensity: 8,
      sequelize,
      suppressEngagementSideEffects: true,
      exercises: [{
        exerciseName: 'Standing Cable High Row',
        circuitName: 'Circuit 1',
        circuitOrder: 1,
        exerciseRole: 'primary',
        sets: [
          { setNumber: 1, reps: 12, weight: 50, tempo: '2-1-2', setType: 'working', isometricHoldSeconds: 10 },
          { setNumber: 2, reps: 10, weight: 30, tempo: '2-1-2', setType: 'dropset', isometricHoldSeconds: 10 },
        ],
      }],
    });

    const rows = getAllModels().WorkoutLog.bulkCreate.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ circuitName: 'Circuit 1', circuitOrder: 1, exerciseRole: 'primary', setType: 'working', isometricHoldSeconds: 10 });
    expect(rows[1]).toMatchObject({ circuitName: 'Circuit 1', circuitOrder: 1, exerciseRole: 'primary', setType: 'dropset', isometricHoldSeconds: 10 });
  });
});
