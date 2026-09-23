import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  storefrontFindAll,
  storefrontFindByPk,
  storefrontCreate,
} = vi.hoisted(() => ({
  storefrontFindAll: vi.fn(),
  storefrontFindByPk: vi.fn(),
  storefrontCreate: vi.fn(),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 1, role: req.headers['x-test-role'] || 'admin' };
    next();
  },
  // Mirrors the real adminOnly: 403 unless role is admin (protect runs first).
  adminOnly: (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Admin access required' });
  },
  ownerAdminOnly: (_req, _res, next) => next(),
  rateLimiter: () => (_req, _res, next) => next(),
}));

vi.mock('../models/index.mjs', () => ({
  getAllModels: () => ({
    StorefrontItem: {
      rawAttributes: { id: {}, name: {}, price: {}, displayOrder: {} },
      findAll: storefrontFindAll,
      findByPk: storefrontFindByPk,
      create: storefrontCreate,
    },
  }),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const { default: adminPackageRoutes } = await import('../routes/adminPackageRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin/storefront', adminPackageRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROUTE_SOURCE = readFileSync(resolve(__dirname, '../routes/adminPackageRoutes.mjs'), 'utf8');

describe('admin package route safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storefrontFindAll.mockResolvedValue([]);
    storefrontFindByPk.mockResolvedValue(null);
    storefrontCreate.mockResolvedValue({ id: 1, name: 'Package' });
  });

  it('rejects malformed pagination before querying packages', async () => {
    const res = await request(app).get('/api/admin/storefront?limit=10abc');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Limit and offset must be integers; limit cannot exceed 300');
    expect(storefrontFindAll).not.toHaveBeenCalled();
  });

  it('rejects malformed package IDs before model lookup', async () => {
    const getRes = await request(app).get('/api/admin/storefront/12abc');
    const putRes = await request(app).put('/api/admin/storefront/12abc').send({ name: 'Updated' });
    const deleteRes = await request(app).delete('/api/admin/storefront/12abc');

    expect(getRes.status).toBe(400);
    expect(putRes.status).toBe(400);
    expect(deleteRes.status).toBe(400);
    expect(storefrontFindByPk).not.toHaveBeenCalled();
  });

  it('does not expose raw package route operational errors', async () => {
    storefrontFindAll.mockRejectedValue(new Error('database hostname leaked'));

    const res = await request(app).get('/api/admin/storefront');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Server error while retrieving storefront items',
      error: 'internal_error',
    });
    expect(JSON.stringify(res.body)).not.toContain('hostname leaked');
  });

  it('keeps source free of development-only error disclosure', () => {
    expect(ROUTE_SOURCE).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(ROUTE_SOURCE).not.toContain("process.env.NODE_ENV === 'development' ? error.message");
  });

  // D-02 regression: req.body must never reach the model raw — the Stripe
  // binding fields (stripeProductId/stripePriceId) and hook-computed totalCost
  // are exactly what the allowlist exists to drop.
  it('strips non-allowlisted fields from package creation (D-02)', async () => {
    const res = await request(app)
      .post('/api/admin/storefront')
      .send({
        name: 'Ten Pack',
        packageType: 'fixed',
        pricePerSession: 80,
        stripeProductId: 'prod_EVIL',
        stripePriceId: 'price_EVIL',
        totalCost: 0.01,
        id: 99999,
      });

    expect(res.status).toBe(201);
    expect(storefrontCreate).toHaveBeenCalledTimes(1);
    const payload = storefrontCreate.mock.calls[0][0];
    expect(payload).toMatchObject({ name: 'Ten Pack', packageType: 'fixed', pricePerSession: 80 });
    expect(payload).not.toHaveProperty('stripeProductId');
    expect(payload).not.toHaveProperty('stripePriceId');
    expect(payload).not.toHaveProperty('totalCost');
    expect(payload).not.toHaveProperty('id');
  });

  it('strips non-allowlisted fields from package update (D-02)', async () => {
    const update = vi.fn().mockResolvedValue(true);
    storefrontFindByPk.mockResolvedValue({ id: 5, name: 'Existing', update });

    const res = await request(app)
      .put('/api/admin/storefront/5')
      .send({ name: 'Renamed', stripePriceId: 'price_EVIL', displayOrder: 3 });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    const payload = update.mock.calls[0][0];
    expect(payload).toEqual({ name: 'Renamed', displayOrder: 3 });
  });
});
