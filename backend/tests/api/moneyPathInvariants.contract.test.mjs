import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Money-path safety — server-authoritative pricing, variant safety, tax scoping.
 * ============================================================================
 * The customer purchase path (store → cart → Stripe) must hold these invariants
 * so a buyer can never be mischarged and a tax-free service is never taxed:
 *  1. Cart price is resolved SERVER-SIDE from the DB item/variant (never trusted
 *     from the client), the variant must belong to the item, a physical product
 *     requires a variant, and stock is checked at add-time AND checkout-time.
 *  2. Sales tax applies ONLY to taxable PHYSICAL products — never to training
 *     packages (CA service exemption), and Stripe Tax owns district tax math.
 * Assertions use tolerant regex so routine reformatting doesn't break them; a
 * real weakening of the invariant does. Patterns verified against the live code
 * 2026-06-13. Companion behavioral test: sessionGrantSeparation.contract.test.mjs.
 */
const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const cart = read('routes/cartRoutes.mjs');
const pay = read('routes/v2PaymentRoutes.mjs');
const checkoutStock = read('services/checkoutStockAvailabilityService.mjs');

describe('money-path: cart price authority + variant safety', () => {
  it('resolves the line price server-side from the variant/item (not the client body)', () => {
    // 2026-08-16: this asserted the local `firstMoney(variant?.price, ...)` helper.
    // That helper returned 0 when nothing resolved, and the ACH/offline rails had
    // their own divergent copy that sold totalCost-only packages for $0. All three
    // rails now share services/store/itemPricing.mjs resolveUnitPrice, which THROWS
    // instead of returning 0. Same invariant — server-side price authority, never
    // the request body — asserted against the shared implementation.
    expect(cart).toMatch(/resolveUnitPrice\(\s*storeFrontItem\s*,\s*variant\s*\)/);
    expect(cart).toMatch(/from\s*['"][^'"]*itemPricing\.mjs['"]/);
    // the charged price must not be taken straight from the request body
    expect(cart).not.toMatch(/price:\s*req\.body\.price/);
  });

  it('rejects a variant that does not belong to the product (anti cross-product)', () => {
    expect(cart).toMatch(/variant\.storefrontItemId\s*!==\s*storefrontItemId/);
  });

  it('requires a variant for physical products', () => {
    expect(cart).toMatch(/choose a product variant/i);
  });

  it('enforces stock at add-time (no overselling)', () => {
    expect(cart).toMatch(/quantity\s*>\s*availableStock/);
    expect(cart).toMatch(/exceeds available stock/i);
  });

  it('re-checks physical-product stock at checkout-time (no stale-cart overselling)', () => {
    expect(pay).toMatch(/validateCheckoutStockAvailability\(cart\.cartItems\)/);
    expect(pay).toMatch(/stockValidationError\.code/);
    expect(checkoutStock).toMatch(/CHECKOUT_STOCK_UNAVAILABLE_CODE/);
  });

  it('blocks an inactive variant', () => {
    expect(cart).toMatch(/variant\.isActive\s*===\s*false/);
  });
});

describe('money-path: taxable physical products use Stripe Tax', () => {
  it('a taxable line must be BOTH a physical product AND flagged taxable', () => {
    expect(pay).toMatch(/isTaxablePhysicalProductLine/);
    expect(pay).toMatch(/isTaxable\s*===\s*true/);
  });

  it('the physical-product predicate keys off itemKind/variant (training packages are excluded)', () => {
    expect(pay).toMatch(/itemKind\s*===\s*'physical_product'/);
  });

  it('does not ship a hardcoded flat tax rate or manual tax line item', () => {
    expect(pay).not.toMatch(/PRODUCT_TAX_RATE\s*=\s*0?\.08/);
    expect(pay).not.toContain('Product sales tax');
  });

  it('fails taxable physical checkout closed unless Stripe Tax is explicitly enabled', () => {
    expect(pay).toContain('STRIPE_TAX_NOT_CONFIGURED_CODE');
    expect(pay).toContain("process.env.SWAN_STRIPE_TAX_ENABLED === 'true'");
    expect(pay).toMatch(/automatic_tax:\s*\{\s*enabled:\s*usesStripeTax\s*\}/);
  });
});
