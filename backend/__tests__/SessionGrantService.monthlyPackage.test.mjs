/**
 * SessionGrantService monthly package regression tests.
 *
 * Locks payment fulfillment for monthly packages whose canonical session count
 * is stored in StorefrontItem.totalSessions rather than StorefrontItem.sessions.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  transaction,
  cartUpdate,
  userIncrement,
  userUpdate,
  findCart,
  findUser,
} = vi.hoisted(() => {
  const transaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn(),
    rollback: vi.fn(),
  };

  return {
    transaction,
    cartUpdate: vi.fn(),
    userIncrement: vi.fn(),
    userUpdate: vi.fn(),
    findCart: vi.fn(),
    findUser: vi.fn(),
  };
});

vi.mock('../database.mjs', () => ({
  default: {
    transaction: vi.fn(() => Promise.resolve(transaction)),
  },
}));

vi.mock('../models/index.mjs', () => ({
  getShoppingCart: () => ({ findOne: findCart }),
  getCartItem: () => ({ name: 'CartItem' }),
  getStorefrontItem: () => ({ name: 'StorefrontItem' }),
  getUser: () => ({ findByPk: findUser }),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { grantSessionsForCart } = await import('../services/SessionGrantService.mjs');

describe('grantSessionsForCart monthly package credits', () => {
  beforeEach(() => {
    transaction.commit.mockClear();
    transaction.rollback.mockClear();
    cartUpdate.mockReset();
    userIncrement.mockReset();
    userUpdate.mockReset();
    findCart.mockReset();
    findUser.mockReset();
  });

  it('grants totalSessions when sessions is null on monthly packages', async () => {
    findCart.mockResolvedValue({
      id: 100,
      userId: 42,
      status: 'pending_payment',
      sessionsGranted: false,
      cartItems: [
        {
          quantity: 1,
          storefrontItem: {
            packageType: 'monthly',
            sessions: null,
            totalSessions: 24,
          },
        },
        {
          quantity: 2,
          storefrontItem: {
            packageType: 'fixed',
            sessions: 5,
            totalSessions: null,
          },
        },
      ],
      update: cartUpdate,
    });

    findUser.mockResolvedValue({
      id: 42,
      increment: userIncrement,
      update: userUpdate,
    });

    const result = await grantSessionsForCart(100, 42, 'verify-session');

    expect(userIncrement).toHaveBeenCalledWith('availableSessions', {
      by: 34,
      transaction,
    });
    expect(cartUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ sessionsGranted: true }),
      { transaction },
    );
    expect(result).toMatchObject({
      granted: true,
      sessionsAdded: 34,
      alreadyProcessed: false,
    });
  });
});
