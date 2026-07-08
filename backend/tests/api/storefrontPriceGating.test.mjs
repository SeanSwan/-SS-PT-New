/**
 * Launch Charter P1-1 — storefront price gating (charter §5).
 * Unit tests for the pure visibility helpers + source-contract locks proving
 * every price-bearing endpoint enforces the `store-prices` grant server-side.
 * Verified leak (2026-07-06): unauthenticated GET /api/storefront returned
 * full prices on live production.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(__dirname, rel), 'utf8');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-price-gating-0123456789abcdef';

let svc;
beforeAll(async () => {
  svc = await import('../../services/store/priceVisibilityService.mjs');
});

describe('priceVisibilityService — pure helpers', () => {
  it('stripItemPrices nulls every price field including variant prices, preserves the rest', () => {
    const mapped = {
      id: 7, name: 'Single Session', totalCost: 175, displayPrice: 175,
      pricePerSession: 175, price: 175, priceDetails: 'x', sessions: 1,
      itemKind: 'training_package',
      variants: [{ id: 1, label: 'A', price: 99, stockQuantity: 3 }],
    };
    const s = svc.stripItemPrices(mapped);
    expect(s.totalCost).toBeNull();
    expect(s.displayPrice).toBeNull();
    expect(s.pricePerSession).toBeNull();
    expect(s.price).toBeNull();
    expect(s.priceDetails).toBeNull();
    expect(s.variants[0].price).toBeNull();
    expect(s.variants[0].stockQuantity).toBe(3);
    expect(s.name).toBe('Single Session');
    expect(s.sessions).toBe(1);
    expect(mapped.price).toBe(175); // input not mutated
  });

  it('decodeSoftAuthUserId: anonymous on missing/garbage/wrong-type tokens, id on valid access token', () => {
    expect(svc.decodeSoftAuthUserId({ headers: {} })).toBeNull();
    expect(svc.decodeSoftAuthUserId({ headers: { authorization: 'Bearer not-a-jwt' } })).toBeNull();
    const refresh = jwt.sign({ id: 5, tokenType: 'refresh' }, process.env.JWT_SECRET);
    expect(svc.decodeSoftAuthUserId({ headers: { authorization: `Bearer ${refresh}` } })).toBeNull();
    const forged = jwt.sign({ id: 5, tokenType: 'access' }, 'wrong-secret');
    expect(svc.decodeSoftAuthUserId({ headers: { authorization: `Bearer ${forged}` } })).toBeNull();
    const good = jwt.sign({ id: 42, tokenType: 'access' }, process.env.JWT_SECRET);
    expect(svc.decodeSoftAuthUserId({ headers: { authorization: `Bearer ${good}` } })).toBe(42);
  });

  it('isPriceAccessGranted: admin short-circuits true; missing user false', async () => {
    expect(await svc.isPriceAccessGranted({ id: 1, role: 'admin' })).toBe(true);
    expect(await svc.isPriceAccessGranted(null)).toBe(false);
    expect(await svc.isPriceAccessGranted({})).toBe(false);
  });

  it('exports the canonical feature key', () => {
    expect(svc.PRICE_ACCESS_FEATURE_KEY).toBe('store-prices');
  });

  it('isPriceGatedItem gates training packages only (physical products stay public)', () => {
    expect(svc.isPriceGatedItem({ itemKind: 'training_package' })).toBe(true);
    expect(svc.isPriceGatedItem({ itemKind: 'physical_product' })).toBe(false);
    expect(svc.isPriceGatedItem({ itemKind: 'supplement' })).toBe(false);
    expect(svc.isPriceGatedItem({})).toBe(false);
    expect(svc.isPriceGatedItem(null)).toBe(false);
  });
});

describe('price gating — source contracts (server-side enforcement wired)', () => {
  const storefront = read('../../routes/storeFrontRoutes.mjs');
  const cart = read('../../routes/cartRoutes.mjs');
  const sessionPkg = read('../../routes/sessionPackageRoutes.mjs');
  const v2 = read('../../routes/v2PaymentRoutes.mjs');
  const flagController = read('../../controllers/featureFlagController.mjs');

  it('storeFrontRoutes strips prices via resolvePriceVisibility on list, detail, and calculator', () => {
    expect(storefront).toContain("from '../services/store/priceVisibilityService.mjs'");
    expect(storefront).toMatch(/resolvePriceVisibility\(req\)/);
    expect(storefront).toMatch(/stripItemPrices/);
    // response advertises the server truth signal
    expect(storefront).toMatch(/pricesVisible/);
    // calculator hard-gates instead of leaking price math
    expect(storefront).toMatch(/PRICE_ACCESS_REQUIRED/);
  });

  it('cart add refuses non-granted users (grant is the purchase gate)', () => {
    expect(cart).toContain("isPriceAccessGranted");
    expect(cart).toMatch(/PRICE_ACCESS_REQUIRED/);
  });

  it('session-packages list strips prices and purchase refuses non-granted users', () => {
    expect(sessionPkg).toContain("from '../services/store/priceVisibilityService.mjs'");
    expect(sessionPkg).toMatch(/resolvePriceVisibility|isPriceAccessGranted/);
    expect(sessionPkg).toMatch(/PRICE_ACCESS_REQUIRED/);
  });

  it('v2 checkout re-verifies the grant (defense in depth)', () => {
    expect(v2).toContain('isPriceAccessGranted');
    expect(v2).toMatch(/PRICE_ACCESS_REQUIRED/);
  });

  it('ALL alternate purchase rails enforce the grant (Rule 20 sibling sweep)', () => {
    const offline = read('../../routes/offlinePaymentRoutes.mjs');
    const ach = read('../../routes/achPaymentRoutes.mjs');
    for (const src of [offline, ach]) {
      expect(src).toContain('isPriceAccessGranted');
      expect(src).toMatch(/PRICE_ACCESS_REQUIRED/);
    }
  });

  it('feature-flag registry knows store-prices (admin map)', () => {
    expect(flagController).toContain("'store-prices'");
  });

  it('public health/store readiness endpoint never selects or serializes prices (AD-2 leak fix)', () => {
    // healthRoutes is mounted UNAUTHENTICATED at /health and /api/health —
    // any price field it returns bypasses the entire storefront gate.
    const health = read('../../routes/healthRoutes.mjs');
    expect(health).not.toContain("'price'");
    expect(health).not.toContain("'totalCost'");
    expect(health).not.toMatch(/price:\s*pkg\./);
  });
});
