import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'production';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readBackendSource = (...segments) => readFileSync(resolve(__dirname, '..', '..', ...segments), 'utf8');

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

describe('GamificationPersistence canonical ledger adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes engine awards through PointTransaction service with legal source mapping', async () => {
    const persistence = new GamificationPersistence();
    persistence.checkAchievements = vi.fn(async () => []);
    mocks.recordLedgerEntry.mockResolvedValue({
      success: true,
      duplicate: false,
      pointsAwarded: 100,
      newBalance: 210
    });

    const result = await persistence.awardPoints(7, 100, 'workout_completed', {
      workoutId: 42,
      idempotencyKey: 'engine:workout_completed:user:7:workoutId:42'
    });

    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      points: 100,
      transactionType: 'earn',
      source: 'workout_completion',
      sourceId: 42,
      description: 'Gamification: Workout Completed',
      idempotencyKey: 'engine:workout_completed:user:7:workoutId:42',
      metadata: expect.objectContaining({
        workoutId: 42,
        legacyReason: 'workout_completed'
      })
    }));
    expect(result).toEqual(expect.objectContaining({
      success: true,
      duplicate: false,
      pointsAwarded: 100,
      totalPoints: 210
    }));
  });

  it('returns duplicate no-award results from the canonical idempotency check', async () => {
    const persistence = new GamificationPersistence();
    persistence.checkAchievements = vi.fn(async () => []);
    mocks.recordLedgerEntry.mockResolvedValue({
      success: true,
      duplicate: true,
      pointsAwarded: 0,
      newBalance: 210
    });

    const result = await persistence.awardPoints(7, 25, 'profile_updated', {
      sourceId: 'profile-form',
      idempotencyKey: 'engine:profile_updated:user:7:sourceId:profile-form'
    });

    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      source: 'social_engagement',
      sourceId: null
    }));
    expect(result).toEqual(expect.objectContaining({
      success: true,
      duplicate: true,
      pointsAwarded: 0,
      totalPoints: 210
    }));
  });

  it('reads user total points from the latest PointTransaction balance', async () => {
    const persistence = new GamificationPersistence();
    mocks.pointTransaction.findOne.mockResolvedValue({ balance: 321 });

    await expect(persistence.getUserTotalPoints(7)).resolves.toBe(321);
    expect(mocks.pointTransaction.findOne).toHaveBeenCalledWith({
      where: { userId: 7 },
      order: [['createdAt', 'DESC'], ['id', 'DESC']]
    });
  });

  it('does not coerce malformed latest ledger balances into user total points', async () => {
    const persistence = new GamificationPersistence();
    mocks.pointTransaction.findOne.mockResolvedValue({ balance: ['321'] });

    await expect(persistence.getUserTotalPoints(7)).resolves.toBe(0);
  });

  it('ranks users by latest PointTransaction balance instead of legacy totalXP', async () => {
    const persistence = new GamificationPersistence();
    mocks.sequelize.query.mockResolvedValue([{ rank: '3' }]);

    await expect(persistence.getUserLeaderboardRank(7)).resolves.toBe(3);

    const [sql, options] = mocks.sequelize.query.mock.calls.at(-1);
    expect(sql).toContain('FROM "PointTransactions"');
    expect(sql).toContain('DISTINCT ON ("userId")');
    expect(sql).toContain('"balance"');
    expect(sql).toContain('lb."userId" < :userId');
    expect(sql).not.toContain('"Gamifications"');
    expect(sql).not.toContain('"totalXP"');
    expect(options.replacements).toEqual(expect.objectContaining({
      userId: 7
    }));
  });

  it('falls back to the latest PointTransaction balances for leaderboard rows when Redis is disabled', async () => {
    const persistence = new GamificationPersistence();
    mocks.sequelize.query.mockResolvedValue([
      { userId: 9, balance: '410' },
      { userId: 7, balance: 250 }
    ]);

    await expect(persistence.getLeaderboard('weekly', 2)).resolves.toEqual([
      { userId: 9, points: 410, rank: 1 },
      { userId: 7, points: 250, rank: 2 }
    ]);

    const [sql, options] = mocks.sequelize.query.mock.calls.at(-1);
    expect(sql).toContain('FROM "PointTransactions"');
    expect(sql).toContain('DISTINCT ON ("userId")');
    expect(sql).toContain('ORDER BY "balance" DESC');
    expect(sql).not.toContain('"Gamifications"');
    expect(sql).not.toContain('"totalXP"');
    expect(options.replacements).toEqual({ limit: 2 });
  });

  it('does not coerce malformed leaderboard ledger balances or user ids', async () => {
    const persistence = new GamificationPersistence();
    mocks.sequelize.query.mockResolvedValue([
      { userId: '9', balance: ['410'] },
      { userId: '0x7', balance: '1e3' }
    ]);

    await expect(persistence.getLeaderboard('weekly', 2)).resolves.toEqual([
      { userId: 9, points: 0, rank: 1 },
      { userId: '0x7', points: 0, rank: 2 }
    ]);
  });

  it('falls back to the latest PointTransaction balances when Redis leaderboard is empty', async () => {
    const persistence = new GamificationPersistence();
    persistence.redisEnabled = true;
    persistence.redis = {
      zrevrange: vi.fn(async () => [])
    };
    mocks.sequelize.query.mockResolvedValue([{ userId: 7, balance: 250 }]);

    await expect(persistence.getLeaderboard('weekly', 2)).resolves.toEqual([
      { userId: 7, points: 250, rank: 1 }
    ]);

    expect(persistence.redis.zrevrange).toHaveBeenCalledWith('leaderboard:weekly', 0, 1, 'WITHSCORES');
    const [sql] = mocks.sequelize.query.mock.calls.at(-1);
    expect(sql).toContain('FROM "PointTransactions"');
  });

  it('counts daily legacy actions against the legal central ledger source and legacy reason', async () => {
    const persistence = new GamificationPersistence();
    mocks.sequelize.query.mockResolvedValue([{ cnt: '2' }]);

    await expect(persistence.getActionCountToday(7, 'profile_updated')).resolves.toBe(2);

    const [sql, options] = mocks.sequelize.query.mock.calls.at(-1);
    expect(sql).toContain('"source" = :action');
    expect(sql).toContain('"metadata"->>\'legacyReason\' = :legacyReason');
    expect(options.replacements).toEqual(expect.objectContaining({
      userId: 7,
      action: 'social_engagement',
      legacyReason: 'profile_updated'
    }));
  });

  it('keeps already-legal point sources unchanged when counting daily actions', async () => {
    const persistence = new GamificationPersistence();
    mocks.sequelize.query.mockResolvedValue([{ cnt: '1' }]);

    await expect(persistence.getActionCountToday(7, 'trainer_award')).resolves.toBe(1);

    const [sql, options] = mocks.sequelize.query.mock.calls.at(-1);
    expect(sql).toContain('"source" = :action');
    expect(sql).not.toContain('"metadata"->>\'legacyReason\' = :legacyReason');
    expect(options.replacements).toEqual(expect.objectContaining({
      userId: 7,
      action: 'trainer_award'
    }));
    expect(options.replacements).not.toHaveProperty('legacyReason');
  });

  it('counts community-help progress from social engagement ledger rows with the legacy reason', async () => {
    const persistence = new GamificationPersistence();
    mocks.sequelize.query.mockResolvedValue([{ cnt: '4' }]);

    await expect(persistence.getCommunityHelpCount(7)).resolves.toBe(4);

    const [sql, options] = mocks.sequelize.query.mock.calls.at(-1);
    expect(sql).toContain('"source" = :source');
    expect(sql).toContain('"metadata"->>\'legacyReason\' = :legacyReason');
    expect(sql).not.toContain('"source" = \'helped_community\'');
    expect(options.replacements).toEqual(expect.objectContaining({
      userId: 7,
      source: 'social_engagement',
      legacyReason: 'helped_community'
    }));
  });

  it('derives platform health metrics from canonical tables instead of static placeholders', async () => {
    const persistence = new GamificationPersistence();
    mocks.sequelize.query
      .mockResolvedValueOnce([{ completedAchievements: '2', startedAchievements: '5' }])
      .mockResolvedValueOnce([{ averageStreak: '7.4' }])
      .mockResolvedValueOnce([{ averageSessionLength: '52.2' }])
      .mockResolvedValueOnce([{ engagementRate: '33.3' }]);

    await expect(persistence.getAchievementCompletionRate()).resolves.toBe(40);
    await expect(persistence.getAverageStreak()).resolves.toBe(7.4);
    await expect(persistence.getAverageSessionLength()).resolves.toBe(52.2);
    await expect(persistence.getEngagementRate()).resolves.toBe(33.3);

    const sql = mocks.sequelize.query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('"UserAchievements"');
    expect(sql).toContain('"Achievements"');
    expect(sql).toContain('"streaks"');
    expect(sql).toContain('"workout_sessions"');
    expect(sql).toContain('"PointTransactions"');
  });

  it('builds engagement metrics from ledger, workout, and achievement aggregates', async () => {
    const persistence = new GamificationPersistence();
    mocks.sequelize.query
      .mockResolvedValueOnce([{ activeUsers: '4' }])
      .mockResolvedValueOnce([{ activeUsers: '9' }])
      .mockResolvedValueOnce([{ activeUsers: '12' }])
      .mockResolvedValueOnce([{ averageSessionLength: '48.6' }])
      .mockResolvedValueOnce([{ pointsPerUser: '315.8' }])
      .mockResolvedValueOnce([{ achievementsPerUser: '1.25' }])
      .mockResolvedValueOnce([{ engagementRate: '75' }]);

    await expect(persistence.getEngagementMetrics({ timeframe: '14d', segment: 'all' })).resolves.toEqual(
      expect.objectContaining({
        dailyActiveUsers: 4,
        weeklyActiveUsers: 9,
        monthlyActiveUsers: 12,
        averageSessionTime: 48.6,
        pointsPerUser: 315.8,
        achievementsPerUser: 1.25,
        engagementRate: 75,
        streakCompletionRate: null,
        dataSource: 'postgres',
        timeframe: '14d',
        verificationStatus: 'partial'
      })
    );
  });

  it('keeps platform metrics sourced from database helpers instead of static placeholders', () => {
    const persistenceSource = readBackendSource('services', 'gamification', 'GamificationPersistence.mjs');
    const metricsSource = readBackendSource('services', 'gamification', 'gamificationPersistenceMetrics.mjs');
    const combinedSource = `${persistenceSource}\n${metricsSource}`;

    expect(persistenceSource).toContain('getEngagementMetricsFromDatabase');
    expect(metricsSource).toContain('FROM "PointTransactions"');
    expect(metricsSource).toContain('FROM "workout_sessions"');
    expect(metricsSource).toContain('FROM "UserAchievements"');
    expect(metricsSource).toContain('FROM "streaks"');

    [
      'dailyActiveUsers: 1250', 'weeklyActiveUsers: 5600', 'monthlyActiveUsers: 18750',
      'averageSessionTime: 45', 'pointsPerUser: 850', 'achievementsPerUser: 3.2',
      'streakCompletionRate: 68.5', 'return 75;', 'return 5.2;', 'return 38;', 'return 78.5;'
    ].forEach((placeholder) => {
      expect(combinedSource).not.toContain(placeholder);
    });
  });
});
