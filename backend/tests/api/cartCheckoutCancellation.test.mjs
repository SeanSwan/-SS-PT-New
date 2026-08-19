/**
 * FILE: cartCheckoutCancellation.test.mjs
 * PURPOSE: Runtime-lock the authenticated Stripe cancellation recovery path.
 * OWNER: Codex
 * SECURITY: Proves Stripe metadata and JWT ownership scope the only cart reopened.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  expire: vi.fn(),
  update: vi.fn(),
  findOne: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: vi.fn(function MockStripe() {
    return {
      checkout: { sessions: { retrieve: mocks.retrieve, expire: mocks.expire } },
      webhooks: { constructEvent: vi.fn() },
    };
  }),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: '103', role: 'client' };
    next();
  },
}));

vi.mock('../../utils/apiKeyChecker.mjs', () => ({
  isStripeEnabled: () => true,
}));

vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => ({ update: mocks.update, findOne: mocks.findOne }),
  getCartItem: () => ({}),
  getStorefrontItem: () => ({}),
  getProductVariant: () => ({}),
  getUser: () => ({}),
}));

vi.mock('../../services/SessionGrantService.mjs', () => ({
  grantSessionsForCart: vi.fn(),
}));

vi.mock('../../utils/cartHelpers.mjs', () => ({
  // Named export required: cartRoutes imports MAX_CART_ITEM_QUANTITY by name
  // (2026-08-16 — it used to be destructured off the default export, which never
  // carried it, silently binding `undefined` and disabling every ceiling check).
  MAX_CART_ITEM_QUANTITY: 99,
  default: {
    calculateCartTotals: vi.fn(),
    getCartTotalsWithFallback: vi.fn(),
    updateCartTotals: vi.fn(),
  },
}));

const { default: cartRoutes } = await import('../../routes/cartRoutes.mjs');
const app = express();
app.use(express.json());
app.use('/api/cart', cartRoutes);

describe('POST /api/cart/cancel-checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.retrieve.mockResolvedValue({
      id: 'cs_test_cancel_123',
      status: 'open',
      payment_status: 'unpaid',
      metadata: { cartId: '701', userId: '103' },
    });
    mocks.expire.mockResolvedValue({ id: 'cs_test_cancel_123', status: 'expired' });
    mocks.update.mockResolvedValue([1]);
  });

  it('expires Stripe and reopens only the matching pending cart owned by the JWT user', async () => {
    const response = await request(app)
      .post('/api/cart/cancel-checkout')
      .send({ sessionId: 'cs_test_cancel_123' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, cartId: 701, status: 'active' });
    expect(mocks.expire).toHaveBeenCalledWith('cs_test_cancel_123');
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        paymentStatus: 'cancelled',
        checkoutSessionId: null,
      }),
      expect.objectContaining({
        where: {
          id: 701,
          userId: 103,
          status: 'pending_payment',
          checkoutSessionId: 'cs_test_cancel_123',
        },
      }),
    );
  });

  it('refuses a session owned by another user without expiring or reopening anything', async () => {
    mocks.retrieve.mockResolvedValue({
      id: 'cs_test_cancel_123',
      status: 'open',
      payment_status: 'unpaid',
      metadata: { cartId: '701', userId: '999' },
    });

    const response = await request(app)
      .post('/api/cart/cancel-checkout')
      .send({ sessionId: 'cs_test_cancel_123' });

    expect(response.status).toBe(404);
    expect(mocks.expire).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('never reopens a paid session', async () => {
    mocks.retrieve.mockResolvedValue({
      id: 'cs_test_cancel_123',
      status: 'complete',
      payment_status: 'paid',
      metadata: { cartId: '701', userId: '103' },
    });

    const response = await request(app)
      .post('/api/cart/cancel-checkout')
      .send({ sessionId: 'cs_test_cancel_123' });

    expect(response.status).toBe(409);
    expect(mocks.expire).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
