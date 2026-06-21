import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'production';

const mocks = vi.hoisted(() => ({
  recordLedgerEntry: vi.fn(),
  pointTransaction: {
    findOne: vi.fn()
  },
  piiSafeLogger: {
    error: vi.fn(),
    info: vi.fn(),
    trackGamificationEvent: vi.fn()
  },
  sequelize: {
    models: {},
    query: vi.fn(),
    QueryTypes: { SELECT: 'SELECT' }
  }
}));

vi.mock('../../services/gamification/GamificationPointsService.mjs', () => ({
  default: {
    recordLedgerEntry: mocks.recordLedgerEntry
  }
}));

vi.mock('../../models/PointTransaction.mjs', () => ({
  default: mocks.pointTransaction
}));

vi.mock('../../database.mjs', () => ({
  default: mocks.sequelize
}));

vi.mock('../../utils/monitoring/piiSafeLogging.mjs', () => ({
  piiSafeLogger: mocks.piiSafeLogger
}));

const { default: GamificationPersistence } = await import('../../services/gamification/GamificationPersistence.mjs');

describe('GamificationPersistence Redis statistics parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects malformed and negative Redis counters before achievement checks consume them', async () => {
    const persistence = new GamificationPersistence();
    persistence.redisEnabled = true;
    persistence.redis = {
      hmget: vi.fn(async () => ['10abc', '0x7', '1e2', '-4', '5'])
    };
    persistence.calculateStatsFromDatabase = vi.fn(async () => {
      throw new Error('database fallback should not be used for parser rejection');
    });

    await expect(persistence.getUserStatistics(7)).resolves.toEqual({
      totalWorkouts: 0,
      currentStreak: 0,
      perfectFormCount: 0,
      sharedWorkouts: 0,
      accessibilityUsage: 5
    });

    expect(persistence.redis.hmget).toHaveBeenCalledWith(
      'user:7:stats',
      'totalWorkouts',
      'currentStreak',
      'perfectFormCount',
      'sharedWorkouts',
      'accessibilityUsage'
    );
    expect(persistence.calculateStatsFromDatabase).not.toHaveBeenCalled();
  });

  it('rejects malformed Redis and SQL scalar counters instead of partially parsing them', async () => {
    const persistence = new GamificationPersistence();
    persistence.redisEnabled = true;
    persistence.redis = {
      hget: vi.fn(async (_key, field) => ({
        currentStreak: '0x7',
        totalWorkouts: '10abc',
        sharedWorkouts: '-4'
      })[field]),
      get: vi.fn(async (key) => (key.includes(':actions:') ? '1e2' : ['900']))
    };

    await expect(persistence.getCurrentStreak(7)).resolves.toBe(0);
    await expect(persistence.getUserWorkoutCount(7)).resolves.toBe(0);
    await expect(persistence.getActionCountToday(7, 'profile_updated')).resolves.toBe(0);
    await expect(persistence.getCommunityHelpCount(7)).resolves.toBe(0);
    await expect(persistence.getTotalPointsAwarded()).resolves.toBe(0);

    persistence.redisEnabled = false;
    mocks.sequelize.query
      .mockResolvedValueOnce([{ rank: '0x2' }])
      .mockResolvedValueOnce([{ cnt: '1e3' }])
      .mockResolvedValueOnce([{ totalWorkouts: ['12'] }]);

    await expect(persistence.getUserLeaderboardRank(7)).resolves.toBeNull();
    await expect(persistence.hasAchievement(7, 'first_workout')).resolves.toBe(false);
    await expect(persistence.getUserWorkoutCount(7)).resolves.toBe(0);
  });
});
