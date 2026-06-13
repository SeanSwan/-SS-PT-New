import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Admin storefront API — physical-product support (AS-2 / AS-3, 2026-06-13).
 * ============================================================================
 * The admin store screen manages packages AND physical products (drink /
 * supplements / merch). Two backend contracts must hold:
 *  1. The admin list mapper exposes the commerce fields (so the UI can render
 *     product type / tax / fulfillment / stock), and
 *  2. Create is product-aware: a product legitimately has pricePerSession = 0,
 *     so the old `if (!pricePerSession)` guard must NOT reject products.
 * See docs/ai-workflow/brainstorms/storefront-commerce-expansion-2026-06-13.md
 */
const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const ROUTES = read('routes/adminPackageRoutes.mjs');

describe('admin storefront API — physical-product support', () => {
  it('the admin list mapper exposes the commerce fields', () => {
    for (const field of [
      'itemKind: item.itemKind',
      'isTaxable: item.isTaxable',
      'fulfillmentType: item.fulfillmentType',
      'stockQuantity: item.stockQuantity',
      'sku: item.sku',
    ]) {
      expect(ROUTES).toContain(field);
    }
  });

  it('create is product-aware (a product with pricePerSession 0 is not rejected)', () => {
    expect(ROUTES).toContain("const isProduct = itemKind === 'physical_product'");
    // products are validated on `price`, packages on `pricePerSession`
    expect(ROUTES).toContain('missingPackagePrice');
    expect(ROUTES).toContain('missingProductPrice');
    // the old blanket truthiness guard is gone
    expect(ROUTES).not.toContain('if (!name || !packageType || !pricePerSession)');
  });
});
