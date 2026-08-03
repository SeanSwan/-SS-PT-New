/**
 * Money-path rate limits (Lane 4 launch audit, 2026-08-03)
 * ========================================================
 * Before this slice NO endpoint on the revenue path carried a limiter — not
 * cart add/update/remove/clear, not create-checkout-session (which mints a real
 * Stripe object per call). The public contact form was capped; the endpoints
 * that cost money were not.
 *
 * Behavioural half: the limiter actually throttles, and keys per authenticated
 * user so clients behind one shared gym IP don't share a quota.
 * Wiring half: the limiters are attached to the real money routes.
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  cartMutationLimiter,
  checkoutSessionLimiter,
  paymentVerifyLimiter,
} from '../../middleware/moneyPathRateLimits.mjs';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readSource = (rel) => fs.readFileSync(path.join(backendRoot, rel), 'utf8');

/** Minimal app that fakes an authenticated user, mirroring `protect` running first. */
const buildApp = (limiter, userIdHeader = 'x-test-user') => {
  const app = express();
  app.set('trust proxy', 1);
  app.use((req, _res, next) => {
    const id = req.headers[userIdHeader];
    if (id) req.user = { id: Number(id) };
    next();
  });
  app.post('/probe', limiter, (_req, res) => res.status(200).json({ ok: true }));
  return app;
};

describe('money-path rate limits — behaviour', () => {
  it('throttles checkout-session creation once the ceiling is crossed', async () => {
    const app = buildApp(checkoutSessionLimiter);
    const agent = request(app);

    for (let i = 0; i < 20; i += 1) {
      const res = await agent.post('/probe').set('x-test-user', '9001');
      expect(res.status).toBe(200);
    }

    const blocked = await agent.post('/probe').set('x-test-user', '9001');
    expect(blocked.status).toBe(429);
  });

  it('gives a throttled buyer a recoverable message on BOTH keys the UI reads', async () => {
    const app = buildApp(checkoutSessionLimiter);
    const agent = request(app);
    for (let i = 0; i < 20; i += 1) await agent.post('/probe').set('x-test-user', '9002');

    const blocked = await agent.post('/probe').set('x-test-user', '9002');
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/try again/i);
    expect(blocked.body.error).toBe(blocked.body.message);
    expect(blocked.body.success).toBe(false);
  });

  it('keys per user — one throttled buyer does not block another on the same IP', async () => {
    const app = buildApp(checkoutSessionLimiter);
    const agent = request(app);
    for (let i = 0; i < 21; i += 1) await agent.post('/probe').set('x-test-user', '9003');

    const neighbour = await agent.post('/probe').set('x-test-user', '9004');
    expect(neighbour.status).toBe(200);
  });

  it('cart mutations are capped well above real shopping behaviour', async () => {
    const app = buildApp(cartMutationLimiter);
    const agent = request(app);

    // 40 mutations is a heavy but legitimate session — must not be blocked.
    for (let i = 0; i < 40; i += 1) {
      const res = await agent.post('/probe').set('x-test-user', '9005');
      expect(res.status).toBe(200);
    }
  });

  it('falls back to IP keying for unauthenticated callers', async () => {
    const app = buildApp(paymentVerifyLimiter);
    const agent = request(app);
    const res = await agent.post('/probe');
    expect(res.status).toBe(200);
  });
});

describe('money-path rate limits — wiring', () => {
  const cartSource = readSource('routes/cartRoutes.mjs');
  const v2Source = readSource('routes/v2PaymentRoutes.mjs');

  it.each([
    ["router.post('/add'", cartSource],
    ["router.put('/update/:itemId'", cartSource],
    ["router.delete('/remove/:itemId'", cartSource],
    ["router.delete('/clear'", cartSource],
  ])('cart mutation %s carries cartMutationLimiter', (routePrefix, source) => {
    const line = source.split('\n').find((l) => l.includes(routePrefix));
    expect(line, `route not found: ${routePrefix}`).toBeTruthy();
    expect(line).toContain('cartMutationLimiter');
  });

  it('GET /api/cart stays UNlimited — throttling a read would show a buyer an empty cart', () => {
    const line = cartSource.split('\n').find((l) => l.includes("router.get('/',"));
    expect(line).toBeTruthy();
    expect(line).not.toContain('Limiter');
  });

  it('create-checkout-session carries checkoutSessionLimiter', () => {
    const line = v2Source.split('\n').find((l) => l.includes("router.post('/create-checkout-session'"));
    expect(line).toContain('checkoutSessionLimiter');
  });

  it('verify-session and activation-status carry paymentVerifyLimiter', () => {
    const lines = v2Source.split('\n');
    expect(lines.find((l) => l.includes("router.post('/verify-session'"))).toContain('paymentVerifyLimiter');
    expect(lines.find((l) => l.includes("router.get('/activation-status'"))).toContain('paymentVerifyLimiter');
  });

  it('the Stripe webhook is NOT rate limited — Stripe retries by design', () => {
    const webhookSource = readSource('webhooks/stripeWebhook.mjs');
    expect(webhookSource).not.toContain('moneyPathRateLimits');
    const cartWebhookLine = cartSource.split('\n').find((l) => l.includes("router.post('/webhook'"));
    if (cartWebhookLine) expect(cartWebhookLine).not.toContain('Limiter');
  });
});
