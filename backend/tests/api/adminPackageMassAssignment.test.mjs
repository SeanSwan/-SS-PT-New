/**
 * Regression: the admin package create/update handlers must NOT mass-assign
 * request-body fields that a client should never control.
 *
 * Found 2026-08-04 (security + schema hostile-review loop): both handlers passed
 * `req.body` straight into `StorefrontItem.create(...)` / `item.update(...)`. The
 * router is admin-only, so this is not remotely exploitable by a normal user — but
 * it lets a compromised or mistaken admin request:
 *   - spoof the primary key (`id`) on create,
 *   - overwrite Sequelize-managed timestamps, and
 *   - silently repoint the Stripe linkage (`stripeProductId` / `stripePriceId`) so a
 *     package charges through a different Stripe product — a billing-integrity bug.
 * Mass-assignment of payment-provider identifiers from a raw body is the specific
 * risk this test locks out. These IDs are owned by the Stripe sync path, not manual
 * edits through this endpoint.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  storefrontItem: { create: vi.fn(), findByPk: vi.fn() },
  productVariant: { findByPk: vi.fn() },
  loggerInfo: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    StorefrontItem: mocks.storefrontItem,
    ProductVariant: mocks.productVariant,
  }),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: mocks.loggerInfo, warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../services/photoStorageService.mjs', () => ({ uploadPhoto: vi.fn() }));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 4242, role: 'admin', email: 'admin@example.test' };
    next();
  },
  rateLimiter: () => (_req, _res, next) => next(),
}));

const adminPackageRoutes = (await import('../../routes/adminPackageRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/packages', adminPackageRoutes);
  return app;
}

const PROTECTED = ['id', 'createdAt', 'updatedAt', 'stripeProductId', 'stripePriceId'];

describe('admin package handlers reject mass-assignment of protected fields', () => {
  beforeEach(() => vi.clearAllMocks());

  it('CREATE strips id, timestamps and Stripe linkage from the body', async () => {
    mocks.storefrontItem.create.mockResolvedValue({ id: 77, name: 'New Pack' });

    const res = await request(makeApp())
      .post('/api/admin/packages')
      .send({
        name: 'New Pack', packageType: 'fixed', pricePerSession: 175, totalCost: 1750,
        id: 999, stripeProductId: 'prod_EVIL', stripePriceId: 'price_EVIL',
        createdAt: '1999-01-01T00:00:00Z',
      });

    expect(res.status).toBe(201);
    expect(mocks.storefrontItem.create).toHaveBeenCalledTimes(1);
    const payload = mocks.storefrontItem.create.mock.calls[0][0];
    for (const field of PROTECTED) {
      expect(payload, `create payload must not carry ${field}`).not.toHaveProperty(field);
    }
    // A legitimate field still comes through.
    expect(payload).toHaveProperty('name', 'New Pack');
  });

  it('UPDATE strips id, timestamps and Stripe linkage from the body', async () => {
    const update = vi.fn(async () => {});
    mocks.storefrontItem.findByPk.mockResolvedValue({ id: 77, name: 'Existing', update });

    const res = await request(makeApp())
      .put('/api/admin/packages/77')
      .send({
        pricePerSession: 200,
        id: 1, stripeProductId: 'prod_HIJACK', stripePriceId: 'price_HIJACK',
        updatedAt: '1999-01-01T00:00:00Z',
      });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    const payload = update.mock.calls[0][0];
    for (const field of PROTECTED) {
      expect(payload, `update payload must not carry ${field}`).not.toHaveProperty(field);
    }
    expect(payload).toHaveProperty('pricePerSession', 200);
  });

  it('CREATE does not let a __proto__ key pollute the prototype', async () => {
    mocks.storefrontItem.create.mockResolvedValue({ id: 78, name: 'P' });

    const res = await request(makeApp())
      .post('/api/admin/packages')
      .set('content-type', 'application/json')
      // Raw JSON so the __proto__ key survives to the handler as an own property.
      .send('{"name":"P","packageType":"fixed","pricePerSession":175,"totalCost":1750,"__proto__":{"polluted":true}}');

    expect(res.status).toBe(201);
    // The global Object prototype must not have been touched.
    expect({}.polluted).toBeUndefined();
    const payload = mocks.storefrontItem.create.mock.calls[0][0];
    expect(Object.getPrototypeOf(payload)).toBe(Object.prototype);
    expect(payload).not.toHaveProperty('polluted');
  });
});
