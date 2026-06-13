import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * StoreV3 all-inclusive pricing trust note (2026-06-13).
 * ============================================================================
 * Community + trust is the #1 brand factor. Personal training is a service and
 * is NOT sales-taxed in California, so the storefront states plainly that
 * pricing is all-inclusive ("the price you see is the price you pay") instead of
 * surprising buyers with a "+ tax" line at checkout. This locks that promise in
 * and guards against surprise-charge copy creeping back onto the storefront.
 */
const src = readFileSync(resolve(process.cwd(), 'src/pages/shop/StoreV3.tsx'), 'utf8');

describe('StoreV3 all-inclusive pricing trust note', () => {
  it('renders an all-inclusive, no-surprise-charges pricing promise', () => {
    expect(src).toContain('STORE_PRICING_NOTE');
    expect(src).toContain('All-inclusive pricing');
    expect(src).toContain('the price you see is the price you pay');
    expect(src).toContain('<PricingTrustNote>{STORE_PRICING_NOTE}</PricingTrustNote>');
  });

  it('does not surprise buyers with a plus-tax line on the storefront', () => {
    expect(src).not.toMatch(/plus tax/i);
    expect(src).not.toMatch(/\+\s*tax\b/i);
  });
});
