import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };

const mockDb = {
  transaction: vi.fn(async (callback) => callback(mockTransaction))
};

const mockPointTransaction = {
  findOne: vi.fn(),
  create: vi.fn()
};

const mockUser = {
  findByPk: vi.fn()
};

vi.mock('../../database.mjs', () => ({ default: mockDb }));
vi.mock('../../models/PointTransaction.mjs', () => ({ default: mockPointTransaction }));
vi.mock('../../models/User.mjs', () => ({ default: mockUser }));
vi.mock('../../models/GamificationSettings.mjs', () => ({ default: { findOne: vi.fn() } }));
vi.mock('sequelize', () => ({ Op: { gte: 'gte' } }));
vi.mock('../../utils/levelingAlgorithm.mjs', () => ({
  calculateLevel: vi.fn(() => 2),
  getTier: vi.fn(() => 'silver_glade')
}));

const { default: GamificationPointsService } = await import('../../services/gamification/GamificationPointsService.mjs');

describe('GamificationPointsService spend ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deducts spend transactions from the locked user balance instead of stale higher ledger balance', async () => {
    const user = {
      points: 100,
      level: 1,
      tier: 'bronze_forge',
      update: vi.fn(async () => {})
    };
    const pointTransaction = { id: 505, balance: 70 };

    mockPointTransaction.findOne.mockResolvedValue({ balance: 999 });
    mockUser.findByPk.mockResolvedValue(user);
    mockPointTransaction.create.mockResolvedValue(pointTransaction);

    const result = await GamificationPointsService.recordLedgerEntry({
      userId: 7,
      points: 30,
      source: 'reward_redemption',
      sourceId: 9,
      description: 'Reward Redeemed: Swan reward',
      transactionType: 'spend'
    });

    expect(mockPointTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        points: 30,
        balance: 70,
        transactionType: 'spend',
        source: 'reward_redemption',
        sourceId: 9
      }),
      { transaction: mockTransaction }
    );
    expect(user.update).toHaveBeenCalledWith(
      { points: 70, level: 2, tier: 'silver_glade' },
      { transaction: mockTransaction }
    );
    expect(result).toEqual(expect.objectContaining({
      success: true,
      duplicate: false,
      pointsAwarded: 30,
      newBalance: 70,
      pointTransaction
    }));
  });

  it('ignores array-coercible ledger balances when reconciling earn transactions', async () => {
    const user = {
      points: 10,
      level: 1,
      tier: 'bronze_forge',
      update: vi.fn(async () => {})
    };
    const pointTransaction = { id: 606, balance: 15 };

    mockPointTransaction.findOne.mockResolvedValue({ balance: ['9000'] });
    mockUser.findByPk.mockResolvedValue(user);
    mockPointTransaction.create.mockResolvedValue(pointTransaction);

    const result = await GamificationPointsService.recordLedgerEntry({
      userId: 7,
      points: 5,
      source: 'manual',
      description: 'Manual adjustment'
    });

    expect(mockPointTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        points: 5,
        balance: 15,
        transactionType: 'earn',
        source: 'manual'
      }),
      { transaction: mockTransaction }
    );
    expect(user.update).toHaveBeenCalledWith(
      { points: 15, level: 2, tier: 'silver_glade' },
      { transaction: mockTransaction }
    );
    expect(result).toEqual(expect.objectContaining({
      success: true,
      duplicate: false,
      pointsAwarded: 5,
      newBalance: 15,
      pointTransaction
    }));
  });

  it('rejects spend transactions that exceed the locked user balance', async () => {
    const user = {
      points: 10,
      level: 1,
      tier: 'bronze_forge',
      update: vi.fn(async () => {})
    };

    mockPointTransaction.findOne.mockResolvedValue({ balance: 999 });
    mockUser.findByPk.mockResolvedValue(user);

    await expect(GamificationPointsService.recordLedgerEntry({
      userId: 7,
      points: 30,
      source: 'reward_redemption',
      sourceId: 9,
      description: 'Reward Redeemed: Swan reward',
      transactionType: 'spend'
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Insufficient points for spend transaction'
    });

    expect(mockPointTransaction.create).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
  });

  it('rejects spend transactions when the locked user balance uses array coercion', async () => {
    const user = {
      points: ['500'],
      level: 1,
      tier: 'bronze_forge',
      update: vi.fn(async () => {})
    };

    mockPointTransaction.findOne.mockResolvedValue({ balance: 999 });
    mockUser.findByPk.mockResolvedValue(user);

    await expect(GamificationPointsService.recordLedgerEntry({
      userId: 7,
      points: 30,
      source: 'reward_redemption',
      sourceId: 9,
      description: 'Reward Redeemed: Swan reward',
      transactionType: 'spend'
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Insufficient points for spend transaction'
    });

    expect(mockPointTransaction.create).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
  });

  it('rejects spend transactions when the locked user balance is malformed', async () => {
    const user = {
      points: 'not-a-number',
      level: 1,
      tier: 'bronze_forge',
      update: vi.fn(async () => {})
    };

    mockPointTransaction.findOne.mockResolvedValue({ balance: 999 });
    mockUser.findByPk.mockResolvedValue(user);

    await expect(GamificationPointsService.recordLedgerEntry({
      userId: 7,
      points: 1,
      source: 'reward_redemption',
      sourceId: 9,
      description: 'Reward Redeemed: Swan reward',
      transactionType: 'spend'
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Insufficient points for spend transaction'
    });

    expect(mockPointTransaction.create).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
  });
});
