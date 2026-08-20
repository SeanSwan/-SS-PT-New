/**
 * checkoutPriceAndCatalogGates.test.mjs
 * =====================================
 * Two gaps in the last gate before Stripe is charged, from the 2026-08-19
 * Kimi K3 / GLM-5.3 hostile review.
 *
 * GLM M3 — the v2 rail re-validates QUANTITY fail-closed at 422 but has no
 * PRICE analogue. `resolveCheckoutLineItem` does:
 *
 *     const itemPrice = toMoneyNumber(item?.price);   // non-finite -> 0
 *
 * and charges whatever comes out. `resolveUnitPrice` exists and is enforced at
 * ADD time, but a CartItem row carrying `price: 0` (persistable per the
 * itemPricing header, and reachable through any admin/repair/import path that
 * writes cart_items directly, or a row predating the add-time gate) rides the
 * snapshot straight through: charged $0, full sessions granted. The quantity
 * gate's own comment argues exactly this — "never charge for a line the
 * buyer's displayed total did not include" — and then only guards quantity.
 *
 * Kimi M3 — `validateCheckoutStockAvailability` tests
 * `item?.storefrontItem?.isActive === false`. When the catalog row was DELETED
 * after add-to-cart, `item.storefrontItem` is null, the optional chain yields
 * `undefined`, `undefined === false` is false, and checkout proceeds. The
 * grant side explicitly tolerates a missing catalog record
 * (`catalogRecordMissing`), so a deleted item is fully purchasable AND
 * fulfillable from a stale cart. `isActive: false` was handled; row-absence
 * was the unhandled state.
 *
 * Both gates fail CLOSED and both use 422/409 deliberately, not 500: an
 * unprocessable cart row is not transient, and a client that retries a 500
 * spins forever.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  validateCheckoutStockAvailability,
  CHECKOUT_ITEM_UNAVAILABLE_CODE,
} from '../../services/checkoutStockAvailabilityService.mjs';
import {
  findUnpriceableCheckoutLine,
  CHECKOUT_LINE_PRICE_INVALID_CODE,
} from '../../services/checkoutLinePriceGuard.mjs';

const line = (over = {}) => ({
  id: 7,
  storefrontItemId: 11,
  quantity: 1,
  price: 175,
  storefrontItem: { id: 11, name: 'Single Session', isActive: true, sessions: 1 },
  ...over,
});

describe('price gate — the quantity gate finally has its analogue', () => {
  it('passes a healthy line untouched', () => {
    expect(findUnpriceableCheckoutLine([line()])).toBeNull();
  });

  it('refuses a $0 line — charged nothing, sessions granted in full', () => {
    const bad = findUnpriceableCheckoutLine([line({ price: 0 })]);
    expect(bad).toMatchObject({ code: CHECKOUT_LINE_PRICE_INVALID_CODE, cartItemId: 7 });
  });

  it('refuses a null price', () => {
    expect(findUnpriceableCheckoutLine([line({ price: null })])).not.toBeNull();
  });

  it('refuses a negative price — a credit is not a purchase', () => {
    expect(findUnpriceableCheckoutLine([line({ price: -50 })])).not.toBeNull();
  });

  it('refuses a non-numeric price rather than coercing it to zero', () => {
    // toMoneyNumber turned this into 0 and charged it.
    expect(findUnpriceableCheckoutLine([line({ price: 'free' })])).not.toBeNull();
    expect(findUnpriceableCheckoutLine([line({ price: NaN })])).not.toBeNull();
    expect(findUnpriceableCheckoutLine([line({ price: Infinity })])).not.toBeNull();
  });

  it('ACCEPTS a numeric string — Sequelize returns DECIMAL columns as strings', () => {
    // The total helper already carries explicit string handling for this reason.
    // Refusing strings here would break every real checkout.
    expect(findUnpriceableCheckoutLine([line({ price: '175.00' })])).toBeNull();
  });

  it('finds the offending line among healthy ones', () => {
    const bad = findUnpriceableCheckoutLine([
      line(),
      line({ id: 8, price: 0 }),
      line({ id: 9 }),
    ]);
    expect(bad?.cartItemId).toBe(8);
  });

  it('is safe on an empty or absent cart', () => {
    expect(findUnpriceableCheckoutLine([])).toBeNull();
    expect(findUnpriceableCheckoutLine(undefined)).toBeNull();
  });
});

describe('catalog gate — a DELETED row is not merely an inactive one', () => {
  it('still refuses an explicitly retired item (no regression)', () => {
    const result = validateCheckoutStockAvailability([
      line({ storefrontItem: { id: 11, name: 'Retired', isActive: false } }),
    ]);
    expect(result).toMatchObject({ code: CHECKOUT_ITEM_UNAVAILABLE_CODE });
  });

  it('refuses a line whose catalog row is GONE', () => {
    const result = validateCheckoutStockAvailability([line({ storefrontItem: null })]);
    expect(result).toMatchObject({ code: CHECKOUT_ITEM_UNAVAILABLE_CODE, status: 409 });
  });

  it('refuses when the catalog row is undefined rather than null', () => {
    const result = validateCheckoutStockAvailability([line({ storefrontItem: undefined })]);
    expect(result).not.toBeNull();
  });

  it('refuses a line whose VARIANT row is gone but was expected', () => {
    const result = validateCheckoutStockAvailability([
      line({ productVariantId: 4, productVariant: null }),
    ]);
    expect(result).not.toBeNull();
  });

  it('does not invent a failure for a line that never had a variant', () => {
    expect(validateCheckoutStockAvailability([line()])).toBeNull();
  });

  it('names the missing item so support can act on the alert', () => {
    const result = validateCheckoutStockAvailability([
      line({ storefrontItemId: 4242, storefrontItem: null }),
    ]);
    expect(String(result.itemName)).toContain('4242');
  });
});

/**
 * A gate that exists but is not called is decoration. These assertions read the
 * route's EXECUTABLE source with comments stripped first — twice in this
 * workstream a source-text guard passed by matching the explanatory comment
 * that described the very defect it was supposed to catch.
 */
