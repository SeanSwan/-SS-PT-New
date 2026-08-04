import { describe, expect, it, vi } from 'vitest';
import { awardWorkoutAchievementsBestEffort } from '../../services/gamification/workoutAchievementAwardStep.mjs';

const makeDeps = () => ({
  sequelize: { query: vi.fn(async () => []) },
  logger: { error: vi.fn() },
  getAllModels: vi.fn(() => ({ marker: true })),
  evaluateWorkoutAchievements: vi.fn(async ({ awardPoints }) => {
    const ledger = await awardPoints({ achievementId: 7, name: 'Five Workouts', xpReward: 25 });
    return {
      awarded: [{ achievementId: 7, name: 'Five Workouts', xpReward: 25 }],
      completedWorkouts: 5,
      pointsAwarded: ledger.pointsAwarded,
      newBalance: ledger.newBalance,
    };
  }),
  recordLedgerEntry: vi.fn(async () => ({ pointsAwarded: 25, newBalance: 425 })),
});

describe('awardWorkoutAchievementsBestEffort', () => {
  it('uses a savepoint and grants achievement XP through the central ledger', async () => {
    const deps = makeDeps();
    const transaction = { id: 'tx-1' };
    const result = await awardWorkoutAchievementsBestEffort({
      userId: 42,
      workoutId: 'workout-1',
      awardedBy: 9,
      transaction,
    }, deps);

    expect(deps.sequelize.query).toHaveBeenNthCalledWith(
      1,
      'SAVEPOINT sp_workout_achievement_awards',
      { transaction },
    );
    expect(deps.recordLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      points: 25,
      source: 'achievement_earned',
      idempotencyKey: 'workout-achievement:42:7',
      metadata: { achievementId: 7, workoutId: 'workout-1' },
      awardedBy: 9,
    }), transaction);
    expect(deps.sequelize.query).toHaveBeenLastCalledWith(
      'RELEASE SAVEPOINT sp_workout_achievement_awards',
      { transaction },
    );
    expect(result).toEqual(expect.objectContaining({ pointsAwarded: 25, newBalance: 425 }));
  });

  it('surfaces savepoint creation failure because the transaction cannot be recovered', async () => {
    const deps = makeDeps();
    deps.sequelize.query.mockRejectedValueOnce(new Error('transaction unavailable'));

    await expect(awardWorkoutAchievementsBestEffort({
      userId: 42,
      workoutId: 'workout-3',
      awardedBy: 9,
      transaction: { id: 'tx-3' },
    }, deps)).rejects.toThrow('transaction unavailable');
  });

  it('rolls back the savepoint and preserves prior workout XP when evaluation fails', async () => {
    const deps = makeDeps();
    deps.evaluateWorkoutAchievements.mockRejectedValue(new Error('achievement insert failed'));
    const transaction = { id: 'tx-2' };

    const result = await awardWorkoutAchievementsBestEffort({
      userId: 42,
      workoutId: 'workout-2',
      awardedBy: 9,
      transaction,
    }, deps);

    expect(deps.sequelize.query).toHaveBeenNthCalledWith(
      2,
      'ROLLBACK TO SAVEPOINT sp_workout_achievement_awards',
      { transaction },
    );
    expect(result).toEqual({ awarded: [], pointsAwarded: 0 });
    expect(deps.logger.error).toHaveBeenCalledWith(
      'Achievement evaluation failed; savepoint rolled back',
      expect.objectContaining({ userId: 42, workoutId: 'workout-2' }),
    );
  });
  it('recovers from a unique violation and leaves the outer transaction committable', async () => {
    const deps = makeDeps();
    const uniqueViolation = Object.assign(new Error('duplicate achievement'), { code: '23505' });
    deps.evaluateWorkoutAchievements.mockRejectedValue(uniqueViolation);
    const transaction = { id: 'tx-unique' };

    const result = await awardWorkoutAchievementsBestEffort({
      userId: 42,
      workoutId: 'workout-unique',
      awardedBy: 9,
      transaction,
    }, deps);
    await deps.sequelize.query('SELECT 1', { transaction });

    expect(deps.sequelize.query.mock.calls.map(([sql]) => sql)).toEqual([
      'SAVEPOINT sp_workout_achievement_awards',
      'ROLLBACK TO SAVEPOINT sp_workout_achievement_awards',
      'SELECT 1',
    ]);
    expect(result).toEqual({ awarded: [], pointsAwarded: 0 });
  });
});
