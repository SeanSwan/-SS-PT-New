import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Storefront currency precision contract (2026-06-13).
 * ============================================================================
 * Money must be stored as exact DECIMAL, not FLOAT. The StorefrontItem model
 * declares price/pricePerSession/totalCost as DECIMAL(10,2), but the original
 * create-storefront-items migration created them as Sequelize.FLOAT. Transaction
 * records (Order/OrderItem/FinancialTransaction/BusinessMetrics) are already
 * DECIMAL; this locks the catalog layer to the same exact-cents standard and
 * ensures a migration brings the DB column types into line + adds displayOrder.
 */
const root = process.cwd();
const model = readFileSync(resolve(root, 'models/StorefrontItem.mjs'), 'utf8');

describe('storefront currency precision contract', () => {
  it('declares catalog currency columns as DECIMAL(10,2) in the model', () => {
    const decimalCount = (model.match(/DECIMAL\(10,\s*2\)/g) || []).length;
    expect(decimalCount).toBeGreaterThanOrEqual(3); // price, pricePerSession, totalCost
    expect(model).toContain('displayOrder');
  });

  it('has a migration aligning storefront_items currency to DECIMAL + ensuring displayOrder', () => {
    const dir = resolve(root, 'migrations');
    const aligned = readdirSync(dir)
      .filter((file) => /\.cjs$/.test(file))
      .map((file) => readFileSync(resolve(dir, file), 'utf8'))
      .some((src) =>
        src.includes('storefront_items')
        && /TYPE DECIMAL\(10,2\)/.test(src)
        && src.includes('pricePerSession')
        && src.includes('displayOrder'));
    expect(aligned).toBe(true);
  });
});
