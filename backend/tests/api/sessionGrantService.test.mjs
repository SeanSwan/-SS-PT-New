/**
 * SessionGrantService Tests
 * ==========================
 * P0: Validates shared session granting with transaction, row lock,
 *     atomic increment, and idempotency (sessionsGranted only).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testPackages } from '../fixtures/testData.mjs';

// vi.hoisted runs before vi.mock hoisting, so these are available in factories
const { mockTransaction, mockShoppingCart, mockUserModel } = vi.hoisted(() => {
  const mockTransaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn().mockResolvedValue(true),
    rollback: vi.fn().mockResolvedValue(true),
  };
  const mockShoppingCart = { findOne: vi.fn() };
  const mockUserModel = { findByPk: vi.fn() };
  return { mockTransaction, mockShoppingCart, mockUserModel };
});

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn().mockResolvedValue(mockTransaction),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => mockShoppingCart,
  getCartItem: () => ({}),
  getStorefrontItem: () => ({}),
  getUser: () => mockUserModel,
}));

import { grantSessionsForCart } from '../../services/SessionGrantService.mjs';

// ── Helpers ──────────────────────────────────────────────────
function makeUser(id, sessions = 0) {
  return {
    id,
    availableSessions: sessions,
    update: vi.fn().mockResolvedValue(true),
    increment: vi.fn().mockResolvedValue(true),
  };
}

function makeCart(cartId, userId, overrides = {}) {
  return {
    id: cartId,
    userId,
    status: 'pending_payment',
    sessionsGranted: false,
    cartItems: [
      {
        quantity: 1,
        storefrontItem: { ...testPackages.tenPack },
      },
    ],
    user: makeUser(userId, 0),
    update: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('SessionGrantService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.commit.mockResolvedValue(true);
    mockTransaction.rollback.mockResolvedValue(true);
  });

  // ─────────────────────────────────────────────────────────
  // P0: Happy path
  // ─────────────────────────────────────────────────────────
  it('grants sessions for valid unprocessed cart', async () => {
    const cart = makeCart(1, 100);
    const user = makeUser(100, 0);
    mockShoppingCart.findOne.mockResolvedValue(cart);
    mockUserModel.findByPk.mockResolvedValue(user);

    const result = await grantSessionsForCart(1, 100, 'verify-session');

    expect(result.granted).toBe(true);
    expect(result.sessionsAdded).toBe(10);
    expect(result.alreadyProcessed).toBe(false);
    expect(mockTransaction.commit).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────
  // P0: Idempotency — sessionsGranted=true
  // ─────────────────────────────────────────────────────────
  it('returns alreadyProcessed=true for sessionsGranted=true cart', async () => {
    const cart = makeCart(1, 100, { sessionsGranted: true });
    mockShoppingCart.findOne.mockResolvedValue(cart);

    const result = await grantSessionsForCart(1, 100, 'verify-session');

    expect(result.granted).toBe(false);
    expect(result.sessionsAdded).toBe(0);
    expect(result.alreadyProcessed).toBe(true);
    expect(mockTransaction.rollback).toHaveBeenCalled();
    // User row lock should never be attempted for idempotent carts
    expect(mockUserModel.findByPk).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────
  // P0: REGRESSION — status=completed but sessionsGranted=false STILL grants
  // This is the exact bug that was fixed. Webhook sets status='completed'
  // but not sessionsGranted. Service must still grant sessions.
  // ─────────────────────────────────────────────────────────
  it('grants sessions when status=completed but sessionsGranted=false', async () => {
    const cart = makeCart(1, 100, {
      status: 'completed',
      sessionsGranted: false, // Webhook set status but not this flag
    });
    const user = makeUser(100, 5);
    mockShoppingCart.findOne.mockResolvedValue(cart);
    mockUserModel.findByPk.mockResolvedValue(user);

    const result = await grantSessionsForCart(1, 100, 'verify-session');

    expect(result.granted).toBe(true);
    expect(result.sessionsAdded).toBe(10);
    expect(result.alreadyProcessed).toBe(false);
  });

  // ─────────────────────────────────────────────────────────
  // P0: Atomic increment (not read-then-write)
  // ─────────────────────────────────────────────────────────
  it('uses user.increment for atomic session addition', async () => {
    const cart = makeCart(1, 100);
    const user = makeUser(100, 5);
    mockShoppingCart.findOne.mockResolvedValue(cart);
    mockUserModel.findByPk.mockResolvedValue(user);

    await grantSessionsForCart(1, 100, 'verify-session');

    expect(user.increment).toHaveBeenCalledWith('availableSessions', {
      by: 10,
      transaction: mockTransaction,
    });
    // Must NOT call user.update with availableSessions (that would be read-then-write)
    expect(user.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ availableSessions: expect.any(Number) }),
      expect.anything()
    );
  });

  // ─────────────────────────────────────────────────────────
  // P0: Row lock on cart
  // ─────────────────────────────────────────────────────────
  it('acquires row lock on cart during grant', async () => {
    const cart = makeCart(1, 100);
    const user = makeUser(100);
    mockShoppingCart.findOne.mockResolvedValue(cart);
    mockUserModel.findByPk.mockResolvedValue(user);

    await grantSessionsForCart(1, 100, 'webhook');

    expect(mockShoppingCart.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        lock: 'UPDATE',
        transaction: mockTransaction,
      })
    );
  });

  // ─────────────────────────────────────────────────────────
  // P0: User row lock
  // ─────────────────────────────────────────────────────────
  it('acquires row lock on user during grant', async () => {
    const cart = makeCart(1, 100);
    const user = makeUser(100);
    mockShoppingCart.findOne.mockResolvedValue(cart);
    mockUserModel.findByPk.mockResolvedValue(user);

    await grantSessionsForCart(1, 100, 'verify-session');

    expect(mockUserModel.findByPk).toHaveBeenCalledWith(100, {
      transaction: mockTransaction,
      lock: 'UPDATE',
    });
  });

  // ─────────────────────────────────────────────────────────
  // P1: Transaction rollback on error
  // ─────────────────────────────────────────────────────────
  it('rolls back transaction on error', async () => {
    const cart = makeCart(1, 100);
    const user = makeUser(100);
    mockShoppingCart.findOne.mockResolvedValue(cart);
    mockUserModel.findByPk.mockResolvedValue(user);
    user.increment.mockRejectedValue(new Error('DB error'));

    await expect(grantSessionsForCart(1, 100, 'verify-session')).rejects.toThrow('DB error');
    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────
  // P1: Cart not found
  // ─────────────────────────────────────────────────────────
  it('throws for non-existent cart and rolls back exactly once', async () => {
    mockShoppingCart.findOne.mockResolvedValue(null);

    await expect(grantSessionsForCart(999, 100, 'verify-session'))
      .rejects.toThrow('Cart 999 not found for user 100');
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
  });

  // ─────────────────────────────────────────────────────────
  // P1: Empty cart (0 sessions)
  // ─────────────────────────────────────────────────────────
  it('handles cart with 0 sessions gracefully', async () => {
    const cart = makeCart(1, 100, { cartItems: [] });
    const user = makeUser(100);
    mockShoppingCart.findOne.mockResolvedValue(cart);
    mockUserModel.findByPk.mockResolvedValue(user);

    const result = await grantSessionsForCart(1, 100, 'verify-session');

    expect(result.granted).toBe(true);
    expect(result.sessionsAdded).toBe(0);
    // increment should NOT be called for 0 sessions
    expect(user.increment).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────
  // P0: Concurrent calls grant exactly once
  // ─────────────────────────────────────────────────────────
  it('concurrent calls grant sessions exactly once', async () => {
    let grantCount = 0;
    const cart = makeCart(1, 100, { sessionsGranted: false });
    const user = makeUser(100);

    // First call sees sessionsGranted=false, grants
    // Second call sees sessionsGranted=true (after first call updates)
    mockShoppingCart.findOne
      .mockResolvedValueOnce(cart) // First call
      .mockResolvedValueOnce({ ...cart, sessionsGranted: true }); // Second call
    mockUserModel.findByPk.mockResolvedValue(user);

    const result1 = await grantSessionsForCart(1, 100, 'verify-session');
    const result2 = await grantSessionsForCart(1, 100, 'webhook');

    expect(result1.granted).toBe(true);
    expect(result2.granted).toBe(false);
    expect(result2.alreadyProcessed).toBe(true);
  });

  // ─────────────────────────────────────────────────────────
  // P0: Webhook-first race — sessions ARE granted
  // ─────────────────────────────────────────────────────────
  it('webhook-first race: webhook grants, verify-session is idempotent', async () => {
    const user = makeUser(100);

    // Webhook runs first: sessionsGranted=false -> grants
    const cartForWebhook = makeCart(1, 100, { sessionsGranted: false });
    mockShoppingCart.findOne.mockResolvedValueOnce(cartForWebhook);
    mockUserModel.findByPk.mockResolvedValueOnce(user);

    const webhookResult = await grantSessionsForCart(1, 100, 'webhook');
    expect(webhookResult.granted).toBe(true);
    expect(webhookResult.sessionsAdded).toBe(10);

    // Verify-session runs second: sessionsGranted=true -> idempotent
    const cartForVerify = makeCart(1, 100, { sessionsGranted: true });
    mockShoppingCart.findOne.mockResolvedValueOnce(cartForVerify);

    const verifyResult = await grantSessionsForCart(1, 100, 'verify-session');
    expect(verifyResult.granted).toBe(false);
    expect(verifyResult.alreadyProcessed).toBe(true);
  });

  // ─────────────────────────────────────────────────────────
  // P0: Verify-first then webhook is idempotent
  // ─────────────────────────────────────────────────────────
  it('verify-first race: verify grants, webhook is idempotent', async () => {
    const user = makeUser(100);

    // Verify runs first
    const cartForVerify = makeCart(1, 100, { sessionsGranted: false });
    mockShoppingCart.findOne.mockResolvedValueOnce(cartForVerify);
    mockUserModel.findByPk.mockResolvedValueOnce(user);

    const verifyResult = await grantSessionsForCart(1, 100, 'verify-session');
    expect(verifyResult.granted).toBe(true);

    // Webhook runs second
    const cartForWebhook = makeCart(1, 100, { sessionsGranted: true });
    mockShoppingCart.findOne.mockResolvedValueOnce(cartForWebhook);

    const webhookResult = await grantSessionsForCart(1, 100, 'webhook');
    expect(webhookResult.granted).toBe(false);
    expect(webhookResult.alreadyProcessed).toBe(true);
  });
});
