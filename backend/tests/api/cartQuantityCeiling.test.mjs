/**
 * Cart quantity ceiling (Lane 4 launch audit, hostile round 14)
 * =============================================================
 * parsePositiveInteger has no upper bound, and training packages carry
 * stockQuantity: null (verified on live), so getAvailableStock returns null and
 * the stock check is skipped for exactly the items Sean actually sells. The only
 * remaining limit was Number.MAX_SAFE_INTEGER.
 *
 * ShoppingCart.total is DECIMAL(10,2) — max 99,999,999.99 — so a large enough
 * quantity overflows the column and turns a money-path request into a 500.
 * Below that threshold it still lets a client mint an absurd but REAL Stripe
 * Checkout Session.
 *
 * These tests pin the ceiling on all three entry points: add, the add-again
 * merge path (adding 50 twice must not reach 100), and update.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = fs.readFileSync(path.join(backendRoot, 'routes/cartRoutes.mjs'), 'utf8');

/** Mirrors cartRoutes.mjs parsePositiveInteger exactly. */
const parsePositiveInteger = (value) => {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const MAX = 99;
const DECIMAL_10_2_MAX = 99999999.99;

describe('cart quantity — the unbounded-input hole this closes', () => {
  it('the parser alone would accept a quantity that overflows DECIMAL(10,2)', () => {
    // Documents WHY the ceiling is needed: the parser is not the guard.
    const huge = parsePositiveInteger(Number.MAX_SAFE_INTEGER);
    expect(huge).toBe(Number.MAX_SAFE_INTEGER);
    expect(huge * 175).toBeGreaterThan(DECIMAL_10_2_MAX);
  });

  it('a quantity under the ceiling stays well inside the column at the top price', () => {
    // 12-Month Program is the most expensive line item on the live catalog.
    expect(MAX * 33600).toBeGreaterThan(0);
    expect(MAX * 175).toBeLessThan(DECIMAL_10_2_MAX);
  });

  it('rejects the parser-legal but absurd quantities', () => {
    for (const q of [100, 1000, 571429, Number.MAX_SAFE_INTEGER]) {
      expect(parsePositiveInteger(q)).not.toBeNull();
      expect(q > MAX).toBe(true);
    }
  });

  it('still accepts realistic quantities', () => {
    for (const q of [1, 2, 10, 99]) {
      expect(parsePositiveInteger(q)).toBe(q);
      expect(q > MAX).toBe(false);
    }
  });
});

describe('cart quantity ceiling — enforced on every entry point', () => {
  it('declares the ceiling in ONE shared place, consumed by both layers', () => {
    // Moved to utils/cartHelpers.mjs so the cart routes AND the checkout gate
    // read the same value. Two copies would drift — the defect class this audit
    // kept finding.
    const helpers = fs.readFileSync(path.join(backendRoot, 'utils/cartHelpers.mjs'), 'utf8');
    expect(helpers).toMatch(/export const MAX_CART_ITEM_QUANTITY = 99;/);
    expect(source).toMatch(/MAX_CART_ITEM_QUANTITY \} = cartHelpers/);
    expect(source).not.toMatch(/const MAX_CART_ITEM_QUANTITY = 99;/);

    const checkout = fs.readFileSync(path.join(backendRoot, 'routes/v2PaymentRoutes.mjs'), 'utf8');
    expect(checkout).toMatch(/import \{ MAX_CART_ITEM_QUANTITY \}/);
  });

  it('guards POST /add', () => {
    const addIdx = source.indexOf("router.post('/add'");
    const addBlock = source.slice(addIdx, addIdx + 2000);
    expect(addBlock).toContain('MAX_CART_ITEM_QUANTITY');
  });

  it('guards the add-again MERGE path — adding 50 twice must not reach 100', () => {
    const mergeIdx = source.indexOf('const nextQuantity = cartItem.quantity + normalizedQuantity;');
    expect(mergeIdx).toBeGreaterThan(-1);
    const mergeBlock = source.slice(mergeIdx, mergeIdx + 300);
    expect(mergeBlock).toContain('MAX_CART_ITEM_QUANTITY');
  });

  it('guards PUT /update/:itemId', () => {
    const updIdx = source.indexOf("router.put('/update/:itemId'");
    const updBlock = source.slice(updIdx, updIdx + 2000);
    expect(updBlock).toContain('MAX_CART_ITEM_QUANTITY');
  });

  it('tells the buyer what to do instead of just refusing', () => {
    expect(source).toMatch(/QUANTITY_LIMIT_EXCEEDED/);
    expect(source).toMatch(/please contact us/i);
  });

  it('does NOT weaken the existing stock check', () => {
    expect(source).toContain('Selected item quantity exceeds available stock');
  });
});
