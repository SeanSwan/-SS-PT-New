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
    // Renamed 2026-08-19: the guard now holds anything UNVERIFIABLE, not only a
    // numeric mismatch (a zero cart total and a missing amount both qualify).
    expect(result.reason).toBe('ADOPTION_UNVERIFIABLE');

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

  // REVERSED 2026-08-19 (Kimi K3 C1/H1). This previously asserted that a missing
  // amount still ADOPTS, on the reasoning that callers which cannot supply one must
  // not be blocked. That reasoning was wrong twice over: it made "no data" mean
  // "trust it", which is the same bypass as a zero cart total, and it was unnecessary
  // — no caller is actually affected. Verified: adminOrdersRoutes and
  // reconcile-ungrant-carts pass NO checkoutSessionId, so the adoption branch is
  // unreachable for them; verify-session finds its cart BY checkoutSessionId, so the
  // cart's id is never null there. Only the webhook reaches adoption, and it now
  // always supplies the amount.
  it('HOLDS when no amount is supplied, and no real caller is affected', async () => {
    mocks.cart = makeCart(60);

    const result = await grantSessionsForCart(42, 3, 'reconciliation', {
      checkoutSessionId: 'cs_orphan_A',
    });

    expect(result.unfulfillable).toBe(true);
    expect(mocks.cart.checkoutSessionId).toBeNull();
  });
});

/**
 * Kimi K3 hostile review, 2026-08-19 — three defects in the FIRST version of this
 * guard, all of which made production worse rather than better.
 *
 *  C1a  FALSE REFUSAL BY CONSTRUCTION. Sessions are created with `automatic_tax` and
 *       `allow_promotion_codes`, so `session.amount_total` includes tax and reflects
 *       discounts — while `cart.total` is written pre-tax (`const total = subtotal`)
 *       and pre-discount. Every taxable or promo cart mismatched, so an HONEST
 *       crash-window payment was refused.
 *  C1b  THE REFUSAL WAS SILENT. Nothing consumed `adoptionRefused`; the webhook
 *       200'd. Money captured, nothing granted, no alert, no retry — strictly worse
 *       than the 500 it replaced, which at least retried and was visible.
 *  H1   THE GUARD WAS SKIPPED when the cart total was 0/NULL. Totals persistence is
 *       explicitly non-fatal, so a stale-total cart bypassed it and the original
 *       $5,060 over-grant survived.
 *
 * The rule now: auto-grant ONLY on exact agreement; everything else is UNVERIFIABLE
 * and is held for a human, never silently granted and never silently dropped.
 */
describe('adoption holds anything it cannot verify, and never does so silently', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 3, role: 'user', increment: vi.fn(), update: vi.fn() };
  });

  // H1 — the bypass. A stale/zero total must NOT mean "skip the check and grant".
  it('HOLDS when the cart total is zero — the old code granted here', async () => {
    mocks.cart = makeCart(0);

    const result = await grantSessionsForCart(42, 3, 'webhook', {
      checkoutSessionId: 'cs_orphan_A',
      amountTotalCents: 6000,
    });

    expect(result.granted).toBe(false);
    expect(result.unfulfillable).toBe(true);
    expect(mocks.user.increment).not.toHaveBeenCalled();
  });

  it('HOLDS when no amount is supplied — unverifiable, not implicitly trusted', async () => {
    mocks.cart = makeCart(60);

    const result = await grantSessionsForCart(42, 3, 'webhook', {
      checkoutSessionId: 'cs_orphan_A',
    });

    expect(result.unfulfillable).toBe(true);
    expect(mocks.cart.checkoutSessionId).toBeNull();
  });

  // C1a — a taxable cart. amount_total > cart.total legitimately. It must be HELD
  // (surfaced to a human), never granted blindly and never dropped silently.
  it('HOLDS a taxable/promo cart rather than granting or dropping it', async () => {
    mocks.cart = makeCart(100);

    const result = await grantSessionsForCart(42, 3, 'webhook', {
      checkoutSessionId: 'cs_orphan_A',
      amountTotalCents: 10875, // $100 + $8.75 tax
    });

    expect(result.unfulfillable).toBe(true);
    expect(result.alertContext, 'must carry context for the human').toBeTruthy();
    expect(result.alertContext.cartId).toBe(42);
    expect(mocks.user.increment).not.toHaveBeenCalled();
  });

  // C1b — every hold must be actionable, not a bare boolean.
  it('always returns alertContext so the webhook can raise a real alert', async () => {
    mocks.cart = makeCart(5060);

    const result = await grantSessionsForCart(42, 3, 'webhook', {
      checkoutSessionId: 'cs_orphan_A',
      amountTotalCents: 6000,
    });

    expect(result.unfulfillable).toBe(true);
    expect(result.alertContext).toMatchObject({ cartId: 42, userId: 3, amountTotalCents: 6000 });
  });

  // H2 — a paid session that can never own its cart. Previously threw, which made
  // Stripe retry a permanent condition forever.
  it('TERMINATES instead of throwing when a paid session does not own the cart', async () => {
    mocks.cart = makeCart(60);
    mocks.cart.checkoutSessionId = 'cs_OTHER';

    const result = await grantSessionsForCart(42, 3, 'webhook', {
      checkoutSessionId: 'cs_orphan_A',
      amountTotalCents: 6000,
    });

    expect(result.unfulfillable).toBe(true);
    expect(result.reason).toBe('SESSION_DOES_NOT_OWN_CART');
    expect(result.alertContext.eventSessionId).toBe('cs_orphan_A');
    expect(result.alertContext.cartSessionId).toBe('cs_OTHER');
    expect(mocks.user.increment).not.toHaveBeenCalled();
  });

  it('still auto-grants the clean case — exact agreement, untouched cart', async () => {
    mocks.cart = makeCart(60);

    const result = await grantSessionsForCart(42, 3, 'webhook', {
      checkoutSessionId: 'cs_orphan_A',
      amountTotalCents: 6000,
    });

    expect(result.unfulfillable).toBeUndefined();
    expect(mocks.cart.checkoutSessionId).toBe('cs_orphan_A');
  });
});
