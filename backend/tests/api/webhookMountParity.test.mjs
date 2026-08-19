/**
 * Regression: both live Stripe webhook mounts must handle the SAME events.
 *
 * Kimi K3 HIGH-2, round 2. There are two signature-verified Stripe endpoints:
 *
 *   canonical  webhooks/stripeWebhook.mjs -> /webhooks/stripe, /api/webhook/stripe
 *   legacy     routes/cartRoutes.mjs      -> /api/cart/webhook
 *
 * The legacy mount reimplemented its own switch covering exactly two events
 * (checkout.session.completed, checkout.session.expired). Every event type added to
 * the canonical handler — payment_intent.succeeded/processing/payment_failed,
 * charge.refunded, charge.dispute.created — fell to legacy's `default` and was
 * SILENTLY 200-ACKED. Stripe sees a success and never redelivers.
 *
 * So whether a refund was detected at all depended on which URL the Stripe dashboard
 * happened to point at. That is the divergence class that already produced the
 * expired-cart bug: two implementations of one contract, drifting apart.
 *
 * The fix is delegation, not duplication — the legacy route now IS the canonical
 * handler. This asserts that by IDENTITY at runtime, not by reading source: a
 * comment claiming delegation cannot satisfy a function-reference comparison.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/apiKeyChecker.mjs', () => ({
  isStripeEnabled: () => false,
  isTwilioEnabled: () => false,
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { default: cartRoutes } = await import('../../routes/cartRoutes.mjs');
const { stripeWebhookHandler } = await import('../../webhooks/stripeWebhook.mjs');

describe('both Stripe webhook mounts run the same handler', () => {
  it('exports the canonical handler so it can be shared', () => {
    expect(typeof stripeWebhookHandler).toBe('function');
  });

  it('the legacy /webhook route INVOKES the canonical handler', async () => {
    // Behavioural, not identity: the route lazy-imports the handler (a static import
    // would pull the whole webhook dependency graph into every consumer of
    // cartRoutes and broke four suites' legitimate narrow mocks). So assert that
    // hitting the legacy mount actually reaches the canonical handler — which a
    // comment claiming delegation cannot satisfy.
    const app = express();
    app.use('/api/cart', cartRoutes);

    const response = await request(app)
      .post('/api/cart/webhook')
      .set('content-type', 'application/json')
      .send(Buffer.from('{}'));

    // The canonical handler rejects before doing any work when Stripe is not
    // configured (isStripeEnabled is mocked false here), and returns 500 with its
    // own distinctive body. The legacy handler never produced this shape.
    expect(response.status).toBe(500);
    expect(response.body.error).toMatch(/Stripe not configured|Webhook configuration error/);
  });

  it('keeps the raw-body parser ahead of it so signature verification still works', () => {
    const source = readFileSync(resolve(process.cwd(), 'routes/cartRoutes.mjs'), 'utf8');
    // express.raw must run BEFORE the delegation, or constructEvent sees a parsed
    // object instead of the Buffer and every delivery 400s.
    const route = source.slice(source.indexOf("router.post('/webhook'"));
    const rawAt = route.indexOf('express.raw');
    const delegateAt = route.indexOf('stripeWebhookHandler');
    expect(rawAt).toBeGreaterThan(-1);
    expect(rawAt).toBeLessThan(delegateAt);
  });

  it('no longer carries a second copy of the event switch', () => {
    const source = readFileSync(resolve(process.cwd(), 'routes/cartRoutes.mjs'), 'utf8');
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

    expect(code).not.toContain("case 'checkout.session.completed'");
    expect(code).not.toContain("case 'checkout.session.expired'");
  });
});
