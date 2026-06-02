/**
 * Goal gamification command dispatcher contracts
 * ==============================================
 * Locks Coach gamification commands to compact, selected-client-safe
 * leaderboard, XP/streak, and achievement award receipts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({
  leaderboard = [],
  leaderboardCount = 0,
  user = null,
  streaks = [],
  achievements = [],
  achievement = null,
  userAchievement = null,
} = {}) {
  vi.resetModules();

  const findAllUsers = vi.fn(async () => leaderboard);
  const countUsers = vi.fn(async () => leaderboardCount);
  const findByPkUser = vi.fn(async () => user);
  const User = { findAll: findAllUsers, count: countUsers, findByPk: findByPkUser };

  const findAllStreaks = vi.fn(async () => streaks);
  const Streak = { findAll: findAllStreaks };

  const findAllUserAchievements = vi.fn(async () => achievements);
  const findOneUserAchievement = vi.fn(async () => userAchievement);
  const createUserAchievement = vi.fn(async (payload) => ({ id: 'user-achievement-1', ...payload }));
  const UserAchievement = {
    findAll: findAllUserAchievements,
    findOne: findOneUserAchievement,
    create: createUserAchievement,
  };

  const findByPkAchievement = vi.fn(async () => achievement);
  const Achievement = { findByPk: findByPkAchievement };

  const createPointTransaction = vi.fn(async () => ({ id: 100 }));
  const PointTransaction = { create: createPointTransaction };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ User, Streak, UserAchievement, Achievement, PointTransaction }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    findAllUsers,
    countUsers,
    findByPkUser,
    findAllStreaks,
    findAllUserAchievements,
    findOneUserAchievement,
    createUserAchievement,
    findByPkAchievement,
    createPointTransaction,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('goal gamification command dispatchers', () => {
  it('summarizes leaderboard rankings without echoing client names', async () => {
    const { dispatch, hasDispatcher, findAllUsers } = await loadDispatcher({
      leaderboardCount: 3,
      leaderboard: [
        { id: 7, firstName: 'Private', points: 500, level: 3, tier: 'bronze_forge' },
      ],
    });

    expect(hasDispatcher('view_leaderboard')).toBe(true);

    const result = await dispatch('view_leaderboard', { limit: 10, page: 1 }, {
      user: { id: 1, role: 'admin' },
    });

    expect(findAllUsers).toHaveBeenCalledWith(expect.objectContaining({
      order: [['points', 'DESC']],
      limit: 10,
      offset: 0,
    }));
    expect(result).toEqual({
      totalUsers: 3,
      returnedCount: 1,
      topUserId: 7,
      topPoints: 500,
      page: 1,
      limit: 10,
      tier: null,
    });
    expect(JSON.stringify(result)).not.toContain('Private');
  });

  it('summarizes selected-client XP, streak, and achievement counts', async () => {
    const { dispatch, hasDispatcher, findByPkUser, findAllStreaks } = await loadDispatcher({
      user: {
        id: 42,
        firstName: 'Private',
        points: 900,
        level: 4,
        tier: 'bronze_forge',
        streakDays: 6,
        totalWorkouts: 12,
        totalExercises: 80,
      },
      streaks: [
        { streakType: 'workout', currentCount: 6, longestCount: 9, isActive: true },
        { streakType: 'login', currentCount: 4, longestCount: 5, isActive: true },
      ],
      achievements: [
        { isCompleted: true, isNew: true },
        { isCompleted: false, isNew: false },
      ],
    });

    expect(hasDispatcher('view_xp_streaks')).toBe(true);

    const result = await dispatch('view_xp_streaks', { clientId: 42 }, {
      user: { id: 1, role: 'admin' },
    });

    expect(findByPkUser).toHaveBeenCalledWith(42, expect.objectContaining({
      attributes: expect.arrayContaining(['points', 'level', 'tier', 'streakDays']),
    }));
    expect(findAllStreaks).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, isActive: true },
    }));
    expect(result).toEqual({
      clientId: 42,
      found: true,
      points: 900,
      level: 4,
      tier: 'bronze_forge',
      streakDays: 6,
      totalWorkouts: 12,
      totalExercises: 80,
      activeStreaks: 2,
      longestStreak: 9,
      completedAchievements: 1,
      newAchievements: 1,
    });
    expect(JSON.stringify(result)).not.toContain('Private');
  });

  it('prefers the selected client over stale XP command params', async () => {
    const { dispatch, findByPkUser, findAllStreaks } = await loadDispatcher({
      user: {
        id: 42,
        points: 900,
        level: 4,
        tier: 'bronze_forge',
        streakDays: 6,
        totalWorkouts: 12,
        totalExercises: 80,
      },
    });

    const result = await dispatch('view_xp_streaks', { clientId: 999 }, {
      user: { id: 1, role: 'admin' },
      resolvedClient: { id: 42 },
    });

    expect(findByPkUser).toHaveBeenCalledWith(42, expect.any(Object));
    expect(findAllStreaks).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, isActive: true },
    }));
    expect(result.clientId).toBe(42);
  });

  it('awards UUID achievements with a PII-safe receipt and point transaction', async () => {
    const user = {
      id: 42,
      points: 100,
      update: vi.fn(async () => undefined),
    };
    const { dispatch, hasDispatcher, createUserAchievement, createPointTransaction } = await loadDispatcher({
      user,
      achievement: { id: 'achievement-uuid-1', name: 'Private badge', xpReward: 100 },
    });

    expect(hasDispatcher('award_badge')).toBe(true);

    const result = await dispatch('award_badge', {
      clientId: 42,
      achievementId: 'achievement-uuid-1',
    }, {
      user: { id: 1, role: 'admin' },
    });

    expect(createUserAchievement).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      achievementId: 'achievement-uuid-1',
      isCompleted: true,
      progress: 100,
      progressPercentage: 100,
      pointsAwarded: 100,
    }), expect.any(Object));
    expect(createPointTransaction).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      points: 100,
      balance: 200,
      transactionType: 'earn',
      source: 'achievement_earned',
      sourceId: null,
      awardedBy: 1,
    }), expect.any(Object));
    expect(user.update).toHaveBeenCalledWith({
      points: 200,
      level: 1,
      tier: 'bronze_forge',
    }, expect.any(Object));
    expect(result).toEqual({
      clientId: 42,
      achievementId: 'achievement-uuid-1',
      found: true,
      awarded: true,
      alreadyAwarded: false,
      pointsAwarded: 100,
      newBalance: 200,
      newLevel: 1,
      newTier: 'bronze_forge',
    });
    expect(JSON.stringify(result)).not.toContain('Private badge');
  });

  it('prefers the selected client over stale award command params', async () => {
    const user = {
      id: 42,
      points: 100,
      update: vi.fn(async () => undefined),
    };
    const { dispatch, createUserAchievement, createPointTransaction } = await loadDispatcher({
      user,
      achievement: { id: 'achievement-uuid-1', xpReward: 100 },
    });

    const result = await dispatch('award_badge', {
      clientId: 999,
      achievementId: 'achievement-uuid-1',
    }, {
      user: { id: 1, role: 'admin' },
      resolvedClient: { id: 42 },
    });

    expect(createUserAchievement).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
    }), expect.any(Object));
    expect(createPointTransaction).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
    }), expect.any(Object));
    expect(result.clientId).toBe(42);
  });
});
