import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Storefront commerce fields contract — Phase 0 (2026-06-13).
 * ============================================================================
 * Catalog foundation so physical products (supplements/merch) can live beside
 * training packages. Locks: the model declares the commerce fields, defaults
 * keep existing packages as non-taxable services, and a migration adds the
 * columns. See docs/ai-workflow/brainstorms/storefront-commerce-expansion-2026-06-13.md
 */
const root = process.cwd();
const model = readFileSync(resolve(root, 'models/StorefrontItem.mjs'), 'utf8');
const FIELDS = ['itemKind', 'isTaxable', 'fulfillmentType', 'stockQuantity', 'sku', 'shippingWeightOz'];

describe('storefront commerce fields contract (Phase 0)', () => {
  it('model declares every commerce field', () => {
    for (const field of FIELDS) expect(model).toContain(`${field}:`);
  });

  it('defaults keep existing training packages as non-taxable services', () => {
    expect(model).toContain("defaultValue: 'training_package'");
    expect(model).toMatch(/isTaxable[\s\S]*?defaultValue: false/);
    expect(model).toContain("defaultValue: 'none'");
  });

  it('a migration adds all commerce fields to storefront_items', () => {
    const dir = resolve(root, 'migrations');
    const added = readdirSync(dir)
      .filter((file) => /\.cjs$/.test(file))
      .map((file) => readFileSync(resolve(dir, file), 'utf8'))
      .some((src) => src.includes('storefront_items') && FIELDS.every((field) => src.includes(`'${field}'`)));
    expect(added).toBe(true);
  });
});
