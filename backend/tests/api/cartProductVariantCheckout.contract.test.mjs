import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const cartItemModel = read('models/CartItem.mjs');
const orderItemModel = read('models/OrderItem.mjs');
const cartRoutes = read('routes/cartRoutes.mjs');
const paymentRoutes = read('routes/v2PaymentRoutes.mjs');
const associations = read('models/associations.mjs');

describe('product variant checkout contract', () => {
  it('persists selected product variants on cart items', () => {
    expect(cartItemModel).toContain('productVariantId:');

    const migrationSources = readdirSync(resolve(root, 'migrations'))
      .filter((file) => /\.(cjs|mjs)$/.test(file))
      .map((file) => read(`migrations/${file}`));

    expect(migrationSources.some((source) => (
      source.includes('cart_items')
      && source.includes('productVariantId')
      && source.includes('product_variants')
    ))).toBe(true);
  });

  it('associates cart items to product variants for cart and checkout reads', () => {
    expect(associations).toContain('CartItem.belongsTo(ProductVariant');
    expect(associations).toContain("as: 'productVariant'");
    expect(cartRoutes).toContain('getProductVariant');
    expect(cartRoutes).toContain("as: 'productVariant'");
    expect(paymentRoutes).toContain('getProductVariant');
    expect(paymentRoutes).toContain("as: 'productVariant'");
  });

  it('persists selected product variants into order item records', () => {
    expect(orderItemModel).toContain('productVariantId:');
    expect(associations).toContain('OrderItem.belongsTo(ProductVariant');

    const migrationSources = readdirSync(resolve(root, 'migrations'))
      .filter((file) => /\.(cjs|mjs)$/.test(file))
      .map((file) => read(`migrations/${file}`));

    expect(migrationSources.some((source) => (
      source.includes('order_items')
      && source.includes('productVariantId')
      && source.includes('product_variants')
    ))).toBe(true);
  });

  it('validates variant ownership and snapshots variant price when adding products to cart', () => {
    expect(cartRoutes).toContain('const { storefrontItemId, productVariantId, quantity = 1 } = req.body;');
    expect(cartRoutes).toContain('const normalizedProductVariantId = parseOptionalPositiveInteger(productVariantId);');
    expect(cartRoutes).toContain('resolveCartItemSnapshot');
    expect(cartRoutes).toContain('variant.storefrontItemId !== storefrontItemId');
    expect(cartRoutes).toContain('productVariantId: normalizedProductVariantId');
    expect(cartRoutes).toContain('price: snapshot.price');
  });

  it('keeps v2 Stripe checkout variant-aware and prevents training tax leakage', () => {
    expect(paymentRoutes).toContain('resolveCheckoutLineItem');
    expect(paymentRoutes).toContain('productVariantId: item.productVariantId ? item.productVariantId.toString() :');
    expect(paymentRoutes).toContain('taxableProductSubtotal');
    expect(paymentRoutes).not.toContain('PRODUCT_TAX_RATE');
    expect(paymentRoutes).not.toContain('Product sales tax');
    expect(paymentRoutes).toContain('tax_behavior:');
    expect(paymentRoutes).toContain("enabled: usesStripeTax");
  });
});
