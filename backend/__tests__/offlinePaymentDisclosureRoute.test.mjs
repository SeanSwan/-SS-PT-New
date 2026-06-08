import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  storeFindAll: vi.fn(),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 3, email: 'client@example.test' };
    next();
  },
}));

vi.mock('../models/Order.mjs', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock('../models/StorefrontItem.mjs', () => ({
  default: {
    findAll: mocks.storeFindAll,
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { default: offlinePaymentRoutes } = await import('../routes/offlinePaymentRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', offlinePaymentRoutes);
  return app;
}

describe('offline payment disclosure guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not expose storefront lookup internals during server-side price validation', async () => {
    mocks.storeFindAll.mockRejectedValue(
      new Error('relation "storefront_items" does not exist; SQL=select private_price'),
    );

    const response = await request(buildApp())
      .post('/api/payments/offline')
      .send({
        paymentMethod: 'zelle',
        items: [{ storefrontItemId: 42, quantity: 1 }],
        total: 175,
        fee: 0,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Could not validate payment items. Please refresh your cart and try again.',
    });
    expect(response.text).not.toContain('storefront_items');
    expect(response.text).not.toContain('select private_price');
  });
});
