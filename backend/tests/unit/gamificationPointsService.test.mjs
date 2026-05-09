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

const mockGamificationSettings = {
  findOne: vi.fn()
};

vi.mock('../../database.mjs', () => ({ default: mockDb }));
vi.mock('../../models/PointTransaction.mjs', () => ({ default: mockPointTransaction }));
vi.mock('../../models/User.mjs', () => ({ default: mockUser }));
vi.mock('../../models/GamificationSettings.mjs', () => ({ default: mockGamificationSettings }));
vi.mock('sequelize', () => ({ Op: { gte: 'gte' } }));
vi.mock('../../utils/levelingAlgorithm.mjs', () => ({
  calculateLevel: vi.fn(() => 2),
  getTier: vi.fn(() => 'silver_glade')
}));

const { default: GamificationPointsService } = await import('../../services/gamification/GamificationPointsService.mjs');

describe('GamificationPointsService central ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records an idempotent award with a locked user row and visible balance update', async () => {
    const user = {
      points: 10,
      level: 1,
      tier: 'bronze_forge',
      update: vi.fn(async () => {})
    };
    const pointTransaction = { id: 101, balance: 17 };

    mockPointTransaction.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ balance: 12 });
    mockUser.findByPk.mockResolvedValue(user);
    mockGamificationSettings.findOne.mockResolvedValue({ isEnabled: true, pointsMultiplier: 1 });
    mockPointTransaction.create.mockResolvedValue(pointTransaction);

    const result = await GamificationPointsService.recordLedgerEntry({
      userId: 7,
      points: 5,
      source: 'social_engagement',
      sourceId: 42,
      idempotencyKey: 'social:post_create_general:42',
      description: 'Social action: post_create_general',
      metadata: { socialAction: 'post_create_general' },
      awardedBy: 7
    });

    expect(mockUser.findByPk).toHaveBeenCalledWith(7, {
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE
    });
    expect(mockPointTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        points: 5,
        balance: 17,
        source: 'social_engagement',
        sourceId: 42,
        idempotencyKey: 'social:post_create_general:42'
      }),
      { transaction: mockTransaction }
    );
    expect(user.update).toHaveBeenCalledWith(
      { points: 17, level: 2, tier: 'silver_glade' },
      { transaction: mockTransaction }
    );
    expect(result).toEqual(expect.objectContaining({
      success: true,
      duplicate: false,
      pointsAwarded: 5,
      newBalance: 17,
      pointTransaction
    }));
  });

  it('returns the existing ledger result without adding points when idempotency key repeats', async () => {
    const existingTransaction = { id: 202, points: 5, balance: 15 };
    mockPointTransaction.findOne.mockResolvedValue(existingTransaction);

    const result = await GamificationPointsService.recordLedgerEntry({
      userId: 7,
      points: 5,
      source: 'social_engagement',
      idempotencyKey: 'social:post_create_general:42',
      description: 'Social action: post_create_general'
    });

    expect(mockUser.findByPk).not.toHaveBeenCalled();
    expect(mockPointTransaction.create).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      success: true,
      duplicate: true,
      pointsAwarded: 0,
      newBalance: 15,
      pointTransaction: existingTransaction
    }));
  });
});
