/**
 * adminGrantRefusalBehaviour.test.mjs
 * ===================================
 * BEHAVIOURAL cover for the admin manual-grant refusal branch. Its companion
 * source assertions cannot tell
 *
 *     if (grantResult?.unfulfillable) {
 *     if (false && grantResult?.unfulfillable) {
 *
 * apart — both contain the text, and mutation proved the source suite stayed
 * green when the guard was neutered. Only an executed request proves a branch
 * fires.
 *
 * What it protects (GLM-5.3 H1 + my own sweep, 2026-08-20): grantSessionsForCart
 * can return `unfulfillable: true, sessionsAdded: 0` with `alreadyProcessed:
 * false`, which fell through to
 *
 *     message: 'Order marked paid and sessions granted'
 *
 * An admin told sessions were granted has no reason to look again, which is how
 * a paying customer stays unfulfilled indefinitely.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGrantSessionsForCart: vi.fn(),
  mockCartFindByPk: vi.fn(),
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('stripe', () => ({ default: vi.fn(function Stripe() { return {}; }) }));
vi.mock('../../utils/apiKeyChecker.mjs', () => ({ isStripeEnabled: () => false }));
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 1, role: 'admin' }; next(); },
}));
vi.mock('../../middleware/adminMiddleware.mjs', () => ({
  requireAdmin: (_req, _res, next) => next(),
}));
vi.mock('../../utils/logger.mjs', () => ({ default: mocks.mockLogger }));
vi.mock('../../models/ShoppingCart.mjs', () => ({
  default: { findByPk: mocks.mockCartFindByPk, findAll: vi.fn(), count: vi.fn() },
}));
vi.mock('../../models/CartItem.mjs', () => ({ default: {} }));
vi.mock('../../models/User.mjs', () => ({ default: {} }));
vi.mock('../../models/StorefrontItem.mjs', () => ({ default: {} }));
vi.mock('../../services/SessionGrantService.mjs', () => ({
  grantSessionsForCart: mocks.mockGrantSessionsForCart,
}));
vi.mock('../../services/adminFulfillmentQueueService.mjs', () => ({
  completeFulfillmentItem: vi.fn(),
  getAdminFulfillmentQueue: vi.fn(),
}));

const { default: adminOrdersRouter } = await import('../../routes/adminOrdersRoutes.mjs');

const post = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminOrdersRouter);
  return request(app).post('/api/admin/orders/42/complete').send({});
};

describe('the admin manual grant never reports a refusal as a grant', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.mockCartFindByPk.mockResolvedValue({ id: 42, userId: 3, status: 'pending_payment' });
    mocks.mockGrantSessionsForCart.mockResolvedValue({
      granted: false,
      sessionsAdded: 0,
      alreadyProcessed: false,
      unfulfillable: true,
      reason: 'ADOPTION_UNVERIFIABLE',
    });
  });

  it('does not answer success', async () => {
    const response = await post();

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('never claims sessions were granted', async () => {
    const response = await post();

    expect(JSON.stringify(response.body)).not.toMatch(/sessions granted/i);
  });

  it('says plainly that nothing was granted', async () => {
    const response = await post();

    expect(response.body.message).toMatch(/NOT granted/i);
    expect(response.body.data?.sessionsAdded).toBe(0);
  });

  it('carries the reason and flags it for review', async () => {
    const response = await post();

    expect(response.body.error?.reason).toBe('ADOPTION_UNVERIFIABLE');
    expect(response.body.error?.requiresSupportReview).toBe(true);
  });

  it('handles the other terminal reason the same way', async () => {
    mocks.mockGrantSessionsForCart.mockResolvedValue({
      granted: false,
      sessionsAdded: 0,
      alreadyProcessed: false,
      unfulfillable: true,
      reason: 'SESSION_DOES_NOT_OWN_CART',
    });

    const response = await post();

    expect(response.status).toBe(409);
    expect(response.body.error?.reason).toBe('SESSION_DOES_NOT_OWN_CART');
  });
});

describe('a healthy admin grant is unaffected', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.mockCartFindByPk.mockResolvedValue({ id: 42, userId: 3, status: 'pending_payment' });
    mocks.mockGrantSessionsForCart.mockResolvedValue({
      granted: true,
      sessionsAdded: 48,
      alreadyProcessed: false,
    });
  });

  it('reports the grant', async () => {
    const response = await post();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.sessionsAdded).toBe(48);
  });

  it('still reports an idempotent replay as already completed', async () => {
    mocks.mockGrantSessionsForCart.mockResolvedValue({
      granted: false,
      sessionsAdded: 0,
      alreadyProcessed: true,
    });

    const response = await post();

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/already completed/i);
  });
});
