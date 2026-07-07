import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Slice 3e — Stripe Tax on the print checkout (source contract).
 * Tax is flag-gated OFF: enabling automatic_tax before Stripe Tax is active in the
 * dashboard errors checkout, so it must be inert until PRINT_STRIPE_TAX_ENABLED=true.
 */
const gallery = readFileSync(resolve(process.cwd(), 'routes/galleryRoutes.mjs'), 'utf8');

describe('gallery print checkout: Stripe Tax (flag-gated)', () => {
  const start = gallery.indexOf("router.post('/print-order'");
  const end = gallery.indexOf("router.get('/print-orders'", start);
  const block = start >= 0 && end > start ? gallery.slice(start, end) : '';

  it('reads a default-OFF flag', () => {
    expect(block).toContain("const printStripeTaxEnabled = process.env.PRINT_STRIPE_TAX_ENABLED === 'true';");
  });

  it('enables automatic_tax + tax_behavior + tax_code ONLY when the flag is on', () => {
    expect(block).toContain("...(printStripeTaxEnabled ? { automatic_tax: { enabled: true } } : {})");
    expect(block).toContain("...(printStripeTaxEnabled ? { tax_behavior: 'exclusive' } : {})");
    expect(block).toContain("...(printStripeTaxEnabled ? { tax_code: 'txcd_99999999' } : {})");
  });

  it('does not add a hardcoded tax rate (uses Stripe Tax, not the v2PaymentRoutes 8% gotcha)', () => {
    expect(block).not.toMatch(/tax[_A-Za-z]*\s*[:=]\s*0?\.08/);
    expect(block).not.toContain('0.08');
  });
});
