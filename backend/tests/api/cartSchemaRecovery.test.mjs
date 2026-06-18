import { describe, expect, it, vi } from 'vitest';
import {
  safeFindOrCreateActiveCart,
  safeLoadCartItemsWithStorefront
} from '../../utils/cartSchemaRecovery.mjs';

describe('cart schema recovery', () => {
  it('falls back to raw SQL when model query fails on missing column', async () => {
    const modelError = new Error('column "sessionsGranted" does not exist');
    modelError.parent = { code: '42703', message: modelError.message };

    const query = vi
      .fn()
      // Resolve userId column name
      .mockResolvedValueOnce([[{ column_name: 'userId', data_type: 'integer' }]])
      // Existing cart lookup -> empty
      .mockResolvedValueOnce([[]])
      // Insert fallback cart
      .mockResolvedValueOnce([[{ id: 77, status: 'active' }]]);

    const ShoppingCart = {
      findOrCreate: vi.fn().mockRejectedValue(modelError),
      sequelize: { query }
    };

    const [cart, created] = await safeFindOrCreateActiveCart(
      ShoppingCart,
      '12',
      { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
    );

    expect(created).toBe(true);
    expect(cart.id).toBe(77);
    expect(cart.status).toBe('active');
    expect(cart.userId).toBe(12);
    expect(ShoppingCart.findOrCreate).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('recovers from UUID/integer type-drift by using deterministic UUID fallback', async () => {
    const modelError = new Error('invalid input syntax for type uuid: "12"');
    modelError.parent = { code: '22P02', message: modelError.message };

    const query = vi
      .fn()
      // Resolve userId column as uuid
      .mockResolvedValueOnce([[{ column_name: 'userId', data_type: 'uuid' }]])
      // Existing cart lookup -> empty
      .mockResolvedValueOnce([[]])
      // Insert fallback cart
      .mockResolvedValueOnce([[{ id: 88, status: 'active' }]]);

    const ShoppingCart = {
      findOrCreate: vi.fn().mockRejectedValue(modelError),
      sequelize: { query }
    };

    const [cart, created] = await safeFindOrCreateActiveCart(
      ShoppingCart,
      12,
      { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
    );

    const insertCallReplacements = query.mock.calls[2][1].replacements;

    expect(created).toBe(true);
    expect(cart.id).toBe(88);
    expect(cart.userId).toBe(12);
    expect(insertCallReplacements.userUuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('falls back to raw cart-item query when include query fails from schema drift', async () => {
    const modelError = new Error('column "cartId" does not exist');
    modelError.parent = { code: '42703', message: modelError.message };

    const query = vi.fn(async (sql, options = {}) => {
      if (sql.includes('information_schema.columns')) {
        if (options?.replacements?.tableName === 'cart_items') {
          return [[
            { column_name: 'id', data_type: 'integer' },
            { column_name: 'cart_id', data_type: 'integer' },
            { column_name: 'storefront_item_id', data_type: 'integer' },
            { column_name: 'quantity', data_type: 'integer' },
            { column_name: 'price', data_type: 'numeric' }
          ]];
        }
        if (options?.replacements?.tableName === 'storefront_items') {
          return [[
            { column_name: 'id', data_type: 'integer' },
            { column_name: 'name', data_type: 'character varying' },
            { column_name: 'price', data_type: 'numeric' }
          ]];
        }
      }

      if (sql.includes('FROM cart_items')) {
        return [[
          { id: 9, storefrontItemId: 5, quantity: 2, price: '19.99' }
        ]];
      }

      if (sql.includes('FROM "storefront_items"')) {
        return [[
          { id: 5, name: 'Starter Package', price: '19.99' }
        ]];
      }

      return [[]];
    });

    const CartItem = {
      findAll: vi.fn().mockRejectedValue(modelError),
      sequelize: { query }
    };

    const StorefrontItem = {
      getTableName: vi.fn(() => 'storefront_items')
    };

    const result = await safeLoadCartItemsWithStorefront({
      CartItem,
      StorefrontItem,
      cartId: 42,
      storefrontAttributes: ['id', 'name', 'price', 'imageUrl'],
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
    });

    expect(result).toHaveLength(1);
    expect(result[0].cartId).toBe(42);
    expect(result[0].quantity).toBe(2);
    expect(result[0].price).toBe(19.99);
    expect(result[0].storefrontItemId).toBe(5);
    expect(result[0].storefrontItem?.name).toBe('Starter Package');
  });

  it('falls back when the optional product variant table is not deployed yet', async () => {
    const modelError = new Error('relation "product_variants" does not exist');
    modelError.parent = { code: '42P01', message: modelError.message };

    const query = vi.fn(async (sql, options = {}) => {
      if (sql.includes('information_schema.columns')) {
        if (options?.replacements?.tableName === 'cart_items') {
          return [[
            { column_name: 'id', data_type: 'integer' },
            { column_name: 'cartId', data_type: 'integer' },
            { column_name: 'storefrontItemId', data_type: 'integer' },
            { column_name: 'productVariantId', data_type: 'integer' },
            { column_name: 'quantity', data_type: 'integer' },
            { column_name: 'price', data_type: 'numeric' }
          ]];
        }
        if (options?.replacements?.tableName === 'storefront_items') {
          return [[
            { column_name: 'id', data_type: 'integer' },
            { column_name: 'name', data_type: 'character varying' },
            { column_name: 'price', data_type: 'numeric' }
          ]];
        }
      }

      if (sql.includes('FROM cart_items')) {
        return [[
          { id: 14, storefrontItemId: 6, productVariantId: 21, quantity: 1, price: '49.00' }
        ]];
      }

      if (sql.includes('FROM "storefront_items"')) {
        return [[
          { id: 6, name: 'Recovery Product', price: '49.00' }
        ]];
      }

      return [[]];
    });

    const CartItem = {
      associations: { productVariant: true },
      findAll: vi.fn().mockRejectedValue(modelError),
      sequelize: { query }
    };

    const StorefrontItem = {
      getTableName: vi.fn(() => 'storefront_items')
    };

    const ProductVariant = {};

    const result = await safeLoadCartItemsWithStorefront({
      CartItem,
      StorefrontItem,
      ProductVariant,
      cartId: 55,
      storefrontAttributes: ['id', 'name', 'price'],
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
    });

    expect(result).toHaveLength(1);
    expect(result[0].cartId).toBe(55);
    expect(result[0].storefrontItem?.name).toBe('Recovery Product');
    expect(result[0].productVariantId).toBe(21);
  });

  it('does not select optional productVariantId when the cart item column is not deployed yet', async () => {
    const modelError = new Error('column "productVariantId" does not exist');
    modelError.parent = { code: '42703', message: modelError.message };

    const cartItemQueries = [];
    const query = vi.fn(async (sql, options = {}) => {
      if (sql.includes('information_schema.columns')) {
        if (options?.replacements?.tableName === 'cart_items') {
          return [[
            { column_name: 'id', data_type: 'integer' },
            { column_name: 'cartId', data_type: 'integer' },
            { column_name: 'storefrontItemId', data_type: 'integer' },
            { column_name: 'quantity', data_type: 'integer' },
            { column_name: 'price', data_type: 'numeric' }
          ]];
        }
        if (options?.replacements?.tableName === 'storefront_items') {
          return [[
            { column_name: 'id', data_type: 'integer' },
            { column_name: 'name', data_type: 'character varying' },
            { column_name: 'price', data_type: 'numeric' }
          ]];
        }
      }

      if (sql.includes('FROM cart_items')) {
        cartItemQueries.push(sql);
        return [[
          { id: 15, storefrontItemId: 7, productVariantId: null, quantity: 1, price: '29.00' }
        ]];
      }

      if (sql.includes('FROM "storefront_items"')) {
        return [[
          { id: 7, name: 'Legacy Package', price: '29.00' }
        ]];
      }

      return [[]];
    });

    const CartItem = {
      associations: { productVariant: true },
      findAll: vi.fn().mockRejectedValue(modelError),
      sequelize: { query }
    };

    const StorefrontItem = {
      getTableName: vi.fn(() => 'storefront_items')
    };

    const result = await safeLoadCartItemsWithStorefront({
      CartItem,
      StorefrontItem,
      ProductVariant: {},
      cartId: 56,
      storefrontAttributes: ['id', 'name', 'price'],
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
    });

    expect(result).toHaveLength(1);
    expect(result[0].productVariantId).toBeNull();
    expect(result[0].storefrontItem?.name).toBe('Legacy Package');
    expect(cartItemQueries[0]).not.toMatch(/"productVariantId"\s+AS\s+"productVariantId"/);
    expect(cartItemQueries[0]).toContain('NULL AS "productVariantId"');
  });
});
