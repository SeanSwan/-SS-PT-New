/**
 * sessionPackageWebhookFulfillmentRetry.test.mjs
 * ==============================================
 * Locks Stripe retry semantics for direct session-package checkout webhooks.
 * Transient fulfillment failures must return 5xx so Stripe retries instead of
 * acknowledging an unfulfilled paid session package.
 */
import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockStripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
  fulfillSessionPackageCheckoutSession: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: vi.fn(function MockStripe() {
    return mocks.mockStripe;
  }),
}));

vi.mock('../utils/apiKeyChecker.mjs', () => ({
  isStripeEnabled: () => true,
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (_req, _res, next) => next(),
  adminOnly: (_req, _res, next) => next(),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../models/User.mjs', () => ({
  default: {},
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

vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_webhookroute');
vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_webhookroute');
const { default: sessionPackageRoutes } = await import('../routes/sessionPackageRoutes.mjs');

function buildApp() {
  const app = express();
  app.use('/api/session-packages', sessionPackageRoutes);
  return app;
}

function makeEvent() {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_pkg123',
        client_reference_id: '3',
        metadata: {
          packageId: 'starter',
          sessions: '5',
        },
      },
    },
  };
}

describe('session package webhook fulfillment retry behavior', () => {
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockStripe.webhooks.constructEvent.mockReturnValue(makeEvent());
  });

  it('returns 500 when direct package fulfillment fails so Stripe retries', async () => {
    mocks.fulfillSessionPackageCheckoutSession.mockRejectedValueOnce(new Error('row lock timeout'));

    const response = await request(buildApp())
      .post('/api/session-packages/webhook')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(500);
    expect(response.text).toContain('Session package webhook processing error');
    expect(mocks.fulfillSessionPackageCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      id: 'cs_test_pkg123',
    }));
  });
});
