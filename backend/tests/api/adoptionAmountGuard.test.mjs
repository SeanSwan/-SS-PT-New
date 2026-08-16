/**
 * Regression (BEHAVIOURAL): adoption must refuse when the charged amount disagrees
 * with the cart total.
 *
 * This is the round-2 consensus finding — Kimi K3 HIGH-1 and GLM-5.3 MEDIUM-1, found
 * independently. Two individually-safe fixes compose into a value-crossing hole:
 *
 *   1. adoption runs exactly when the finalize write never happened, which is exactly
 *      when the checkout SNAPSHOT was never written, so hydration falls through to
 *      LIVE cart rows;
 *   2. the sweeper returns the stranded cart to `active`, making it EDITABLE again.
 *
 * Pay a $60 orphan session -> add a $5,000 package to the released cart -> adoption
 * grants $5,060 of sessions for a $60 charge.
 *
 * WHY THIS FILE EXISTS SEPARATELY: the first guard I wrote for this shipped with only
 * SOURCE-TEXT assertions (`expect(code).toMatch(/AMOUNT_MISMATCH/)`). A mutation test
 * that replaced the guard's condition with `if (false)` left every one of those
 * strings in the file, so the suite stayed GREEN with the guard fully disabled. The
 * assertion was decoration on the most important fix of the batch. This executes it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: { rollback: vi.fn(), commit: vi.fn(), LOCK: { UPDATE: 'UPDATE' } },
  cart: null,
  user: null,
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: vi.fn(async () => mocks.transaction) },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => ({ findOne: vi.fn(async () => mocks.cart) }),
  getCartItem: () => ({}),
  getStorefrontItem: () => ({}),
  getUser: () => ({ findByPk: vi.fn(async () => mocks.user) }),
}));

vi.mock('../../services/cartCheckoutFulfillmentService.mjs', () => ({
  createCartOrderIfPossible: vi.fn(async () => ({ orderId: 1, productItemsFulfilled: 0 })),
  loadOptionalFulfillmentModels: vi.fn(async () => ({ ProductVariant: null, Order: {}, OrderItem: {} })),
  isPhysicalCartItem: () => false,
}));

vi.mock('../../services/sessionBillingPolicy.mjs', () => ({ isNonDeductingClient: () => false }));

vi.mock('../../services/cartCheckoutSnapshotService.mjs', () => ({
  // The adoption path is precisely where no snapshot exists — hydration therefore
  // returns the cart's LIVE items, which is the whole mechanism of the vulnerability.
  hydrateCartCheckoutItems: vi.fn(async ({ cart }) => cart.cartItems),
  readCartCheckoutSnapshot: vi.fn(() => null),
}));

const { grantSessionsForCart } = await import('../../services/SessionGrantService.mjs');

// A cart stranded by the crash window: no session id recorded, and — after the
// sweeper released it — mutated to hold a far more expensive package.
const makeCart = (totalDollars) => ({
  id: 42,
  userId: 3,
  total: totalDollars,
  checkoutSessionId: null,      // unclaimed => adoption branch
  sessionsGranted: false,
  status: 'active',             // released by the sweeper => editable
  cartItems: [
    { id: 1, quantity: 1, price: totalDollars, storefrontItem: { id: 9, sessions: 48 } },
  ],
  update: vi.fn(async () => true),
  save: vi.fn(async () => true),
});

describe('adoption refuses a grant whose charged amount does not match the cart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 3, role: 'user', increment: vi.fn(), update: vi.fn() };
  });

  it('REFUSES when a $60 charge meets a cart mutated to $5,060', async () => {
    mocks.cart = makeCart(5060);

    const result = await grantSessionsForCart(42, 3, 'webhook', {
      checkoutSessionId: 'cs_orphan_A',
      amountTotalCents: 6000, // Stripe captured $60
    });

    expect(result.granted).toBe(false);
    expect(result.adoptionRefused).toBe(true);
    expect(result.reason).toBe('AMOUNT_MISMATCH');

    // Nothing may be credited, and the orphan session must NOT be adopted.
    expect(mocks.user.increment).not.toHaveBeenCalled();
    expect(mocks.cart.checkoutSessionId).toBeNull();
    expect(mocks.transaction.rollback).toHaveBeenCalled();
    expect(mocks.transaction.commit).not.toHaveBeenCalled();
  });

  it('ALLOWS honest recovery — cart untouched, amounts agree', async () => {
    mocks.cart = makeCart(60);

    const result = await grantSessionsForCart(42, 3, 'webhook', {
      checkoutSessionId: 'cs_orphan_A',
      amountTotalCents: 6000,
    });

    expect(result.adoptionRefused).toBeUndefined();
    expect(mocks.cart.checkoutSessionId).toBe('cs_orphan_A'); // adopted
    expect(mocks.transaction.rollback).not.toHaveBeenCalled();
  });

  it('refuses on an under-charge too, not just an over-grant', async () => {
    mocks.cart = makeCart(100);

    const result = await grantSessionsForCart(42, 3, 'webhook', {
      checkoutSessionId: 'cs_orphan_A',
      amountTotalCents: 20000, // $200 captured for a $100 cart
    });

    expect(result.adoptionRefused).toBe(true);
  });

  // Callers that genuinely cannot supply an amount (reconciliation script,
  // verify-session) must not be blocked — the guard is opt-in on the data existing.
  it('adopts when no amount is supplied at all', async () => {
    mocks.cart = makeCart(60);

    const result = await grantSessionsForCart(42, 3, 'reconciliation', {
      checkoutSessionId: 'cs_orphan_A',
    });

    expect(result.adoptionRefused).toBeUndefined();
    expect(mocks.cart.checkoutSessionId).toBe('cs_orphan_A');
  });
});
