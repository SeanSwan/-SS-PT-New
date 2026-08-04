/**
 * workoutAchievementEvaluator contract (SWA-87 follow-up)
 * =======================================================
 * Production had 1,067 active achievements and ZERO ever awarded. This module is the missing
 * connection between logging a workout and earning one, so these tests lock the two properties
 * that make it safe to run on every workout: it must award the right things, and it must never
 * award the wrong ones.
 *
 * The over-award cases below are not hypothetical — they were caught in review against the real
 * catalog. `weekend_warrior` carries `requirements: [{type:'day_of_week', days:[0,6]}]`,
 * `weekly_3x_4wk` is category `streak` (3/week for 4 weeks, NOT "12 workouts"), and
 * `outdoor_workout_1` is category `special` (a context, not a count). A naive
 * `maxProgress <= count` rule hands all three to users who never earned them.
 */
import { describe, expect, it, vi } from 'vitest';
import { evaluateWorkoutAchievements } from '../../services/gamification/workoutAchievementEvaluator.mjs';

const makeModels = ({ completedWorkouts = 0, owned = [], catalog = [], createImpl } = {}) => {
  const created = [];
  return {
    created,
    models: {
      WorkoutSession: { count: vi.fn(async () => completedWorkouts) },
      UserAchievement: {
        findAll: vi.fn(async () => owned.map((id) => ({ achievementId: id }))),
        create: vi.fn(async (row) => {
          if (createImpl) return createImpl(row);
          created.push(row);
          return row;
        }),
      },
      // The real query filters in SQL; the stub returns what SQL would have returned so the test
      // exercises the JS-side requirements filter rather than re-implementing the WHERE clause.
      Achievement: { findAll: vi.fn(async () => catalog) },
    },
  };
};

const ACH = (id, name, extra = {}) => ({
  id, name, xpReward: 10, maxProgress: 5, requirements: [], ...extra,
});

describe('evaluateWorkoutAchievements', () => {
  it('awards a qualifying pure-count achievement and grants its XP through the ledger seam', async () => {
    const { models, created } = makeModels({
      completedWorkouts: 10,
      catalog: [ACH(1, 'workout_count_5')],
    });
    const awardPoints = vi.fn(async ({ xpReward }) => ({
      pointsAwarded: xpReward,
      newBalance: 410,
      newLevel: 3,
      newTier: 'first_flight',
    }));
    const result = await evaluateWorkoutAchievements({ userId: 42, models, awardPoints });

    expect(result.awarded).toHaveLength(1);
    expect(result.completedWorkouts).toBe(10);
    expect(created[0]).toMatchObject({
      userId: 42, achievementId: 1, isCompleted: true, progress: 100, pointsAwarded: 10,
    });
    expect(created[0].earnedAt).toBeInstanceOf(Date);
    expect(awardPoints).toHaveBeenCalledWith(expect.objectContaining({
      achievementId: 1,
      name: 'workout_count_5',
      xpReward: 10,
    }));
    expect(result).toEqual(expect.objectContaining({
      pointsAwarded: 10,
      newBalance: 410,
      newLevel: 3,
      newTier: 'first_flight',
    }));
  });
  it('REFUSES an achievement carrying an unmet encoded requirement (weekend_warrior)', async () => {
    const { models, created } = makeModels({
      completedWorkouts: 100,
      catalog: [ACH(2, 'weekend_warrior', {
        requirements: [{ type: 'day_of_week', days: [0, 6] }],
      })],
    });
    const result = await evaluateWorkoutAchievements({ userId: 42, models });

    expect(result.awarded).toHaveLength(0);
    expect(created).toHaveLength(0);
  });

  it('awards nothing when the user has no completed workouts', async () => {
    const { models } = makeModels({ completedWorkouts: 0, catalog: [ACH(1, 'workout_count_5')] });
    const result = await evaluateWorkoutAchievements({ userId: 42, models });
    expect(result.awarded).toHaveLength(0);
    // Must not even query the catalog — a user with zero workouts cannot qualify for anything.
    expect(models.Achievement.findAll).not.toHaveBeenCalled();
  });

  it('excludes already-owned achievements from the catalog query (idempotency)', async () => {
    const { models } = makeModels({ completedWorkouts: 10, owned: [1, 2], catalog: [] });
    await evaluateWorkoutAchievements({ userId: 42, models });

    const where = models.Achievement.findAll.mock.calls[0][0].where;
    expect(where.id).toBeDefined(); // notIn owned
    expect(where.category).toBeDefined(); // streak/special excluded
  });

  it('surfaces a unique violation so the caller can roll back its savepoint cleanly', async () => {
    const dup = Object.assign(new Error('duplicate key'), { parent: { code: '23505' } });
    const { models } = makeModels({
      completedWorkouts: 10,
      catalog: [ACH(1, 'workout_count_5')],
      createImpl: () => { throw dup; },
    });
    await expect(evaluateWorkoutAchievements({ userId: 42, models }))
      .rejects.toThrow('duplicate key');
  });
  it('does NOT swallow a real database error — that must surface', async () => {
    const boom = Object.assign(new Error('connection terminated'), { parent: { code: '57P01' } });
    const { models } = makeModels({
      completedWorkouts: 10,
      catalog: [ACH(1, 'workout_count_5')],
      createImpl: () => { throw boom; },
    });
    await expect(evaluateWorkoutAchievements({ userId: 42, models }))
      .rejects.toThrow('connection terminated');
  });

  it('returns an empty result rather than throwing when models or userId are absent', async () => {
    await expect(evaluateWorkoutAchievements({})).resolves.toEqual({ awarded: [], completedWorkouts: 0 });
    await expect(evaluateWorkoutAchievements({ userId: 1, models: {} }))
      .resolves.toEqual({ awarded: [], completedWorkouts: 0 });
  });

  it('tolerates a non-numeric xpReward without writing NaN into pointsAwarded', async () => {
    const { models, created } = makeModels({
      completedWorkouts: 10,
      catalog: [ACH(1, 'workout_count_5', { xpReward: null })],
    });
    await evaluateWorkoutAchievements({ userId: 42, models });
    expect(created[0].pointsAwarded).toBe(0);
  });
});
