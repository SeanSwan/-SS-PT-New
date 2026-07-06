/**
 * adminMarketingCampaignRoutes RBAC + CRUD contract tests.
 * Locks: admin-only access (non-admin → 403), field whitelisting (id/createdBy/timestamps
 * never accepted from the body — createdBy comes from the auth user), enum validation
 * (400 before any DB write), 404s, and soft-delete via destroy. Supertest + model mocks;
 * no DB.
 */
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { findAll, findByPk, create } = vi.hoisted(() => ({
  findAll: vi.fn(),
  findByPk: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../models/MarketingCampaign.mjs', () => ({
  default: { findAll, findByPk, create },
  OBJECTIVES: ['lead_generation', 'booking_assessments', 'newsletter_growth', 'local_seo', 'product_sale', 'retention'],
  STATUSES: ['draft', 'active', 'paused', 'completed', 'archived'],
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: Number(req.get('x-test-user-id') || 1), role: req.get('x-test-role') || 'admin' };
    next();
  },
  adminOnly: (req, res, next) => (
    req.user?.role === 'admin' ? next() : res.status(403).json({ success: false, error: 'Forbidden' })
  ),
}));

vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { default: campaignRoutes } = await import('../routes/adminMarketingCampaignRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin/marketing-campaigns', campaignRoutes);

describe('adminMarketingCampaignRoutes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a non-admin with 403 and never queries', async () => {
    const res = await request(app).get('/api/admin/marketing-campaigns').set('x-test-role', 'client');
    expect(res.status).toBe(403);
    expect(findAll).not.toHaveBeenCalled();
  });

  it('lists campaigns for an admin', async () => {
    findAll.mockResolvedValue([{ id: 'c1', name: 'Q3' }]);
    const res = await request(app).get('/api/admin/marketing-campaigns').set('x-test-role', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('creates a campaign, stamping createdBy from the authenticated user', async () => {
    create.mockImplementation(async (d) => ({ id: 'new', ...d }));
    const res = await request(app)
      .post('/api/admin/marketing-campaigns')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', '7')
      .send({ name: 'Fall Launch', objective: 'booking_assessments' });
    expect(res.status).toBe(201);
    const arg = create.mock.calls[0][0];
    expect(arg.name).toBe('Fall Launch');
    expect(arg.objective).toBe('booking_assessments');
    expect(arg.createdBy).toBe(7);
  });

  it('rejects create with a missing name (400) before touching the DB', async () => {
    const res = await request(app)
      .post('/api/admin/marketing-campaigns')
      .set('x-test-role', 'admin')
      .send({ objective: 'lead_generation' });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects create with an invalid objective (400)', async () => {
    const res = await request(app)
      .post('/api/admin/marketing-campaigns')
      .set('x-test-role', 'admin')
      .send({ name: 'X', objective: 'world_domination' });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('ignores non-whitelisted fields — no id/createdBy/deletedAt injection from the body', async () => {
    create.mockImplementation(async (d) => ({ id: 'gen', ...d }));
    const res = await request(app)
      .post('/api/admin/marketing-campaigns')
      .set('x-test-role', 'admin')
      .send({ name: 'Safe', id: 'attacker-id', deletedAt: '2020-01-01', createdBy: 999 });
    expect(res.status).toBe(201);
    const arg = create.mock.calls[0][0];
    expect(arg.id).toBeUndefined();
    expect(arg.deletedAt).toBeUndefined();
    expect(arg.createdBy).toBe(1); // from auth (default admin id 1), NOT the body's 999
  });

  it('returns 404 when updating a missing campaign', async () => {
    findByPk.mockResolvedValue(null);
    const res = await request(app)
      .put('/api/admin/marketing-campaigns/nope')
      .set('x-test-role', 'admin')
      .send({ status: 'active' });
    expect(res.status).toBe(404);
  });

  it('soft-deletes (archives) a campaign via destroy', async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    findByPk.mockResolvedValue({ id: 'c1', destroy });
    const res = await request(app).delete('/api/admin/marketing-campaigns/c1').set('x-test-role', 'admin');
    expect(res.status).toBe(200);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
