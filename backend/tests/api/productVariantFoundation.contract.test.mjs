import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { mapStorefrontItem } from '../../services/store/storefrontDisplayService.mjs';

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

  it('model registry exports ProductVariant for cart and checkout routes', () => {
    const assoc = read('models/associations.mjs');
    const returnBlocks = [...assoc.matchAll(/return\s+\{[\s\S]*?\};/g)].map((match) => match[0]);
    const ecommerceRegistryReturns = returnBlocks.filter((block) => block.includes('StorefrontItem'));

    expect(ecommerceRegistryReturns.length).toBeGreaterThanOrEqual(2);
    for (const block of ecommerceRegistryReturns) {
      expect(block).toContain('ProductVariant,');
    }
  });

  it('storefront API exposes the product fields the UI needs', () => {
    const routes = read('routes/storeFrontRoutes.mjs');
    expect(routes).toContain("import { mapStorefrontItem } from '../services/store/storefrontDisplayService.mjs'");
    expect(routes).toContain('const mapped = mapStorefrontItem(item)');
    expect(routes).toContain('include: variantInclude');
    expect(routes).toContain("as: 'variants'");

    const physicalProduct = mapStorefrontItem({
      id: 41,
      name: 'Recovery drink',
      packageType: 'fixed',
      itemKind: 'physical_product',
      isTaxable: true,
      fulfillmentType: 'local_delivery',
      stockQuantity: 12,
      totalCost: '24.00',
      price: '99.00',
      variants: [{
        id: 411,
        storefrontItemId: 41,
        label: '16 oz',
        sku: 'DRINK-16',
        price: '8.50',
        stockQuantity: 4,
        attributes: { size: '16 oz' },
        displayOrder: 1,
        isActive: true,
      }],
      isSpecialOffer: true,
      activeSpecial: { bonusSessions: 10 },
    });

    expect(physicalProduct).toMatchObject({
      itemKind: 'physical_product',
      itemType: 'PHYSICAL_PRODUCT',
      isTaxable: true,
      fulfillmentType: 'local_delivery',
      stockQuantity: 12,
      totalCost: 24,
      displayPrice: 24,
      price: 24,
    });
    expect(physicalProduct.variants).toEqual([
      expect.objectContaining({
        id: 411,
        label: '16 oz',
        sku: 'DRINK-16',
        price: 8.5,
        stockQuantity: 4,
      }),
    ]);
    expect(physicalProduct).not.toHaveProperty('isSpecialOffer');
    expect(physicalProduct).not.toHaveProperty('activeSpecial');

    const trainingPackage = mapStorefrontItem({
      id: 42,
      name: '10-session package',
      packageType: 'fixed',
      totalCost: '1750.00',
      itemKind: undefined,
      isTaxable: false,
      fulfillmentType: undefined,
      variants: [],
    });
    expect(trainingPackage).toMatchObject({
      itemKind: 'training_package',
      itemType: 'TRAINING_PACKAGE_FIXED',
      isTaxable: false,
      fulfillmentType: 'none',
    });
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
