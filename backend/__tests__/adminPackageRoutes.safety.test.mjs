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
  default: { info: vi.fn(), error: vi.fn() },
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
});
