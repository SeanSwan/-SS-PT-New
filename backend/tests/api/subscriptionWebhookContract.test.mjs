import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackendFile = (relativePath) =>
  readFileSync(resolve(__dirname, '..', '..', relativePath), 'utf8').replace(/\r\n/g, '\n');

const routeSource = readBackendFile('routes/subscriptionRoutes.mjs');
const middlewareSource = readBackendFile('core/middleware/index.mjs');
const coreRoutesSource = readBackendFile('core/routes.mjs');

describe('subscription Stripe webhook contract', () => {
  it('mounts the subscription routes at /api/subscriptions', () => {
    expect(coreRoutesSource).toMatch(
      /app\.use\(\s*['"]\/api\/subscriptions['"]\s*,\s*subscriptionRoutes\s*\)/,
    );
  });

  it('skips global express.json for /api/subscriptions/webhook so Stripe raw signature verification can work', () => {
    expect(middlewareSource).toMatch(
      /req\.path\.startsWith\(['"]\/api\/subscriptions\/webhook['"]\)/,
    );
  });

  it('fails closed in production when STRIPE_SUBSCRIPTION_WEBHOOK_SECRET is missing', () => {
    expect(routeSource).toMatch(/STRIPE_SUBSCRIPTION_WEBHOOK_SECRET/);
    expect(routeSource).toMatch(
      /NODE_ENV\s*={2,3}\s*['"]production['"][\s\S]{0,800}STRIPE_SUBSCRIPTION_WEBHOOK_SECRET|STRIPE_SUBSCRIPTION_WEBHOOK_SECRET[\s\S]{0,800}NODE_ENV\s*={2,3}\s*['"]production['"]/,
    );
    expect(routeSource).not.toMatch(/accepting unverified event/);
  });

  it('returns 503 at runtime in production when the subscription webhook secret is absent', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousStripeKey = process.env.STRIPE_SECRET_KEY;
    const previousSubscriptionSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
    const { default: express } = await import('express');
    const { default: request } = await import('supertest');
    const { default: subscriptionRoutes } = await import('../../routes/subscriptionRoutes.mjs');

    try {
      process.env.NODE_ENV = 'production';
      process.env.STRIPE_SECRET_KEY = 'subscription-contract-test-key';
      delete process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;

      const app = express();
      app.use('/api/subscriptions', subscriptionRoutes);

      const response = await request(app)
        .post('/api/subscriptions/webhook')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify({ type: 'invoice.payment_failed', data: { object: {} } })));

      expect(response.status).toBe(503);
      expect(response.text).toContain('not configured');
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      if (previousStripeKey === undefined) {
        delete process.env.STRIPE_SECRET_KEY;
      } else {
        process.env.STRIPE_SECRET_KEY = previousStripeKey;
      }
      if (previousSubscriptionSecret === undefined) {
        delete process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
      } else {
        process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET = previousSubscriptionSecret;
      }
    }
  });

  it('returns a non-2xx response on processing errors so Stripe retries entitlement writes', () => {
    expect(routeSource).toMatch(
      /catch\s*\(\s*error\s*\)\s*\{[\s\S]{0,300}return\s+res\.status\(500\)/,
    );
  });
});
