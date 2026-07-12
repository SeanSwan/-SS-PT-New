import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'migrations/20260711000001-make-order-item-catalog-reference-tombstone-safe.cjs',
), 'utf8');
const model = readFileSync(resolve(process.cwd(), 'models/OrderItem.mjs'), 'utf8');

describe('tombstone-safe paid order items', () => {
  it('makes the storefront FK nullable and SET NULL while preserving model parity', () => {
    expect(migration).toMatch(/jsonb_set/);
    expect(migration).toMatch(/originalStorefrontItemId/);
    expect(migration).toMatch(/originalProductVariantId/);
    expect(migration.indexOf('originalStorefrontItemId')).toBeLessThan(migration.indexOf('DROP CONSTRAINT'));
    expect(migration).toMatch(/ALTER COLUMN "storefrontItemId" DROP NOT NULL/);
    expect(migration).toMatch(/ON UPDATE CASCADE ON DELETE SET NULL/);
    expect(model).toMatch(/storefrontItemId:\s*\{[\s\S]*allowNull:\s*true/);
  });
});
