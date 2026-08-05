/**
 * Displayed total vs charged total (Lane 4 launch audit, hostile round 24)
 * ========================================================================
 * The number a buyer SEES and the number Stripe CHARGES come from two entirely
 * separate implementations:
 *   - cartHelpers.calculateCartTotals  -> persists ShoppingCart.total (the cart UI)
 *   - v2PaymentRoutes.resolveCheckoutLineItem -> builds the Stripe line items
 *
 * They disagree on malformed quantities, and every disagreement overcharges:
 *   quantity 0    shown $0.00   charged $175.00   (resolver defaults to 1)
 *   quantity -1   shown -$175   charged $175.00
 *   quantity "2"  item skipped  charged $350.00
 *
 * Price mismatches are NOT a money divergence — a null/zero price costs the buyer
 * $0 on both paths — so the guard targets quantity only, and a legitimately free
 * line still checks out.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const routeSource = fs.readFileSync(path.join(backendRoot, 'routes/v2PaymentRoutes.mjs'), 'utf8');

/** Mirrors cartHelpers.calculateCartTotals — what the buyer sees. */
const displayedTotal = (price, quantity) => {
  if (typeof quantity !== 'number') return 0; // item skipped entirely
  const p = typeof price === 'string' ? parseFloat(price) : price;
  if (Number.isNaN(p) || p <= 0) return 0; // item skipped entirely
  return p * quantity;
};

/** Mirrors v2PaymentRoutes.resolveCheckoutLineItem — what Stripe charges. */
const chargedTotal = (price, quantity) => {
  const p = Number.isFinite(Number(price)) ? Number(price) : 0;
  const q = Number(quantity) > 0 ? Number(quantity) : 1;
  return p * q;
};

/** Mirrors the new guard. */
const guardRejects = (quantity) =>
  typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity <= 0;

describe('the two money paths disagree on malformed quantity', () => {
  it.each([
    ['quantity 0', '175.00', 0, 0, 175],
    ['negative quantity', '175.00', -1, -175, 175],
    ['string quantity', '175.00', '2', 0, 350],
  ])('%s: shown %s vs charged — and the charge is HIGHER', (_label, price, qty, shown, charged) => {
    expect(displayedTotal(price, qty)).toBe(shown);
    expect(chargedTotal(price, qty)).toBe(charged);
    expect(chargedTotal(price, qty)).toBeGreaterThan(displayedTotal(price, qty));
  });

  it('agrees on every healthy row, so the guard cannot reject a real cart', () => {
    for (const qty of [1, 2, 10, 99]) {
      expect(displayedTotal('175.00', qty)).toBe(chargedTotal('175.00', qty));
      expect(guardRejects(qty)).toBe(false);
    }
  });

  it('a null or zero price costs the buyer $0 on BOTH paths — not a money divergence', () => {
    for (const price of [null, '0.00', 0]) {
      expect(displayedTotal(price, 2)).toBe(0);
      expect(chargedTotal(price, 2)).toBe(0);
    }
  });
});

describe('checkout refuses rather than overcharges', () => {
  it('rejects exactly the quantities that would overcharge', () => {
    for (const qty of [0, -1, '2', 1.5, NaN, null, undefined, Number.MAX_SAFE_INTEGER + 2]) {
      expect(guardRejects(qty), `should reject ${String(qty)}`).toBe(true);
    }
  });

  it('the guard runs BEFORE the Stripe lines are built', () => {
    const guardIdx = routeSource.indexOf('CART_ITEM_QUANTITY_INVALID');
    const linesIdx = routeSource.indexOf('cart.cartItems.map(resolveCheckoutLineItem)');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(linesIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(linesIdx);
  });

  it('fails closed with a recoverable message, not a silent substitution', () => {
    expect(routeSource).toMatch(/CART_ITEM_QUANTITY_INVALID/);
    expect(routeSource).toMatch(/needs to be refreshed before checkout/i);
    expect(routeSource).toMatch(/status\(422\)/);
  });

  it('does not log the buyer cart contents while reporting the refusal', () => {
    const idx = routeSource.indexOf('Refusing checkout: cart item quantity');
    const block = routeSource.slice(idx, idx + 400);
    expect(block).toContain('quantityType');
    expect(block).not.toMatch(/price/);
  });
});


describe('checkout enforces the ceiling on PRE-EXISTING rows, not just new writes', () => {
  const MAX = 99;
  const guardRejects = (q) =>
    typeof q !== 'number' || !Number.isSafeInteger(q) || q <= 0 || q > MAX;

  it('rejects a legacy row above the cap — the cart cap alone did not cover it', () => {
    // A row can exceed the cap without passing through the cart routes: it
    // predates the cap, or an admin/repair/import path wrote it directly.
    for (const q of [100, 500, 10000]) {
      expect(guardRejects(q), `should reject legacy quantity ${q}`).toBe(true);
    }
  });

  it('still accepts every realistic quantity', () => {
    for (const q of [1, 2, 50, 99]) expect(guardRejects(q)).toBe(false);
  });

  it('reads ONE shared ceiling rather than a second copy of the number', () => {
    expect(routeSource).toMatch(/import \{ MAX_CART_ITEM_QUANTITY \} from '\.\.\/utils\/cartHelpers\.mjs'/);
    expect(routeSource).toMatch(/item\.quantity > MAX_CART_ITEM_QUANTITY/);
    // The literal 99 must not reappear here — that is how the two layers drift.
    const guardBlock = routeSource.slice(
      routeSource.indexOf('const invalidQuantityItem'),
      routeSource.indexOf('const invalidQuantityItem') + 600
    );
    expect(guardBlock).not.toMatch(/99/);
  });

  it('uses 422, not 409 — 409 already means CART_CHECKOUT_IN_PROGRESS here', () => {
    // Two meanings on one status code makes a client that retries 409s spin
    // forever on a permanent validation error.
    const idx = routeSource.indexOf('CART_ITEM_QUANTITY_INVALID');
    const block = routeSource.slice(Math.max(0, idx - 500), idx + 100);
    expect(block).toMatch(/status\(422\)/);
    expect(routeSource).toMatch(/CART_CHECKOUT_IN_PROGRESS/);
  });
});
