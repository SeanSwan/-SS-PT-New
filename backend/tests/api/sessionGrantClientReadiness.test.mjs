/**
 * sessionGrantClientReadiness.test.mjs
 * ====================================
 * Locks the checkout-to-client readiness contract. A paid training-session
 * checkout must leave a regular authenticated user with the client role, not
 * just a larger session balance.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockTransaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn().mockResolvedValue(true),
    rollback: vi.fn().mockResolvedValue(true),
  };
  return {
    mockTransaction,
    mockShoppingCart: { findOne: vi.fn() },
    mockUserModel: { findByPk: vi.fn() },
  };
});

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn().mockResolvedValue(mocks.mockTransaction),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => mocks.mockShoppingCart,
  getCartItem: () => ({}),
  getStorefrontItem: () => ({}),
  getUser: () => mocks.mockUserModel,
}));

const { grantSessionsForCart } = await import('../../services/SessionGrantService.mjs');

function makeCart(overrides = {}) {
  return {
    id: 42,
    userId: 3,
    status: 'pending_payment',
    sessionsGranted: false,
    cartItems: [
      {
        quantity: 1,
        storefrontItem: {
          sessions: 10,
          totalSessions: 0,
        },
      },
    ],
    update: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeUser(overrides = {}) {
  return {
    id: 3,
    role: 'user',
    availableSessions: 0,
    increment: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('SessionGrantService client readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockTransaction.commit.mockResolvedValue(true);
    mocks.mockTransaction.rollback.mockResolvedValue(true);
  });

  it('upgrades a paid training purchaser from user to client during the grant transaction', async () => {
    const cart = makeCart();
    const user = makeUser({ role: 'user' });
    mocks.mockShoppingCart.findOne.mockResolvedValue(cart);
    mocks.mockUserModel.findByPk.mockResolvedValue(user);

    await grantSessionsForCart(cart.id, user.id, 'verify-session');

    expect(user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'client',
        hasPurchasedBefore: true,
      }),
      { transaction: mocks.mockTransaction },
    );
  });
});
