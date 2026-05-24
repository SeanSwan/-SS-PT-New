import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockShoppingCart: {
    findByPk: vi.fn(),
    findAndCountAll: vi.fn(),
    findAll: vi.fn(),
  },
  mockGrantSessionsForCart: vi.fn(),
}));

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.get('x-test-admin-id') || 1),
      email: 'admin@swanstudios.test',
      role: 'admin',
    };
    next();
  },
}));

vi.mock('../middleware/adminMiddleware.mjs', () => ({
  requireAdmin: (_req, _res, next) => next(),
}));

vi.mock('../utils/apiKeyChecker.mjs', () => ({
  isStripeEnabled: () => false,
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../models/ShoppingCart.mjs', () => ({
  default: mocks.mockShoppingCart,
}));

vi.mock('../models/CartItem.mjs', () => ({
  default: {},
}));

vi.mock('../models/User.mjs', () => ({
  default: {},
}));

vi.mock('../models/StorefrontItem.mjs', () => ({
  default: {},
}));

vi.mock('../services/SessionGrantService.mjs', () => ({
  grantSessionsForCart: mocks.mockGrantSessionsForCart,
}));

const { default: adminOrdersRoutes } = await import('../routes/adminOrdersRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminOrdersRoutes);
  return app;
}

describe('admin order completion route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockShoppingCart.findByPk.mockResolvedValue({
      id: 42,
      userId: 9,
      status: 'pending_payment',
      total: '240.00',
    });
    mocks.mockGrantSessionsForCart.mockResolvedValue({
      granted: true,
      sessionsAdded: 8,
      alreadyProcessed: false,
    });
  });

  it('marks a pending ShoppingCart paid through the shared session grant service', async () => {
    const response = await request(buildApp())
      .post('/api/admin/orders/42/complete')
      .send({ adminNotes: 'Manually verified payment' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      message: 'Order marked paid and sessions granted',
    }));
    expect(response.body.data).toEqual(expect.objectContaining({
      orderId: 42,
      userId: 9,
      sessionsAdded: 8,
      alreadyProcessed: false,
    }));
    expect(mocks.mockShoppingCart.findByPk).toHaveBeenCalledWith(42);
    expect(mocks.mockGrantSessionsForCart).toHaveBeenCalledWith(42, 9, 'admin-manual');
  });

  it('returns 404 before attempting a grant when the cart does not exist', async () => {
    mocks.mockShoppingCart.findByPk.mockResolvedValue(null);

    const response = await request(buildApp())
      .post('/api/admin/orders/999/complete')
      .send({ adminNotes: 'Manual check' });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Order not found');
    expect(mocks.mockGrantSessionsForCart).not.toHaveBeenCalled();
  });

  it('rejects malformed pending-order filters before querying carts', async () => {
    const response = await request(buildApp())
      .get('/api/admin/orders/pending')
      .query({ minAmount: '240USD' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid query parameters');
    expect(mocks.mockShoppingCart.findAndCountAll).not.toHaveBeenCalled();
  });

  it('does not leak operational details when pending orders fail', async () => {
    mocks.mockShoppingCart.findAndCountAll.mockRejectedValue(new Error('database password=raw-secret'));

    const response = await request(buildApp())
      .get('/api/admin/orders/pending');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to retrieve pending orders',
      error: 'internal_error',
    });
    expect(JSON.stringify(response.body)).not.toContain('raw-secret');
  });

  it('does not leak operational details when manual completion fails', async () => {
    mocks.mockGrantSessionsForCart.mockRejectedValue(new Error('stripe whsec_raw_secret'));

    const response = await request(buildApp())
      .post('/api/admin/orders/42/complete')
      .send({ adminNotes: 'Manual check' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to mark order paid',
      error: 'internal_error',
    });
    expect(JSON.stringify(response.body)).not.toContain('whsec_raw_secret');
  });

  it('rejects unsupported analytics time ranges before analytics queries', async () => {
    const response = await request(buildApp())
      .get('/api/admin/orders/analytics')
      .query({ timeRange: '365d' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid query parameters');
    expect(mocks.mockShoppingCart.findAll).not.toHaveBeenCalled();
  });

  it('rejects oversized exports before querying carts', async () => {
    const response = await request(buildApp())
      .get('/api/admin/orders/export')
      .query({ limit: '5000' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid export parameters');
    expect(mocks.mockShoppingCart.findAll).not.toHaveBeenCalled();
  });
});
