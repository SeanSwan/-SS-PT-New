import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  transaction: { id: 'ach-order-tx' },
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
}));

vi.mock('stripe', () => ({
  default: vi.fn(function MockStripe() {
    return {
      paymentIntents: mocks.paymentIntents,
    };
  }),
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

const achPaymentRoutes = (await import('../../routes/achPaymentRoutes.mjs')).default;
const webhookSource = readFileSync(resolve(process.cwd(), 'webhooks/stripeWebhook.mjs'), 'utf8');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payments/ach', achPaymentRoutes);
  return app;
}

describe('ACH payment order item truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Caller id 42 holds the store-prices grant (P1-1) — purchase rail open
    mocks.userFeatureFlag.findOne.mockResolvedValue({ id: 900 });
    mocks.order.findOne.mockResolvedValue(null);
    mocks.order.findOrCreate.mockResolvedValue([
      {
        id: 91,
        orderNumber: 'SS-20260609-ACH',
        totalAmount: 200,
        status: 'pending',
        paymentMethod: 'ach',
        update: vi.fn().mockResolvedValue(true),
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
    mocks.paymentIntents.create.mockResolvedValue({
      id: 'pi_test_ach_123',
      client_secret: 'pi_test_ach_123_secret_unit',
    });
  });

  it('creates durable order items before returning an ACH PaymentIntent', async () => {
    const response = await request(makeApp())
      .post('/api/payments/ach/create-intent')
      .send({
        idempotencyKey: '11111111-1111-4111-8111-111111111111',
        total: 200,
        customerInfo: { name: 'Private Client', email: 'client@example.test' },
        items: [
          {
            storefrontItemId: 10,
            quantity: 2,
            name: 'Ten Session Pack',
            price: 100,
          },
        ],
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(mocks.orderItem.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        orderId: 91,
        storefrontItemId: 10,
        quantity: 2,
        price: '100.00',
        subtotal: '200.00',
        itemType: 'fixed',
        metadata: expect.objectContaining({
          source: 'ach_payment',
          paymentMethod: 'ach',
          sessions: 10,
        }),
      }),
    ], expect.objectContaining({
      transaction: mocks.transaction,
      validate: true,
    }));
  });

  it('keeps ACH webhook completion tied to session allocation (via the idempotent allocator)', () => {
    expect(webhookSource).toContain("case 'payment_intent.succeeded'");
    // 2026-07-15 money sweep: migrated off the legacy non-idempotent
    // SessionAllocationService onto the unified (transactional, row-locked,
    // FinancialTransaction-keyed idempotent) allocator so a Stripe retry can't
    // double-grant sessions / double-count revenue.
    expect(webhookSource).toContain('unifiedSessionService.allocateSessionsFromOrder(order.id, order.userId)');
    expect(webhookSource).not.toContain('sessionAllocationService.allocateSessionsFromOrder');
  });

  it('refuses callers without the store-prices grant (P1-1, fail closed)', async () => {
    mocks.userFeatureFlag.findOne.mockResolvedValue(null);

    const response = await request(makeApp())
      .post('/api/payments/ach/create-intent')
      .send({
        idempotencyKey: '11111111-1111-4111-8111-111111111111',
        total: 200,
        customerInfo: { name: 'Private Client', email: 'client@example.test' },
        items: [{ storefrontItemId: 10, quantity: 2, name: 'Ten Session Pack', price: 100 }],
      })
      .expect(403);

    expect(response.body.code).toBe('PRICE_ACCESS_REQUIRED');
    expect(mocks.paymentIntents.create).not.toHaveBeenCalled();
    expect(mocks.orderItem.bulkCreate).not.toHaveBeenCalled();
  });
});
