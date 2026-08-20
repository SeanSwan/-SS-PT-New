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
    //
    // RE-ANCHORED 2026-08-19. This used to assert `rejects.toThrow()`. Throwing
    // was wrong as a FINAL state for a session that Stripe already captured:
    // the webhook 500s, Stripe redelivers the same signed paid event forever,
    // and sustained 5xx is the endpoint-disabling condition this whole fix
    // family exists to avoid. Reachable in production via the reconciliation
    // sweeper: cart released to `active` -> customer re-checks-out (cart now
    // holds session B) -> customer pays the still-live orphan session A.
    //
    // The refusal itself is unchanged and still asserted below. What changed is
    // that it is now TERMINAL and NAMED, so the webhook can alert an admin and
    // acknowledge instead of looping. The no-credit invariant is the contract;
    // the throw was only ever the delivery mechanism.
    findCart.mockResolvedValue(paidCart({ checkoutSessionId: 'cs_test_original' }));

    const result = await grantSessionsForCart(100, 42, 'webhook', {
      checkoutSessionId: 'cs_test_SOMEONE_ELSE',
    });

    expect(userIncrement).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      granted: false,
      sessionsAdded: 0,
      alreadyProcessed: false,
      unfulfillable: true,
      reason: 'SESSION_DOES_NOT_OWN_CART',
    });
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

/**
 * Race ordering between the two crediting entry points.
 *
 * These scenarios previously "existed" in tests/api/payments.test.mjs under
 * "Webhook vs Verify-Session Race Condition" — but those tests built a literal
 * object with sessionsGranted: true and then asserted it was true. They never
 * called production code, so they proved nothing while their names claimed the
 * highest-risk concurrency case on the money path was covered. Rewritten here
 * against the real service.
 */
describe('grantSessionsForCart — webhook vs verify-session ordering', () => {
  beforeEach(() => {
    for (const m of [transaction.commit, transaction.rollback, cartUpdate, userIncrement, userUpdate, findCart, findUser]) m.mockReset();
    findUser.mockResolvedValue({ id: 42, increment: userIncrement, update: userUpdate });
  });

  it('webhook first, then verify-session: credits once, second call is a no-op', async () => {
    findCart.mockResolvedValueOnce(paidCart());
    await grantSessionsForCart(100, 42, 'webhook', { checkoutSessionId: 'cs_test_original' });

    findCart.mockResolvedValueOnce(paidCart({ sessionsGranted: true, status: 'completed' }));
    const second = await grantSessionsForCart(100, 42, 'verify-session', { checkoutSessionId: 'cs_test_original' });

    expect(userIncrement).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({ alreadyProcessed: true });
  });

  it('verify-session first, then webhook: credits once, second call is a no-op', async () => {
    findCart.mockResolvedValueOnce(paidCart());
    await grantSessionsForCart(100, 42, 'verify-session', { checkoutSessionId: 'cs_test_original' });

    findCart.mockResolvedValueOnce(paidCart({ sessionsGranted: true, status: 'completed' }));
    const second = await grantSessionsForCart(100, 42, 'webhook', { checkoutSessionId: 'cs_test_original' });

    expect(userIncrement).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({ alreadyProcessed: true });
  });

  it('either ordering reaches the SAME final cart state', async () => {
    findCart.mockResolvedValue(paidCart());
    await grantSessionsForCart(100, 42, 'webhook', { checkoutSessionId: 'cs_test_original' });
    const [webhookWrite] = cartUpdate.mock.calls[0];

    cartUpdate.mockReset();
    findCart.mockResolvedValue(paidCart());
    await grantSessionsForCart(100, 42, 'verify-session', { checkoutSessionId: 'cs_test_original' });
    const [verifyWrite] = cartUpdate.mock.calls[0];

    // Asserted from what the service actually wrote, not from a literal.
    for (const write of [webhookWrite, verifyWrite]) {
      expect(write).toMatchObject({ status: 'completed', paymentStatus: 'paid', sessionsGranted: true });
    }
    expect(webhookWrite.status).toBe(verifyWrite.status);
    expect(webhookWrite.sessionsGranted).toBe(verifyWrite.sessionsGranted);
  });
});
