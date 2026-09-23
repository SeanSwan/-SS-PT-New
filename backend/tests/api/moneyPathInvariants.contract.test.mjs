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

/**
 * U-08 first slice — webhook + fulfilment contract.
 * Pins the shapes and orderings that the review's E-01/E-04 work depends on,
 * so the classes they came from cannot silently regress.
 */
describe('money-path: webhook contract', () => {
  it('verifies the Stripe signature before handling anything', () => {
    const verifyIdx = cart.indexOf('stripeClient.webhooks.constructEvent');
    const switchIdx = cart.indexOf('switch (event.type)');
    expect(verifyIdx).toBeGreaterThan(-1);
    expect(switchIdx).toBeGreaterThan(verifyIdx);
    expect(cart).toContain("process.env.STRIPE_WEBHOOK_SECRET");
  });

  it('refuses unsigned webhooks with 400 and processing failures with 5xx (Stripe retries)', () => {
    expect(cart).toMatch(/res\.status\(400\)\.send\('Webhook Error: Missing signature or configuration'\)/);
    expect(cart).toMatch(/res\.status\(500\)\.send\('Webhook processing error'\)/);
  });

  it('grants sessions only for a PAID completed session', () => {
    expect(cart).toMatch(/session\.payment_status === 'paid'/);
    const paidIdx = cart.indexOf("session.payment_status === 'paid'");
    const grantIdx = cart.indexOf('grantSessionsForCart(');
    expect(paidIdx).toBeGreaterThan(-1);
    expect(grantIdx).toBeGreaterThan(paidIdx);
  });

  it('handles charge.refunded through the reconciliation service (E-04)', () => {
    expect(cart).toContain("case 'charge.refunded'");
    expect(cart).toContain('reconcileRefundedCharge(charge)');
    expect(cart).toContain("from '../services/refundReconciliationService.mjs'");
  });
});

describe('money-path: identity comparisons survive type coercion', () => {
  it('verify-session normalizes BOTH sides before comparing ids (E-01 regression)', () => {
    // req.user.id is always a string (protect -> toStringId); the Stripe
    // client_reference_id is an integer. A strict Number !== String comparison
    // 404s every session-package buyer.
    expect(pay).toMatch(/String\(packageUserId\)\s*!==\s*String\(userId\)/);
    expect(pay).not.toMatch(/Number\(session\.client_reference_id\)\s*!==\s*userId/);
  });

  it('the refund reconciler compares currency/amount in cents consistently', () => {
    const svc = read('services/refundReconciliationService.mjs');
    expect(svc).toMatch(/amountRefunded\s*>=\s*Number\(charge\.amount/);
    expect(svc).toMatch(/Math\.round\(n\)\s*\/\s*100/);
  });
});
