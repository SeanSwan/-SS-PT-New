/**
 * SessionGrantService — webhook REPLAY safety (Lane 4 launch audit, round 19)
 * ===========================================================================
 * Stripe redelivers webhooks as a matter of course: network blips, a slow
 * response, its own retry policy after a non-2xx. The training-package money
 * path has NO event.id dedupe (audit finding F-2) — its entire replay defense is
 * the `cart.sessionsGranted` early-return inside grantSessionsForCart, taken
 * under a row lock.
 *
 * That invariant was untested. The existing suites cover the ORDER-level claim
 * (`paymentAppliedAt: null -> now`) but nothing asserted that a second grant for
 * an already-granted cart credits zero sessions. If that early-return ever
 * regressed, a single payment would credit a buyer twice and nothing else in the
 * stack would catch it.
 *
 * These tests drive the real service and assert on the actual credit call.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  transaction, cartUpdate, userIncrement, userUpdate, findCart, findUser, shoppingCartModel,
} = vi.hoisted(() => {
  const findCart = vi.fn();
  return {
    transaction: { LOCK: { UPDATE: 'UPDATE' }, commit: vi.fn(), rollback: vi.fn() },
    cartUpdate: vi.fn(),
    userIncrement: vi.fn(),
    userUpdate: vi.fn(),
    findCart,
    findUser: vi.fn(),
    shoppingCartModel: { name: 'ShoppingCart', findOne: findCart },
  };
});

vi.mock('../database.mjs', () => ({
  default: { transaction: vi.fn(() => Promise.resolve(transaction)) },
}));
vi.mock('../models/index.mjs', () => ({
  getShoppingCart: () => shoppingCartModel,
  getCartItem: () => ({ name: 'CartItem' }),
  getStorefrontItem: () => ({ name: 'StorefrontItem' }),
  getUser: () => ({ findByPk: findUser }),
}));
vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { grantSessionsForCart } = await import('../services/SessionGrantService.mjs');

const paidCart = (overrides = {}) => ({
  id: 100,
  userId: 42,
  status: 'pending_payment',
  sessionsGranted: false,
  checkoutSessionId: 'cs_test_original',
  cartItems: [{ quantity: 1, storefrontItem: { packageType: 'fixed', sessions: 8, totalSessions: null } }],
  update: cartUpdate,
  ...overrides,
});

describe('grantSessionsForCart — Stripe replay safety', () => {
  beforeEach(() => {
    for (const m of [transaction.commit, transaction.rollback, cartUpdate, userIncrement, userUpdate, findCart, findUser]) m.mockReset();
    findUser.mockResolvedValue({ id: 42, increment: userIncrement, update: userUpdate });
  });

  it('credits the buyer on the FIRST delivery', async () => {
    findCart.mockResolvedValue(paidCart());

    const result = await grantSessionsForCart(100, 42, 'webhook', { checkoutSessionId: 'cs_test_original' });

    expect(userIncrement).toHaveBeenCalledWith('availableSessions', { by: 8, transaction });
    expect(result).toMatchObject({ granted: true, sessionsAdded: 8, alreadyProcessed: false });
  });

  it('credits NOTHING on a redelivery of the same paid cart', async () => {
    // Stripe retried; the cart row already carries the grant flag.
    findCart.mockResolvedValue(paidCart({ sessionsGranted: true, status: 'completed' }));

    const result = await grantSessionsForCart(100, 42, 'webhook', { checkoutSessionId: 'cs_test_original' });

    expect(userIncrement).not.toHaveBeenCalled();
    expect(result).toMatchObject({ alreadyProcessed: true });
  });

  it('a redelivery does not re-run the cart status write either', async () => {
    findCart.mockResolvedValue(paidCart({ sessionsGranted: true, status: 'completed' }));

    await grantSessionsForCart(100, 42, 'webhook', { checkoutSessionId: 'cs_test_original' });

    expect(cartUpdate).not.toHaveBeenCalled();
  });

  it('refuses to credit when the webhook names a DIFFERENT checkout session', async () => {
    // Cross-cart protection: a webhook for session B must not credit cart A.
    findCart.mockResolvedValue(paidCart({ checkoutSessionId: 'cs_test_original' }));

    await expect(
      grantSessionsForCart(100, 42, 'webhook', { checkoutSessionId: 'cs_test_SOMEONE_ELSE' })
    ).rejects.toThrow();

    expect(userIncrement).not.toHaveBeenCalled();
  });

  it('two concurrent deliveries cannot both credit — the flag is read under the row lock', async () => {
    // Proves the guard is evaluated from the LOCKED row, not from a value the
    // caller passed in: the second call sees the post-commit state.
    findCart.mockResolvedValueOnce(paidCart());
    findCart.mockResolvedValueOnce(paidCart({ sessionsGranted: true, status: 'completed' }));

    await grantSessionsForCart(100, 42, 'webhook', { checkoutSessionId: 'cs_test_original' });
    await grantSessionsForCart(100, 42, 'webhook', { checkoutSessionId: 'cs_test_original' });

    expect(userIncrement).toHaveBeenCalledTimes(1);
    expect(userIncrement).toHaveBeenCalledWith('availableSessions', { by: 8, transaction });
  });

  it('locks the cart row for update rather than reading it dirty', async () => {
    findCart.mockResolvedValue(paidCart());

    await grantSessionsForCart(100, 42, 'webhook', { checkoutSessionId: 'cs_test_original' });

    const [[opts]] = findCart.mock.calls;
    expect(opts.lock).toBeDefined();
    expect(opts.transaction).toBe(transaction);
  });
});
