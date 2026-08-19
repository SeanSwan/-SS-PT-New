/**
 * Regression: every rail must resolve a unit price the SAME way, and must refuse
 * to sell an item it cannot price.
 *
 * Found 2026-08-16 independently by BOTH Kimi K3 (HIGH-2) and GLM-5.3 (§4.7) in a
 * full-family review — a residual the earlier ACH hardening missed.
 *
 * The cart rail prices defensively:
 *     price: firstMoney(variant?.price, storeFrontItem.totalCost, storeFrontItem.price)
 * `firstMoney` returns the first value > 0 — proof the codebase knows catalog rows
 * exist where `price` is null/0 while `totalCost` carries the real money.
 *
 * The ACH and offline rails priced off `price` ALONE:
 *     new Decimal(i.price || 0)
 * `new Decimal(0)` is a truthy object, so `if (!unitPrice) return 400` does NOT fire.
 * A totalCost-only package therefore contributed $0, minted a real PaymentIntent, and
 * on payment success granted its sessions. Free sessions, no admin in the loop.
 *
 * StorefrontItem.price is `allowNull: true`, and the model hook only backfills it when
 * price is null/undefined — so `price: 0, totalCost: 8400` persists unchanged.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import {
  resolveUnitPrice,
  UnpriceableItemError,
} from '../../services/store/itemPricing.mjs';

const pkg = (over = {}) => ({ id: 7, name: 'Gold Swan Elite', ...over });

describe('resolveUnitPrice — one price resolution for every rail', () => {
  it('prefers an explicit variant price', () => {
    const price = resolveUnitPrice(pkg({ price: 100, totalCost: 200 }), { price: 55 });
    expect(price.toNumber()).toBe(55);
  });

  it('falls back to totalCost when price is null (the ACH $0 hole)', () => {
    const price = resolveUnitPrice(pkg({ price: null, totalCost: 8400 }));
    expect(price.toNumber()).toBe(8400);
  });

  it('falls back to totalCost when price is 0 (hook does NOT backfill a 0)', () => {
    const price = resolveUnitPrice(pkg({ price: 0, totalCost: 8400 }));
    expect(price.toNumber()).toBe(8400);
  });

  it('uses price when totalCost is absent', () => {
    expect(resolveUnitPrice(pkg({ price: 175, totalCost: null })).toNumber()).toBe(175);
  });

  it('handles DECIMAL columns arriving as strings', () => {
    expect(resolveUnitPrice(pkg({ price: '175.50', totalCost: null })).toNumber()).toBe(175.5);
  });

  // The whole point: refuse rather than sell for nothing.
  it.each([
    ['both null', { price: null, totalCost: null }],
    ['both zero', { price: 0, totalCost: 0 }],
    ['undefined', {}],
    ['negative', { price: -5, totalCost: -5 }],
    ['non-numeric', { price: 'free', totalCost: null }],
    ['NaN', { price: NaN, totalCost: null }],
  ])('throws UnpriceableItemError rather than pricing a %s item at zero', (_l, over) => {
    expect(() => resolveUnitPrice(pkg(over))).toThrow(UnpriceableItemError);
  });

  it('ignores a zero/absent variant price and falls through to the item', () => {
    expect(resolveUnitPrice(pkg({ price: 175 }), { price: 0 }).toNumber()).toBe(175);
    expect(resolveUnitPrice(pkg({ price: 175 }), null).toNumber()).toBe(175);
  });

  it('returns a Decimal, not a float (money must not round-trip through binary)', () => {
    expect(resolveUnitPrice(pkg({ price: '0.10' }))).toBeInstanceOf(Decimal);
    // 0.1 + 0.2 !== 0.3 in float; Decimal must hold exactly.
    const total = resolveUnitPrice(pkg({ price: '0.10' }))
      .plus(resolveUnitPrice(pkg({ price: '0.20' })));
    expect(total.equals(new Decimal('0.30'))).toBe(true);
  });
});

describe('every rail routes through the shared resolver', () => {
  const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

  // Strip comments FIRST. These files deliberately document the removed pattern,
  // and a raw match hits the prose describing the bug rather than the bug. That
  // false failure has now happened twice in this codebase — once on the role
  // escalation guard, once here. Comment-stripping is the default for any
  // source-shape assertion, not an afterthought.
  const codeOf = (p) => read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it.each([
    'routes/achPaymentRoutes.mjs',
    'routes/offlinePaymentRoutes.mjs',
    'routes/cartRoutes.mjs',
  ])('%s imports resolveUnitPrice and carries no local price fallback', (path) => {
    const source = read(path);
    const code = codeOf(path);

    expect(source, `${path} must import the shared resolver`)
      .toMatch(/import\s*\{[^}]*resolveUnitPrice[^}]*\}\s*from\s*['"][^'"]*itemPricing\.mjs['"]/);

    // The exact shapes that priced a totalCost-only item at $0.
    expect(code, `${path} still has a local price fallback`)
      .not.toMatch(/new Decimal\(\s*\w+\.price\s*\|\|\s*0\s*\)/);
    expect(code, `${path} still declares a local firstMoney`)
      .not.toMatch(/const firstMoney\s*=/);
  });

  // The offline rail projects an explicit attribute list; omitting totalCost
  // would silently degrade the shared resolver back to price-only.
  it('offline rail projects totalCost so the resolver can see it', () => {
    const code = codeOf('routes/offlinePaymentRoutes.mjs');
    const projection = code.slice(
      code.indexOf('StorefrontItem.findAll'),
      code.indexOf('dbItemMap')
    );
    expect(projection).toContain("'totalCost'");
  });
});
