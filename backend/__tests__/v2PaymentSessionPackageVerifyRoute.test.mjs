/**
 * v2PaymentSessionPackageVerifyRoute.test.mjs
 * ===========================================
 * Verifies that the checkout success page can recover direct session-package
 * Stripe Checkout sessions through POST /api/v2/payments/verify-session.
 */
import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockStripe: {
    checkout: {
      sessions: {
        retrieve: vi.fn(),
      },
    },
  },
  fulfillSessionPackageCheckoutSession: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: vi.fn(function MockStripe() {
    return mocks.mockStripe;
  }),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: String(req.get('x-test-user-id') || 3),
      role: req.get('x-test-role') || 'client',
    };
    next();
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../utils/stripeEnvironmentSafety.mjs', () => ({
  getLiveStripeLocalBlockDetails: vi.fn(() => 'local live Stripe key blocked'),
  getStripeSecretKeyMode: vi.fn(() => 'test'),
  shouldBlockLiveStripeInLocal: vi.fn(() => false),
}));

vi.mock('../models/index.mjs', () => ({
  getShoppingCart: () => ({ findOne: vi.fn() }),
  getCartItem: () => ({}),
  getStorefrontItem: () => ({}),
  getUser: () => ({}),
}));

vi.mock('../services/SessionGrantService.mjs', () => ({
  calculateCartSessionCredits: vi.fn(() => 0),
  getStorefrontSessionCredits: vi.fn(() => 0),
  grantSessionsForCart: vi.fn(),
}));

vi.mock('../services/paymentActivationStatusService.mjs', () => ({
  PaymentActivationStatusError: class PaymentActivationStatusError extends Error {},
  resolvePaidClientActivationStatus: vi.fn(),
}));

vi.mock('../services/sessionPackageCheckoutFulfillmentService.mjs', () => ({
  SessionPackageFulfillmentError: class SessionPackageFulfillmentError extends Error {
    constructor(message, { statusCode = 400, code = 'SESSION_PACKAGE_FULFILLMENT_FAILED' } = {}) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
    }
  },
  isSessionPackageCheckoutSession: (session) => Boolean(session?.metadata?.packageId && session?.metadata?.sessions),
  fulfillSessionPackageCheckoutSession: mocks.fulfillSessionPackageCheckoutSession,
}));

vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_routeunit');
const { default: paymentRoutes } = await import('../routes/v2PaymentRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/payments', paymentRoutes);
  return app;
}

function makeSession(overrides = {}) {
  return {
    id: 'cs_test_pkg123',
    payment_status: 'paid',
    amount_total: 40000,
    client_reference_id: '3',
    customer_details: { email: 'client@example.test' },
    metadata: {
      packageId: 'starter',
      sessions: '5',
    },
    ...overrides,
  };
}

describe('v2 payment verify-session direct session-package handling', () => {
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockStripe.checkout.sessions.retrieve.mockResolvedValue(makeSession());
    mocks.fulfillSessionPackageCheckoutSession.mockResolvedValue({
      alreadyProcessed: false,
      sessionsAdded: 5,
      userId: 3,
      orderId: 91,
    });
  });

  it('fulfills direct session-package checkout sessions without requiring a cart', async () => {
    const response = await request(buildApp())
      .post('/api/v2/payments/verify-session')
      .set('x-test-user-id', '3')
      .send({ sessionId: 'cs_test_pkg123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(expect.objectContaining({
      sessionId: 'cs_test_pkg123',
      amount: 400,
      sessionsAdded: 5,
      alreadyProcessed: false,
      customerEmail: 'client@example.test',
    }));
    expect(mocks.fulfillSessionPackageCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      id: 'cs_test_pkg123',
      client_reference_id: '3',
    }));
  });

  it('does not fulfill a paid package session owned by another user', async () => {
    mocks.mockStripe.checkout.sessions.retrieve.mockResolvedValue(makeSession({
      client_reference_id: '999',
    }));

    const response = await request(buildApp())
      .post('/api/v2/payments/verify-session')
      .set('x-test-user-id', '3')
      .send({ sessionId: 'cs_test_pkg123' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    expect(mocks.fulfillSessionPackageCheckoutSession).not.toHaveBeenCalled();
  });
});
