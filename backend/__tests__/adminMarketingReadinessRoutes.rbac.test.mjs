/**
 * adminMarketingReadinessRoutes RBAC + wiring tests.
 * Locks: the readiness cockpit endpoint is admin-only (non-admin → 403) and,
 * for an admin, returns the aggregated readiness payload. Supertest + mocks only.
 */
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getReadiness } = vi.hoisted(() => ({ getReadiness: vi.fn() }));

vi.mock('../services/marketingReadinessService.mjs', () => ({
  getMarketingReadiness: getReadiness,
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.get('x-test-user-id') || 1),
      role: req.get('x-test-role') || 'admin',
      username: 'route-test-user',
    };
    next();
  },
  adminOnly: (req, res, next) => (
    req.user?.role === 'admin'
      ? next()
      : res.status(403).json({ success: false, error: 'Forbidden' })
  ),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { default: readinessRoutes } = await import('../routes/adminMarketingReadinessRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin/marketing-readiness', readinessRoutes);

describe('adminMarketingReadinessRoutes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns aggregated readiness for an admin', async () => {
    getReadiness.mockResolvedValue({ overall: 'ready', subsystems: {} });
    const res = await request(app)
      .get('/api/admin/marketing-readiness')
      .set('x-test-role', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overall).toBe('ready');
    expect(getReadiness).toHaveBeenCalledTimes(1);
  });

  it('rejects a non-admin with 403 and does not run the aggregation', async () => {
    const res = await request(app)
      .get('/api/admin/marketing-readiness')
      .set('x-test-role', 'client');
    expect(res.status).toBe(403);
    expect(getReadiness).not.toHaveBeenCalled();
  });

  it('returns 500 (not a crash) when the aggregation throws', async () => {
    getReadiness.mockRejectedValue(new Error('boom'));
    const res = await request(app)
      .get('/api/admin/marketing-readiness')
      .set('x-test-role', 'admin');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
