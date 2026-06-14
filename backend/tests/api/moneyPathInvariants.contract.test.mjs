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
 *     requires a variant, and stock is checked at add-time.
 *  2. Sales tax applies ONLY to taxable PHYSICAL products — never to training
 *     packages (CA service exemption).
 * Assertions use tolerant regex so routine reformatting doesn't break them; a
 * real weakening of the invariant does. Patterns verified against the live code
 * 2026-06-13. Companion behavioral test: sessionGrantSeparation.contract.test.mjs.
 */
const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const cart = read('routes/cartRoutes.mjs');
const pay = read('routes/v2PaymentRoutes.mjs');

describe('money-path: cart price authority + variant safety', () => {
  it('resolves the line price server-side from the variant/item (not the client body)', () => {
    expect(cart).toMatch(/price:\s*firstMoney\(\s*variant\?\.price/);
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

  it('blocks an inactive variant', () => {
    expect(cart).toMatch(/variant\.isActive\s*===\s*false/);
  });
});

describe('money-path: tax applies only to taxable physical products', () => {
  it('a taxable line must be BOTH a physical product AND flagged taxable', () => {
    expect(pay).toMatch(/isTaxablePhysicalProductLine/);
    expect(pay).toMatch(/isTaxable\s*===\s*true/);
  });

  it('the physical-product predicate keys off itemKind/variant (training packages are excluded)', () => {
    expect(pay).toMatch(/itemKind\s*===\s*'physical_product'/);
  });

  it('a hardcoded flat product tax rate exists (known limitation: replace with Stripe Tax)', () => {
    // Documents the current gap so the eventual Stripe Tax switch is a deliberate,
    // test-visible change rather than a silent one. CA is 7.25–10.25% by district.
    expect(pay).toMatch(/PRODUCT_TAX_RATE\s*=\s*0?\.08/);
  });
});
