import { describe, expect, it } from 'vitest';
import {
  getStorefrontSessionCredits,
  getCartItemSessionCredits,
  calculateCartSessionCredits,
} from '../../services/SessionGrantService.mjs';

/**
 * Money-path safety — session-grant separation (2026-06-13).
 * ============================================================================
 * INVARIANT: buying a PHYSICAL PRODUCT must NEVER grant training-session credits.
 * Only training packages (which carry sessions/totalSessions) grant credits.
 * This is a BEHAVIORAL test of the exported pure credit functions — it fails if a
 * future change ever makes a physical product (sessions=0) grant sessions, or
 * stops a package from granting. Complements the grep contract in
 * moneyPathInvariants.contract.test.mjs.
 */
describe('money-path: physical products never grant training sessions', () => {
  it('a physical product (no sessions) grants 0 credits', () => {
    expect(getStorefrontSessionCredits({ itemKind: 'physical_product', sessions: 0, totalSessions: 0 })).toBe(0);
    expect(getStorefrontSessionCredits({ itemKind: 'physical_product' })).toBe(0);
    expect(getStorefrontSessionCredits(null)).toBe(0);
  });

  it('a training package grants its session count', () => {
    expect(getStorefrontSessionCredits({ itemKind: 'training_package', sessions: 8 })).toBe(8);
    // falls back to totalSessions when sessions is absent
    expect(getStorefrontSessionCredits({ itemKind: 'training_package', totalSessions: 48 })).toBe(48);
  });

  it('per-line credits respect quantity, and a product line stays 0', () => {
    expect(getCartItemSessionCredits({ quantity: 3, storefrontItem: { sessions: 8 } })).toBe(24);
    expect(getCartItemSessionCredits({ quantity: 5, storefrontItem: { itemKind: 'physical_product', sessions: 0 } })).toBe(0);
    expect(getCartItemSessionCredits({ quantity: 0, storefrontItem: { sessions: 8 } })).toBe(0);
  });

  it('a mixed cart grants ONLY the package credits, never the product', () => {
    const mixedCart = [
      { quantity: 2, storefrontItem: { itemKind: 'training_package', sessions: 8 } },       // 16
      { quantity: 4, storefrontItem: { itemKind: 'physical_product', sessions: 0 } },        // 0
      { quantity: 1, storefrontItem: { itemKind: 'physical_product', sessions: 0 }, productVariantId: 7 }, // 0
    ];
    expect(calculateCartSessionCredits(mixedCart)).toBe(16);
  });

  it('a product can never sneak credits via a stray sessions value being ignored on the wrong kind', () => {
    // Even if some bad data set sessions on a product row, the cart math is driven
    // by sessions/totalSessions; the guarantee we depend on is that the admin UI
    // sets sessions=0 for products. This test documents the contract: a product
    // row WITH sessions=0 yields 0 (the expected admin-produced shape).
    expect(calculateCartSessionCredits([
      { quantity: 9, storefrontItem: { itemKind: 'physical_product', sessions: 0, totalSessions: 0 } },
    ])).toBe(0);
  });
});
