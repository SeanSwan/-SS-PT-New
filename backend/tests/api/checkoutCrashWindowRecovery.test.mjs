/**
 * Regression: a process crash mid-checkout must not capture money and strand the cart.
 *
 * Found 2026-08-16 by Kimi K3 (CRITICAL-1) in a full-family review.
 *
 * v2PaymentRoutes claims the cart and DELIBERATELY nulls the session id:
 *     ShoppingCart.update({ status:'pending_payment', checkoutSessionId: null, ... })
 *     session = await stripe.checkout.sessions.create({...})   // <-- live, payable
 *     ShoppingCart.update({ checkoutSessionId: session.id, ... })  // finalize
 *
 * A process death between create and finalize — deploy, OOM, container recycle, all
 * routine — leaves a LIVE PAYABLE Stripe session against a cart whose
 * `checkoutSessionId` is null. Then:
 *
 *   - customer pays -> webhook -> grantSessionsForCart(cartId, userId, { checkoutSessionId })
 *   - the guard was `if (checkoutSessionId && cart.checkoutSessionId !== checkoutSessionId) throw`
 *   - null !== 'cs_...' -> THROW -> webhook 500 -> Stripe retries the same failure forever
 *   - money captured, sessions never granted, and sustained 500s get the endpoint
 *     DISABLED, which kills fulfilment for every other sale too.
 *   - the cart is also unrecoverable by the customer: /cancel-checkout requires the
 *     session id, which the cart does not have.
 *
 * Two halves, both here:
 *
 *  1. ADOPTION — absence is not mismatch. A cart with NO recorded session id is
 *     unclaimed, so the first signed Stripe event that names it may claim it. A cart
 *     holding a DIFFERENT session id is still a hard error. This is safe because the
 *     session's `metadata.cartId` is written server-side at creation and the webhook
 *     derives userId from `cart.userId`, never from the event.
 *
 *  2. RELEASE — a sweeper returns carts stranded in `pending_payment` with no session
 *     id back to `active`, so the customer is not locked out while the orphan session
 *     ages. Grant is NOT status-gated (only `sessionsGranted`), so a released cart can
 *     still be fulfilled if that orphan session is paid later.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  cartUpdate: vi.fn(),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { reconcileStalePendingCarts, STALE_CHECKOUT_MS } = await import(
  '../../services/checkoutReconciliationService.mjs'
);

describe('crash-window: sweeper releases carts stranded with no session id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cartUpdate.mockResolvedValue([2]);
  });

  it('releases only pending_payment carts that have NO session id and are stale', async () => {
    const result = await reconcileStalePendingCarts({
      ShoppingCart: { update: mocks.cartUpdate },
      now: new Date('2026-08-16T12:00:00Z'),
    });

    expect(result.released).toBe(2);
    const [values, options] = mocks.cartUpdate.mock.calls[0];

    expect(values).toMatchObject({
      status: 'active',
      paymentStatus: 'cancelled',
      checkoutSessionId: null,
    });
    // The WHERE is the entire safety argument — a second concurrent sweeper, or a
    // cart that has since been paid, must match zero rows.
    expect(options.where.status).toBe('pending_payment');
    expect(options.where.checkoutSessionId).toBeNull();
  });

  it('only touches carts older than the stale threshold', async () => {
    const now = new Date('2026-08-16T12:00:00Z');
    await reconcileStalePendingCarts({ ShoppingCart: { update: mocks.cartUpdate }, now });

    const [, options] = mocks.cartUpdate.mock.calls[0];
    // The clause is an Op.or of [older-than-cutoff, never-attempted]; both keys are
    // SYMBOLS, so Object.values() returns [] and would assert against nothing.
    const [orKey] = Object.getOwnPropertySymbols(options.where);
    expect(orKey, 'staleness must be an Op.or clause').toBeDefined();
    const branches = options.where[orKey];
    expect(Array.isArray(branches)).toBe(true);

    const ltBranch = branches.find((b) => b.lastCheckoutAttempt
      && Object.getOwnPropertySymbols(b.lastCheckoutAttempt).length > 0);
    const [ltKey] = Object.getOwnPropertySymbols(ltBranch.lastCheckoutAttempt);
    const cutoff = ltBranch.lastCheckoutAttempt[ltKey];

    expect(cutoff.getTime()).toBe(now.getTime() - STALE_CHECKOUT_MS);
    // A NULL lastCheckoutAttempt never matches `lt`, so it needs its own branch or
    // those rows are permanently unsweepable.
    expect(branches.some((b) => b.lastCheckoutAttempt === null)).toBe(true);
    // Stripe session creation never takes minutes; the threshold must be far
    // longer than a slow API call and far shorter than a customer's patience.
    expect(STALE_CHECKOUT_MS).toBeGreaterThanOrEqual(10 * 60 * 1000);
  });

  it('never throws — a sweeper that crashes stops sweeping', async () => {
    mocks.cartUpdate.mockRejectedValue(new Error('db down'));

    await expect(
      reconcileStalePendingCarts({ ShoppingCart: { update: mocks.cartUpdate }, now: new Date() })
    ).resolves.toMatchObject({ released: 0, failed: true });
  });
});

// renderLeaseSweeperCron's own header states the lesson: a reclaim mechanism that is
// written but never scheduled is indistinguishable from not building it, except that
// it LOOKS handled in code review. This asserts the sweeper is actually started.
describe('crash-window: the sweeper is wired into startup, not just written', () => {
  it('startup imports and starts the reconciliation sweeper', () => {
    const startup = require('node:fs').readFileSync(
      require('node:path').resolve(process.cwd(), 'core/startup.mjs'), 'utf8'
    );

    expect(startup).toContain('checkoutReconciliationCron.mjs');
    expect(startup).toMatch(/startCheckoutReconciliationSweeper\(\)/);
  });
});

describe('crash-window: an unclaimed cart may be adopted by the session that names it', () => {
  const grantSource = () => require('node:fs').readFileSync(
    require('node:path').resolve(process.cwd(), 'services/SessionGrantService.mjs'), 'utf8'
  );

  it('throws only on a genuine MISMATCH, not on absence', () => {
    const code = grantSource()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

    // The old guard treated null as a mismatch and threw forever.
    expect(code).not.toMatch(
      /if\s*\(\s*checkoutSessionId\s*&&\s*cart\.checkoutSessionId\s*!==\s*checkoutSessionId\s*\)/
    );
    // The new guard requires the cart to actually HOLD a different id.
    expect(code).toMatch(
      /checkoutSessionId\s*&&\s*cart\.checkoutSessionId\s*&&\s*cart\.checkoutSessionId\s*!==\s*checkoutSessionId/
    );
  });

  // Found by attacking the adoption change itself: a customer whose checkout crashed
  // twice has TWO orphan sessions naming one cart. The first adopts and grants; the
  // second then saw a cart holding a different id and THREW — 500, Stripe retries
  // forever, on a cart that was already correctly fulfilled. Idempotency must be
  // answered before ownership, because "already granted" is true regardless of who asks.
  it('answers idempotency BEFORE the ownership check', () => {
    const code = grantSource()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

    const idempotencyAt = code.indexOf('cart.sessionsGranted === true');
    const ownershipAt = code.indexOf('does not own cart');

    expect(idempotencyAt).toBeGreaterThan(-1);
    expect(ownershipAt).toBeGreaterThan(-1);
    expect(idempotencyAt, 'sessionsGranted must be checked before the ownership throw')
      .toBeLessThan(ownershipAt);
  });

  // Found independently by Kimi K3 (HIGH-1) and GLM-5.3 (MEDIUM-1) in round 2 — a
  // vulnerability the TWO fixes create together, which neither creates alone.
  // Adoption runs exactly when the finalize write never happened, which is exactly
  // when the checkout snapshot was never written, so hydration falls through to LIVE
  // cart rows. The sweeper meanwhile returns the cart to `active`, making it editable.
  // Compose them: pay a $60 orphan session, add a $5,000 package to the released cart,
  // and adoption grants $5,060 of sessions for a $60 charge. The user-crossing safety
  // argument is sound; it says nothing about VALUE crossing.
  it('refuses adoption when the charged amount disagrees with the cart total', () => {
    const code = grantSource()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

    // The amount Stripe actually captured must reach the grant...
    expect(code).toMatch(/amountTotalCents/);
    // ...be compared against the cart's own total...
    expect(code).toMatch(/cartTotalCents/);
    // ...and REFUSE rather than grant on disagreement.
    expect(code).toMatch(/adoptionRefused/);
    expect(code).toMatch(/AMOUNT_MISMATCH/);

    // The comparison must gate the adoption branch, not merely be logged.
    const adoptAt = code.indexOf('cart.checkoutSessionId = checkoutSessionId');
    const refuseAt = code.indexOf('AMOUNT_MISMATCH');
    expect(refuseAt).toBeGreaterThan(-1);
    expect(refuseAt, 'the refusal must precede the adoption write').toBeLessThan(adoptAt);
  });

  it('passes the captured amount from the webhook into the grant', () => {
    const webhook = readFileSync(
      resolve(process.cwd(), 'webhooks/stripeWebhook.mjs'), 'utf8'
    );
    expect(webhook).toMatch(/amountTotalCents:\s*session\.amount_total/);
  });

  it('records the adopted session id so the next delivery sees a claimed cart', () => {
    const code = grantSource()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

    // Must actually WRITE the id onto the cart, not merely skip the throw —
    // otherwise every Stripe redelivery re-enters the adoption branch.
    expect(code).toMatch(/cart\.checkoutSessionId\s*=\s*checkoutSessionId/);
    expect(code).toMatch(/checkoutSessionId\s*&&\s*!cart\.checkoutSessionId/);
  });
});
