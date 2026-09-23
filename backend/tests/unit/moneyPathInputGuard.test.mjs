import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { moneyPathInputGuard } from '../../middleware/moneyPathInputGuard.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readSrc = (p) => readFileSync(join(__dirname, '../..', p), 'utf8');

/**
 * H-14 slice: the money-path input boundary. The contract these tests pin is
 * deliberately conservative — valid input is passed through BYTE-IDENTICAL
 * (no coercion, no key stripping), so no existing handler or response shape
 * can change. Only shapes no legitimate client produces are rejected.
 */
function buildApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.post('/probe', moneyPathInputGuard('probe'), (req, res) => {
    res.json({ ok: true, body: req.body });
  });
  return app;
}

const app = buildApp();

describe('moneyPathInputGuard (H-14 slice)', () => {
  it('passes a valid checkout body through unchanged, unknown keys included', async () => {
    const body = {
      cartId: 42,
      customerInfo: { name: 'Sean', email: 'sean@example.com', phone: '+1 555 0100' },
      fulfillmentIntent: 'self_ship',
      utmSource: 'instagram',
      metadata: { utmMedium: 'social' },
      futureFieldThisGuardMustNotDrop: { nested: true },
    };
    const res = await request(app).post('/probe').send(body);
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual(body);
  });

  it('passes a minimal body (cartId only)', async () => {
    const res = await request(app).post('/probe').send({ cartId: 7 });
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ cartId: 7 });
  });

  it('rejects an array body', async () => {
    const res = await request(app).post('/probe').send([1, 2, 3]);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_BODY');
  });

  it('rejects a non-object body (direct unit — express.json already refuses raw strings)', async () => {
    // Through HTTP, express.json's strict mode rejects a top-level JSON string
    // before any middleware runs. The guard's own branch is exercised directly.
    const mw = moneyPathInputGuard('unit-probe');
    const req = { body: 'just-a-string' };
    const res = {
      code: null,
      payload: null,
      status(c) { this.code = c; return this; },
      json(p) { this.payload = p; return this; },
    };
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(res.code).toBe(400);
    expect(res.payload.error.code).toBe('INVALID_BODY');
    expect(res.payload.error.endpoint).toBe('unit-probe');
  });

  it('rejects an oversized string field with the offending path', async () => {
    const res = await request(app).post('/probe').send({ cartId: 1, note: 'x'.repeat(5000) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_BODY');
    expect(res.body.error.reason).toBe('field_too_long');
    expect(res.body.error.path).toContain('note');
  });

  it('rejects prototype-pollution keys', async () => {
    const res = await request(app)
      .post('/probe')
      .set('Content-Type', 'application/json')
      .send('{"cartId":1,"__proto__":{"polluted":true}}');
    expect(res.status).toBe(400);
    expect(res.body.error.reason).toBe('forbidden_key');
  });

  it('rejects a body over the serialized-size cap with 413', async () => {
    const many = Array.from({ length: 300 }, (_, i) => ({ i, blob: 'y'.repeat(300) }));
    const res = await request(app).post('/probe').send({ cartId: 1, items: many });
    expect([413, 400]).toContain(res.status); // 413 for size, 400 if array cap hits first
  });

  it('rejects absurd nesting depth', async () => {
    let nested = { leaf: 1 };
    for (let i = 0; i < 12; i += 1) nested = { child: nested };
    const res = await request(app).post('/probe').send({ cartId: 1, nested });
    expect(res.status).toBe(400);
    expect(res.body.error.reason).toBe('nesting_too_deep');
  });
});

describe('money-path guard wiring (H-14 slice)', () => {
  const wired = [
    ['routes/v2PaymentRoutes.mjs', "moneyPathInputGuard('create-checkout-session')"],
    ['routes/v2PaymentRoutes.mjs', "moneyPathInputGuard('verify-session')"],
    ['routes/cartRoutes.mjs', "moneyPathInputGuard('cart-add')"],
    ['routes/galleryRoutes.mjs', "moneyPathInputGuard('gallery-vip-checkout')"],
  ];

  it.each(wired)('%s wires %s', (path, needle) => {
    const src = readSrc(path);
    expect(src).toContain("from '../middleware/moneyPathInputGuard.mjs'");
    expect(src).toContain(needle);
  });

  it('keeps the guard AFTER auth/stripe middleware so their responses win', () => {
    const src = readSrc('routes/v2PaymentRoutes.mjs');
    const stripeIdx = src.indexOf("checkStripeAvailability, moneyPathInputGuard('create-checkout-session')");
    expect(stripeIdx).toBeGreaterThan(-1);
    const cartSrc = readSrc('routes/cartRoutes.mjs');
    expect(cartSrc.indexOf("validatePurchaseRole, moneyPathInputGuard('cart-add')")).toBeGreaterThan(-1);
  });
});
