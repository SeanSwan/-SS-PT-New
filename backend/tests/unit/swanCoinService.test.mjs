import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAvatarHome = {
  findOne: vi.fn(),
  create: vi.fn(),
};

vi.mock('../../models/AvatarHome.mjs', () => ({ default: mockAvatarHome }));

const { awardSwanCoins } = await import('../../services/avatarEconomy/swanCoinService.mjs');

function makeHome(overrides = {}) {
  return {
    crystalBalance: 10,
    update: vi.fn(async function update(values) {
      this.crystalBalance = values.crystalBalance;
      return this;
    }),
    ...overrides,
  };
}

describe('SwanCoin soft currency service', () => {
  beforeEach(() => {
    mockAvatarHome.findOne.mockReset();
    mockAvatarHome.create.mockReset();
  });

  it('rejects invalid user IDs', async () => {
    const result = await awardSwanCoins({ userId: 'abc', amount: 2 });
    expect(result).toEqual({ error: { status: 400, message: 'Invalid user ID' } });
    expect(mockAvatarHome.findOne).not.toHaveBeenCalled();
  });

  it('rejects invalid or excessive amounts', async () => {
    await expect(awardSwanCoins({ userId: 7, amount: 0 })).resolves.toEqual({
      error: { status: 400, message: 'SwanCoin amount must be between 1 and 25' },
    });
    await expect(awardSwanCoins({ userId: 7, amount: 26 })).resolves.toEqual({
      error: { status: 400, message: 'SwanCoin amount must be between 1 and 25' },
    });
    expect(mockAvatarHome.findOne).not.toHaveBeenCalled();
  });

  it('creates a locked AvatarHome wallet when missing without unlocking the home', async () => {
    const tx = { id: 'tx' };
    const createdHome = makeHome({ crystalBalance: 0 });
    mockAvatarHome.findOne.mockResolvedValueOnce(null);
    mockAvatarHome.create.mockResolvedValueOnce(createdHome);

    const result = await awardSwanCoins({ userId: 7, amount: 4, source: 'test', reason: 'Unit test' }, tx);

    expect(mockAvatarHome.create).toHaveBeenCalledWith({
      userId: 7,
      unlocked: false,
      unlockedAt: null,
      crystalBalance: 0,
    }, { transaction: tx });
    expect(createdHome.update).toHaveBeenCalledWith({ crystalBalance: 4 }, { transaction: tx });
    expect(result).toEqual(expect.objectContaining({
      success: true,
      swanCoinsAwarded: 4,
      swanCoinBalance: 4,
      currencyName: 'SwanCoins',
      legacyField: 'crystalBalance',
    }));
  });

  it('increments existing crystalBalance as SwanCoins', async () => {
    const tx = { id: 'tx' };
    const home = makeHome({ crystalBalance: 14 });
    mockAvatarHome.findOne.mockResolvedValueOnce(home);

    const result = await awardSwanCoins({ userId: 7, amount: 3 }, tx);

    expect(mockAvatarHome.findOne).toHaveBeenCalledWith({
      where: { userId: 7 },
      transaction: tx,
      lock: undefined,
    });
    expect(home.update).toHaveBeenCalledWith({ crystalBalance: 17 }, { transaction: tx });
    expect(result).toEqual(expect.objectContaining({
      success: true,
      swanCoinsAwarded: 3,
      swanCoinBalance: 17,
    }));
  });
});
