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
vi.mock('../../services/gamification/GamificationRealtimeEvents.mjs', () => ({
  scheduleLedgerRealtimeEvent: vi.fn()
}));
vi.mock('sequelize', () => ({ Op: { gte: 'gte' } }));
vi.mock('../../utils/levelingAlgorithm.mjs', () => ({
  calculateLevel: vi.fn(() => 2),
  getTier: vi.fn(() => 'silver_glade')
}));

const { default: GamificationPointsService } = await import('../../services/gamification/GamificationPointsService.mjs');

describe('GamificationPointsService validation', () => {
  beforeEach(() => {
    mockDb.transaction.mockReset();
    mockDb.transaction.mockImplementation(async (callback) => callback(mockTransaction));
    mockPointTransaction.findOne.mockReset();
    mockPointTransaction.create.mockReset();
    mockUser.findByPk.mockReset();
  });

  it('rejects malformed point amounts without partially parsing them', async () => {
    const malformedAmounts = ['12bonus', '5.5', [5], { amount: 5 }, true];

    for (const points of malformedAmounts) {
      await expect(GamificationPointsService.recordLedgerEntry({
        userId: 7,
        points,
        source: 'manual',
        description: 'Manual adjustment'
      })).rejects.toMatchObject({
        statusCode: 400,
        message: 'Points must be between 1 and 500'
      });
    }

    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(mockUser.findByPk).not.toHaveBeenCalled();
    expect(mockPointTransaction.create).not.toHaveBeenCalled();
  });

  it('allows trusted server-computed aggregate bonuses to raise the point cap explicitly', async () => {
    const user = {
      points: 20,
      level: 1,
      tier: 'bronze_forge',
      update: vi.fn(async () => {})
    };
    const pointTransaction = { id: 404, balance: 770 };

    mockPointTransaction.findOne.mockResolvedValue({ balance: 20 });
    mockUser.findByPk.mockResolvedValue(user);
    mockPointTransaction.create.mockResolvedValue(pointTransaction);

    const result = await GamificationPointsService.recordLedgerEntry({
      userId: 7,
      points: 750,
      source: 'milestone_reached',
      description: 'Milestone Bonuses: Gold tier, Platinum tier',
      transactionType: 'bonus',
      maxPoints: 1000
    });

    expect(mockPointTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        points: 750,
        balance: 770,
        transactionType: 'bonus',
        source: 'milestone_reached'
      }),
      { transaction: mockTransaction }
    );
    expect(user.update).toHaveBeenCalledWith(
      // HR-008-F1: the trusted bonus also accumulates lifetime XP.
      { points: 770, lifetimePointsEarned: 750, level: 2, tier: 'silver_glade' },
      { transaction: mockTransaction }
    );
    expect(result).toEqual(expect.objectContaining({
      success: true,
      duplicate: false,
      pointsAwarded: 750,
      newBalance: 770,
      pointTransaction
    }));
  });
});
