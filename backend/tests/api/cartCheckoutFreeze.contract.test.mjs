import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Money-path safety — cart frozen while a Stripe checkout is pending (C1).
 * ============================================================================
 * INVARIANT: once `create-checkout-session` stamps a cart with
 * checkoutSessionId + paymentStatus:'pending', the cart's line items are what
 * the Stripe webhook will fulfill. Mutating rows in that window let a buyer
 * pay Stripe for 1x and be granted Nx, because fulfillment re-reads the
 * current cart rows (SessionGrantService.calculateCartSessionCredits).
 *
 * This is a GREP CONTRACT (house style: moneyPathInvariants.contract.test.mjs):
 * every cart MUTATION route (/add, /update/:itemId, /remove/:itemId, /clear)
 * must call the checkout-lock predicate before touching cart rows. A real
 * weakening of the invariant (removing a guard call) fails this test; routine
 * reformatting does not (tolerant regex). Companion behavioral tests for the
 * grant-side reconciliation: sessionGrantAmountReconciliation.test.mjs.
 */
const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const cart = read('routes/cartRoutes.mjs');
const pay = read('routes/v2PaymentRoutes.mjs');

/** Slice one route handler out of the source by its unique route marker. */
const section = (src, startMarker, endMarker) => {
  const start = src.indexOf(startMarker);
  expect(start, `route marker not found: ${startMarker}`).toBeGreaterThan(-1);
  const end = endMarker ? src.indexOf(endMarker, start + 1) : src.length;
  return src.slice(start, end > start ? end : src.length);
};

describe('money-path: cart checkout lock predicate', () => {
  it('defines the lock keyed on checkoutSessionId + pending paymentStatus', () => {
    expect(cart).toMatch(/(const|function)\s+isCartCheckoutLocked/);
    expect(cart).toMatch(/checkoutSessionId/);
    expect(cart).toMatch(/paymentStatus/);
    expect(cart).toMatch(/'pending'/);
  });

  it('releases the lock when the Stripe session expired (webhook flag or 24h age cap)', () => {
    expect(cart).toMatch(/checkoutSessionExpired/);
    expect(cart).toMatch(/CHECKOUT_SESSION_MAX_AGE_MS|lastCheckoutAttempt/);
  });

  it('returns a distinct 409 code so the frontend can react', () => {
    expect(cart).toMatch(/CART_CHECKOUT_LOCKED/);
  });

  it('v2 checkout actually stamps paymentStatus pending (the state the lock keys on)', () => {
    expect(pay).toMatch(/paymentStatus:\s*'pending'/);
  });
});

describe('money-path: every cart mutation route is guarded', () => {
  it('POST /add refuses to mutate a checkout-locked cart', () => {
    const add = section(cart, "router.post('/add'", "router.put('/update/:itemId'");
    expect(add).toMatch(/isCartCheckoutLocked/);
  });

  it('PUT /update/:itemId refuses to mutate a checkout-locked cart', () => {
    const update = section(cart, "router.put('/update/:itemId'", "router.delete('/remove/:itemId'");
    expect(update).toMatch(/isCartCheckoutLocked/);
  });

  it('DELETE /remove/:itemId refuses to mutate a checkout-locked cart', () => {
    const remove = section(cart, "router.delete('/remove/:itemId'", "router.delete('/clear'");
    expect(remove).toMatch(/isCartCheckoutLocked/);
  });

  it('DELETE /clear refuses to mutate a checkout-locked cart', () => {
    const clear = section(cart, "router.delete('/clear'", "router.post('/checkout'");
    expect(clear).toMatch(/isCartCheckoutLocked/);
  });
});
