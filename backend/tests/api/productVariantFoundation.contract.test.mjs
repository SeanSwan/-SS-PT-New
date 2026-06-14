import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Product variant + storefront product-field foundation - Phase 1 (2026-06-13).
 * ============================================================================
 * Physical products (the recovery drink in 1.5L/16oz; merch size x color) need a
 * variant data layer + the storefront API must expose the Phase-0 product fields
 * so the UI can render product cards (vs training-package cards) and a variant
 * picker. Locks the model, migration, association wiring, and API exposure.
 * See docs/ai-workflow/brainstorms/storefront-commerce-expansion-2026-06-13.md
 */
const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const adminRoutes = read('routes/adminPackageRoutes.mjs');

describe('product variant + storefront product-field foundation (Phase 1)', () => {
  it('ProductVariant model declares the variant fields', () => {
    const model = read('models/ProductVariant.mjs');
    expect(model).toContain("tableName: 'product_variants'");
    for (const field of ['storefrontItemId', 'label', 'sku', 'price', 'stockQuantity', 'attributes', 'displayOrder', 'isActive']) {
      expect(model).toContain(`${field}:`);
    }
  });

  it('a migration creates the product_variants table', () => {
    const dir = resolve(root, 'migrations');
    const created = readdirSync(dir)
      .filter((file) => /\.cjs$/.test(file))
      .map((file) => read(`migrations/${file}`))
      .some((src) => src.includes("createTable('product_variants'"));
    expect(created).toBe(true);
  });

  it('associations wire StorefrontItem <-> ProductVariant (as variants)', () => {
    const assoc = read('models/associations.mjs');
    expect(assoc).toContain("import('./ProductVariant.mjs')");
    expect(assoc).toContain("StorefrontItem.hasMany(ProductVariant, { foreignKey: 'storefrontItemId', as: 'variants' })");
    expect(assoc).toContain('ProductVariant.belongsTo(StorefrontItem');
  });

  it('storefront API exposes the product fields the UI needs', () => {
    const routes = read('routes/storeFrontRoutes.mjs');
    expect(routes).toContain("const getStorefrontItemKind = (item) => valueOrFallback(item.itemKind, 'training_package')");
    expect(routes).toContain("'PHYSICAL_PRODUCT'");
    expect(routes).toContain('isTaxable: item.isTaxable');
    expect(routes).toContain("fulfillmentType: valueOrFallback(item.fulfillmentType, 'none')");
    expect(routes).toContain('variants: getMappedProductVariants(item)');
    expect(routes).toContain('include: variantInclude');
    expect(routes).toContain("as: 'variants'");
  });

  it('admin storefront exposes product-only variant CRUD endpoints', () => {
    expect(adminRoutes).toContain("router.get('/:id/variants'");
    expect(adminRoutes).toContain("router.post('/:id/variants'");
    expect(adminRoutes).toContain("router.put('/variants/:variantId'");
    expect(adminRoutes).toContain("router.delete('/variants/:variantId'");
    expect(adminRoutes).toContain("router.use(protect)");
    expect(adminRoutes).toContain("router.use(requireAdmin)");
    expect(adminRoutes).toContain("Variants are only available for physical products");
    expect(adminRoutes).toContain("StorefrontItem.findByPk(itemId)");
    expect(adminRoutes).not.toContain("storefrontItemId: req.body");
  });

  it('admin variant writes normalize numeric fields before persistence', () => {
    expect(adminRoutes).toContain('normalizeVariantPayload');
    expect(adminRoutes).toContain('MAX_DECIMAL_10_2');
    expect(adminRoutes).toContain('MAX_PG_INTEGER');
    expect(adminRoutes).toContain("Variant price");
    expect(adminRoutes).toContain("Variant stock");
    expect(adminRoutes).toContain("must be a non-negative number");
    expect(adminRoutes).toContain("must be a non-negative integer");
    expect(adminRoutes).toContain("No variant updates supplied");
  });
});
