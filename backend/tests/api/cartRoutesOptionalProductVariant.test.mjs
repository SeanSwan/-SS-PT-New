import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getProductVariantMock = vi.hoisted(() => vi.fn());
const shoppingCartFindOrCreateMock = vi.hoisted(() => vi.fn());
const cartItemFindAllMock = vi.hoisted(() => vi.fn());
const cartItemFindOneMock = vi.hoisted(() => vi.fn());
const describeStorefrontTableMock = vi.hoisted(() => vi.fn());
const updateCartTotalsMock = vi.hoisted(() => vi.fn());

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 103, role: 'client' };
    next();
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => ({
    findOrCreate: shoppingCartFindOrCreateMock,
  }),
  getCartItem: () => ({
    associations: { storefrontItem: true },
    findAll: cartItemFindAllMock,
    findOne: cartItemFindOneMock,
  }),
  getStorefrontItem: () => ({
    getTableName: () => 'storefront_items',
    sequelize: {
      getQueryInterface: () => ({
        describeTable: describeStorefrontTableMock,
      }),
    },
  }),
  getProductVariant: getProductVariantMock,
  getUser: () => ({
    update: vi.fn(),
  }),
}));

vi.mock('../../utils/apiKeyChecker.mjs', () => ({
  isStripeEnabled: () => false,
}));

vi.mock('../../services/SessionGrantService.mjs', () => ({
  grantSessionsForCart: vi.fn(),
}));

vi.mock('../../utils/cartHelpers.mjs', () => ({
  // cartRoutes takes MAX_CART_ITEM_QUANTITY as a NAMED import (2026-08-16: it was
  // destructured off the default export, which never carried it, so the ceiling
  // silently bound `undefined`). A mock that omits a named export makes Vitest
  // THROW on access — which is the fail-loud behavior we want; complete the mock.
  MAX_CART_ITEM_QUANTITY: 99,
  default: {
    calculateCartTotals: vi.fn(() => ({ total: 0, totalSessions: 0 })),
    getCartTotalsWithFallback: vi.fn(({ total }) => ({ total: Number(total) || 0, totalSessions: 0 })),
    updateCartTotals: updateCartTotalsMock,
  },
}));

const { default: cartRoutes } = await import('../../routes/cartRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/cart', cartRoutes);

describe('cart routes optional ProductVariant model behavior', () => {
  beforeEach(() => {
    shoppingCartFindOrCreateMock.mockReset();
    cartItemFindAllMock.mockReset();
    cartItemFindOneMock.mockReset();
    describeStorefrontTableMock.mockReset();
    getProductVariantMock.mockReset();
    updateCartTotalsMock.mockReset();

    shoppingCartFindOrCreateMock.mockResolvedValue([{ id: 701, status: 'active', userId: 103 }, false]);
    cartItemFindAllMock.mockResolvedValue([]);
    cartItemFindOneMock.mockResolvedValue(null);
    describeStorefrontTableMock.mockResolvedValue({
      id: {},
      name: {},
      price: {},
      sessions: {},
      totalSessions: {},
    });
    getProductVariantMock.mockImplementation(() => {
      throw new Error("Model 'ProductVariant' not found in cache");
    });
  });

  it('keeps GET /api/cart alive when optional ProductVariant is absent from the model cache', async () => {
    const response = await request(app).get('/api/cart');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 701,
      status: 'active',
      items: [],
      total: 0,
      totalSessions: 0,
      itemCount: 0,
    });

    expect(getProductVariantMock).toHaveBeenCalledTimes(1);
    expect(cartItemFindAllMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { cartId: 701 },
      include: [
        expect.objectContaining({
          as: 'storefrontItem',
          required: false,
        }),
      ],
    }));
  });

  it('keeps PUT /api/cart/update/:itemId alive when optional ProductVariant is absent from the model cache', async () => {
    const saveCartItemMock = vi.fn().mockResolvedValue(undefined);
    cartItemFindOneMock.mockResolvedValue({
      id: 801,
      cartId: 701,
      quantity: 1,
      save: saveCartItemMock,
      storefrontItem: { stockQuantity: 10 },
      productVariant: null,
    });
    cartItemFindAllMock.mockResolvedValue([{ id: 801, quantity: 2, price: 25, storefrontItem: { name: 'Training' } }]);
    updateCartTotalsMock.mockResolvedValue({ success: true, total: 50 });

    const response = await request(app)
      .put('/api/cart/update/801')
      .send({ quantity: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Cart updated',
      total: 50,
      itemCount: 1,
    });
    expect(saveCartItemMock).toHaveBeenCalledTimes(1);

    const findOneArgs = cartItemFindOneMock.mock.calls[0]?.[0];
    expect(findOneArgs.include).toHaveLength(2);
    expect(findOneArgs.include).toEqual([
      expect.objectContaining({ as: 'cart' }),
      expect.objectContaining({ as: 'storefrontItem', required: false }),
    ]);
    expect(findOneArgs.include).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ as: 'productVariant' }),
    ]));
  });
});
