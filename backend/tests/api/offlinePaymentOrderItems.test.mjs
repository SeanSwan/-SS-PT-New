import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  order: {
    findOne: vi.fn(),
    findOrCreate: vi.fn(),
  },
  orderItem: {
    bulkCreate: vi.fn(),
    count: vi.fn(),
  },
  storefrontItem: {
    findAll: vi.fn(),
  },
  userFeatureFlag: {
    findOne: vi.fn(),
  },
  transaction: { id: 'offline-order-tx' },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 42, role: 'client', email: 'client@example.test' };
    next();
  },
}));

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn(async (callback) => callback(mocks.transaction)),
  },
}));

vi.mock('../../models/Order.mjs', () => ({ default: mocks.order }));
vi.mock('../../models/OrderItem.mjs', () => ({ default: mocks.orderItem }));
vi.mock('../../models/StorefrontItem.mjs', () => ({ default: mocks.storefrontItem }));
// P1-1 price privacy: purchase rails require the store-prices grant (fail closed).
// User.mjs must be mocked too — priceVisibilityService.getModels() imports both,
// and the real model init throws under the mocked database (→ spurious fail-closed).
vi.mock('../../models/UserFeatureFlag.mjs', () => ({ default: mocks.userFeatureFlag }));
vi.mock('../../models/User.mjs', () => ({ default: { findByPk: vi.fn() } }));

const offlinePaymentRoutes = (await import('../../routes/offlinePaymentRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', offlinePaymentRoutes);
  return app;
}

function requestBody(overrides = {}) {
  return {
    paymentMethod: 'zelle',
    total: 200,
    fee: 0,
    idempotencyKey: 'offline-test-key',
    customerInfo: { name: 'Private Client', email: 'client@example.test' },
    items: [
      {
        storefrontItemId: 10,
        quantity: 2,
        name: 'Ten Session Pack',
        price: 100,
      },
    ],
    ...overrides,
  };
}

describe('offline payment order item truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Caller id 42 holds the store-prices grant (P1-1) — purchase rail open
    mocks.userFeatureFlag.findOne.mockResolvedValue({ id: 900 });
    mocks.order.findOne.mockResolvedValue(null);
    mocks.order.findOrCreate.mockResolvedValue([
      {
        id: 77,
        orderNumber: 'SS-20260609-OFFLINE',
        totalAmount: 200,
        status: 'pending',
        paymentMethod: 'zelle',
      },
      true,
    ]);
    mocks.orderItem.bulkCreate.mockResolvedValue([]);
    mocks.orderItem.count.mockResolvedValue(0);
    mocks.storefrontItem.findAll.mockResolvedValue([
      {
        id: 10,
        name: 'Ten Session Pack',
        description: 'Ten one-hour training sessions',
        price: '100.00',
        packageType: 'fixed',
        sessions: 10,
        totalSessions: null,
        imageUrl: '/assets/ten-pack.png',
      },
    ]);
  });

  it('creates durable order items from server-side storefront prices', async () => {
    const response = await request(makeApp())
      .post('/api/payments/offline')
      .send(requestBody())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(mocks.order.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, idempotencyKey: 'offline-test-key' },
      transaction: mocks.transaction,
    }));
    expect(mocks.orderItem.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        orderId: 77,
        storefrontItemId: 10,
        name: 'Ten Session Pack',
        description: 'Ten one-hour training sessions',
        quantity: 2,
        price: '100.00',
        subtotal: '200.00',
        itemType: 'fixed',
        imageUrl: '/assets/ten-pack.png',
        metadata: expect.objectContaining({
          source: 'offline_payment',
          paymentMethod: 'zelle',
          sessions: 10,
          totalSessions: null,
        }),
      }),
    ], expect.objectContaining({
      transaction: mocks.transaction,
      validate: true,
    }));
  });

  it('backfills missing order items on an idempotent offline retry', async () => {
    mocks.order.findOne.mockResolvedValueOnce({
      id: 88,
      orderNumber: 'SS-20260609-EXISTING',
      totalAmount: 200,
      status: 'pending',
      paymentMethod: 'zelle',
    });

    await request(makeApp())
      .post('/api/payments/offline')
      .send(requestBody())
      .expect(200);

    expect(mocks.orderItem.count).toHaveBeenCalledWith({
      where: { orderId: 88 },
    });
    expect(mocks.orderItem.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        orderId: 88,
        storefrontItemId: 10,
        quantity: 2,
        subtotal: '200.00',
      }),
    ], expect.objectContaining({ validate: true }));
  });

  it('refuses callers without the store-prices grant (P1-1, fail closed)', async () => {
    mocks.userFeatureFlag.findOne.mockResolvedValue(null);

    const response = await request(makeApp())
      .post('/api/payments/offline')
      .send(requestBody())
      .expect(403);

    expect(response.body.code).toBe('PRICE_ACCESS_REQUIRED');
    expect(mocks.order.findOrCreate).not.toHaveBeenCalled();
    expect(mocks.orderItem.bulkCreate).not.toHaveBeenCalled();
  });
});