const __dir = dirname(fileURLToPath(import.meta.url));

const executableSource = (relativePath) => readFileSync(resolve(__dir, relativePath), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('the gates are actually wired into the checkout route', () => {
  const source = executableSource('../../routes/v2PaymentRoutes.mjs');

  it('calls the price guard', () => {
    expect(source).toContain('findUnpriceableCheckoutLine(cart.cartItems)');
  });

  it('refuses BEFORE Stripe is called, not after', () => {
    // The CALL expression, not the bare name — the import line also contains
    // the name and sits above everything, so matching the name alone made this
    // ordering assertion impossible to fail.
    const gateAt = source.indexOf('findUnpriceableCheckoutLine(cart.cartItems)');
    const stripeAt = source.indexOf('checkout.sessions.create');

    expect(gateAt).toBeGreaterThan(-1);
    expect(stripeAt).toBeGreaterThan(-1);
    expect(gateAt).toBeLessThan(stripeAt);
  });

  it('returns the guard status rather than falling through', () => {
    expect(source).toMatch(/if \(unpriceableLine\)[\s\S]{0,600}return res\.status\(/);
  });

  it('still calls the availability gate', () => {
    expect(source).toContain('validateCheckoutStockAvailability');
  });
});

/**
 * Kimi K3 M4 — a crash-window cart has `checkoutSessionId: null` by definition,
 * so verify-session's lookup missed it and a customer who HAD PAID was shown
 * "Order not found". `/cancel-checkout` was no help either: it needs the
 * session id the cart does not hold. Their only recovery was the webhook, and
 * a lost event or a disabled endpoint left them with no path at all.
 */
describe('verify-session can recover a crash-window cart', () => {
  const source = executableSource('../../routes/v2PaymentRoutes.mjs');

  it('falls back to the cart named in the session metadata', () => {
    expect(source).toContain("Number.parseInt(session?.metadata?.cartId, 10)");
  });

  it('scopes the fallback to the authenticated user', () => {
    expect(source).toMatch(/id: metadataCartId,\s*userId,/);
  });

  it('only adopts a cart that is genuinely unclaimed', () => {
    // A cart already holding a checkoutSessionId belongs to another session;
    // recovering it here would be the cross-cart grant the guard exists to stop.
    expect(source).toMatch(/id: metadataCartId,[\s\S]{0,80}checkoutSessionId: null/);
  });

  it('rejects a non-safe-integer cart id from metadata', () => {
    expect(source).toContain('Number.isSafeInteger(metadataCartId)');
  });

  it('passes the charged amount so the adoption guard can actually decide', () => {
    // Without it the guard sees an unknown amount and — correctly — fails
    // closed, so an honest recovery would be refused for want of the one
    // figure this caller has had in hand the whole time.
    expect(source).toMatch(/grantSessionsForCart\([\s\S]{0,240}amountTotalCents: session\.amount_total/);
  });

  it('still 404s when nothing can be recovered', () => {
    expect(source).toMatch(/if \(!recoveredCart\) \{[\s\S]{0,300}ORDER_NOT_FOUND/);
  });

  it('leaves no stale reference to the pre-recovery cart in the grant call', () => {
    expect(source).toContain('grantSessionsForCart(recoveredCart.id, userId');
  });
});
