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
});
