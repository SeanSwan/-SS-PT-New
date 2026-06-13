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
});
