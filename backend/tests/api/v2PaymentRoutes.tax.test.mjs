import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const paymentRoutes = readSource('routes/v2PaymentRoutes.mjs');

describe('v2 payment Stripe Tax guard', () => {
  it('does not hardcode or manually line-item taxable physical-product sales tax', () => {
    expect(paymentRoutes).not.toContain('PRODUCT_TAX_RATE');
    expect(paymentRoutes).not.toContain('Product sales tax');
    expect(paymentRoutes).not.toContain("enabled: false // We're handling tax manually");
  });

  it('fails physical taxable checkout closed until Stripe Tax is explicitly enabled', () => {
    expect(paymentRoutes).toContain('STRIPE_TAX_NOT_CONFIGURED_CODE');
    expect(paymentRoutes).toContain("process.env.SWAN_STRIPE_TAX_ENABLED === 'true'");
    expect(paymentRoutes).toMatch(/if\s*\(requiresStripeTax\s+&&\s+!isStripeTaxEnabled\(\)\)/);
  });

  it('uses Stripe automatic tax only for carts that include taxable physical products', () => {
    expect(paymentRoutes).toContain('const usesStripeTax = requiresStripeTax;');
    expect(paymentRoutes).toMatch(/automatic_tax:\s*\{\s*enabled:\s*usesStripeTax\s*\}/);
    expect(paymentRoutes).toContain('tax_behavior: isTaxablePhysicalProductLine(item)');
    expect(paymentRoutes).toContain("? 'exclusive' : 'unspecified'");
  });
});
