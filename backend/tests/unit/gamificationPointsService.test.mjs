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
const mockEmitGamificationEvent = vi.fn();

vi.mock('../../database.mjs', () => ({ default: mockDb }));
vi.mock('../../models/PointTransaction.mjs', () => ({ default: mockPointTransaction }));
vi.mock('../../models/User.mjs', () => ({ default: mockUser }));
vi.mock('../../models/GamificationSettings.mjs', () => ({ default: mockGamificationSettings }));
vi.mock('../../socket/gamificationEvents.mjs', () => ({
  emitGamificationEvent: mockEmitGamificationEvent
}));
vi.mock('sequelize', () => ({
  Op: { and: 'and', gte: 'gte' },
  Sequelize: {
    json: vi.fn((path) => ({ jsonPath: path })),
    where: vi.fn((left, right) => ({ left, right }))
  }
}));
vi.mock('../../utils/levelingAlgorithm.mjs', () => ({
  calculateLevel: vi.fn(() => 2),
  getTier: vi.fn(() => 'silver_glade')
}));

const { default: GamificationPointsService } = await import('../../services/gamification/GamificationPointsService.mjs');

describe('GamificationPointsService central ledger', () => {
  beforeEach(() => {
    mockDb.transaction.mockReset();
    mockDb.transaction.mockImplementation(async (callback) => callback(mockTransaction));
    mockPointTransaction.findOne.mockReset();
    mockPointTransaction.create.mockReset();
    mockUser.findByPk.mockReset();
    mockGamificationSettings.findOne.mockReset();
    mockEmitGamificationEvent.mockReset();
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
        idempotencyKey: 'social:post_create_general:42',
        metadata: {
          socialAction: 'post_create_general',
          idempotencyKey: 'social:post_create_general:42'
        }
      }),
      { transaction: mockTransaction }
    );
    expect(user.update).toHaveBeenCalledWith(
      // HR-008-F1: earns also accumulate lifetimePointsEarned (level/rank
      // derive from lifetime XP; legacy rows without the column start at 0).
      { points: 17, lifetimePointsEarned: 5, level: 2, tier: 'silver_glade' },
      { transaction: mockTransaction }
    );
    expect(result).toEqual(expect.objectContaining({
      success: true,
      duplicate: false,
      pointsAwarded: 5,
      newBalance: 17,
      previousLevel: 1,
      newLevel: 2,
      pointTransaction
    }));
    expect(mockEmitGamificationEvent).toHaveBeenCalledWith(
      'points_awarded',
      expect.objectContaining({
        userId: 7,
        points: 5,
        xpEarned: 5,
        balance: 17,
        source: 'social_engagement',
        sourceId: 42,
        transactionType: 'earn',
        level: 2,
        previousLevel: 1
      }),
      { debounce: false }
    );
    expect(mockEmitGamificationEvent).toHaveBeenCalledWith(
      'level_up',
      expect.objectContaining({
        userId: 7,
        newLevel: 2,
        previousLevel: 1,
        newTier: 'silver_glade'
      }),
      { debounce: false }
    );
    const pointPayload = mockEmitGamificationEvent.mock.calls.find(([event]) => event === 'points_awarded')?.[1];
    expect(pointPayload).not.toHaveProperty('description');
  });

  it('rejects malformed settings multipliers before point award math', async () => {
    mockGamificationSettings.findOne.mockResolvedValueOnce({
      isEnabled: true,
      pointsMultiplier: ['5']
    });
    await expect(GamificationPointsService.getMultipliedPoints(100, mockTransaction))
      .resolves.toBe(100);

    mockGamificationSettings.findOne.mockResolvedValueOnce({
      isEnabled: true,
      pointsMultiplier: '1.5'
    });
    await expect(GamificationPointsService.getMultipliedPoints(100, mockTransaction))
      .resolves.toBe(150);

    mockGamificationSettings.findOne.mockResolvedValueOnce({
      isEnabled: true,
      pointsMultiplier: '1e2'
    });
    await expect(GamificationPointsService.getMultipliedPoints(100, mockTransaction))
      .resolves.toBe(100);
  });

  it('defers realtime point events until the outer transaction commits', async () => {
    const afterCommitCallbacks = [];
    const outerTransaction = {
      LOCK: { UPDATE: 'UPDATE' },
      afterCommit: vi.fn((callback) => afterCommitCallbacks.push(callback))
    };
    const user = {
      points: 10,
      level: 2,
      tier: 'bronze_forge',
      update: vi.fn(async (updates) => Object.assign(user, updates))
    };
    const pointTransaction = { id: 303, balance: 15 };

    mockPointTransaction.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ balance: 10 });
    mockUser.findByPk.mockResolvedValue(user);
    mockPointTransaction.create.mockResolvedValue(pointTransaction);

    const result = await GamificationPointsService.recordLedgerEntry({
      userId: 7,
      points: 5,
      source: 'social_engagement',
      description: 'Social action: post_create_general'
    }, outerTransaction);

    expect(result).toEqual(expect.objectContaining({
      pointsAwarded: 5,
      previousLevel: 2,
      newLevel: 2
    }));
    expect(outerTransaction.afterCommit).toHaveBeenCalledTimes(1);
    expect(mockEmitGamificationEvent).not.toHaveBeenCalled();

    await afterCommitCallbacks[0]();

    expect(mockEmitGamificationEvent).toHaveBeenCalledWith(
      'points_awarded',
      expect.objectContaining({
        userId: 7,
        points: 5,
        xpEarned: 5,
        balance: 15,
        source: 'social_engagement',
        previousLevel: 2,
        level: 2
      }),
      { debounce: false }
    );
    expect(mockEmitGamificationEvent).toHaveBeenCalledTimes(1);
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

    expect(mockPointTransaction.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: 7,
        source: 'social_engagement',
        idempotencyKey: 'social:post_create_general:42'
      },
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE
    }));
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

  it('re-checks idempotency after locking the user row to close same-key races', async () => {
    const user = {
      points: 10,
      level: 1,
      tier: 'bronze_forge',
      update: vi.fn(async () => {})
    };
    const existingTransaction = { id: 303, points: 5, balance: 15 };

    mockPointTransaction.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingTransaction);
    mockUser.findByPk.mockResolvedValue(user);

    const result = await GamificationPointsService.recordLedgerEntry({
      userId: 7,
      points: 5,
      source: 'social_engagement',
      idempotencyKey: 'social:post_create_general:42',
      description: 'Social action: post_create_general'
    });

    expect(mockUser.findByPk).toHaveBeenCalledWith(7, {
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE
    });
    expect(mockPointTransaction.findOne).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: {
        userId: 7,
        source: 'social_engagement',
        idempotencyKey: 'social:post_create_general:42'
      },
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE
    }));
    expect(mockPointTransaction.create).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      success: true,
      duplicate: true,
      pointsAwarded: 0,
      newBalance: 15,
      pointTransaction: existingTransaction
    }));
    expect(mockEmitGamificationEvent).not.toHaveBeenCalled();
  });
});
