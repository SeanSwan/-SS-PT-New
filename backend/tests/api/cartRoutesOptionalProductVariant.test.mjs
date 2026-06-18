import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getProductVariantMock = vi.hoisted(() => vi.fn());
const shoppingCartFindOrCreateMock = vi.hoisted(() => vi.fn());
const cartItemFindAllMock = vi.hoisted(() => vi.fn());
const describeStorefrontTableMock = vi.hoisted(() => vi.fn());

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

const { default: cartRoutes } = await import('../../routes/cartRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/cart', cartRoutes);

describe('cart routes optional ProductVariant model behavior', () => {
  beforeEach(() => {
    shoppingCartFindOrCreateMock.mockReset();
    cartItemFindAllMock.mockReset();
    describeStorefrontTableMock.mockReset();
    getProductVariantMock.mockReset();

    shoppingCartFindOrCreateMock.mockResolvedValue([{ id: 701, status: 'active', userId: 103 }, false]);
    cartItemFindAllMock.mockResolvedValue([]);
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
});
