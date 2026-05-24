import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 3, role: 'client' };
    next();
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function buildApp(paymentRoutes) {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/payments', paymentRoutes);
  return app;
}

async function loadPaymentRoutesWithEnv(env) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', env.NODE_ENV || 'development');
  vi.stubEnv('STRIPE_SECRET_KEY', env.STRIPE_SECRET_KEY || '');
  vi.stubEnv('SWAN_ALLOW_LIVE_STRIPE_LOCAL', env.SWAN_ALLOW_LIVE_STRIPE_LOCAL || '');

  const { default: paymentRoutes } = await import('../../routes/v2PaymentRoutes.mjs');
  return paymentRoutes;
}

describe('v2 payment local live Stripe guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('blocks live Stripe checkout session creation in local development', async () => {
    const paymentRoutes = await loadPaymentRoutesWithEnv({
      NODE_ENV: 'development',
      STRIPE_SECRET_KEY: 'sk_live_unit',
    });
    const app = buildApp(paymentRoutes);

    const response = await request(app)
      .post('/api/v2/payments/create-checkout-session')
      .send({});

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('LIVE_STRIPE_LOCAL_BLOCKED');
    expect(response.body.error.details).toContain('Use sk_test_/pk_test_ sandbox keys');
  });

  it('reports local live block state on the payment health endpoint', async () => {
    const paymentRoutes = await loadPaymentRoutesWithEnv({
      NODE_ENV: 'development',
      STRIPE_SECRET_KEY: 'sk_live_unit',
    });
    const app = buildApp(paymentRoutes);

    const response = await request(app).get('/api/v2/payments/health');

    expect(response.status).toBe(503);
    expect(response.body.data.status).toBe('degraded');
    expect(response.body.data.stripe.available).toBe(false);
    expect(response.body.data.stripe).not.toHaveProperty('configured');
    expect(response.body.data.stripe).not.toHaveProperty('mode');
    expect(response.body.data.stripe).not.toHaveProperty('liveLocalBlocked');
  });
});
