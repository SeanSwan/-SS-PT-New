/**
 * leadRoutes list-filter tests (Lead Command Center, LCC-1).
 * Locks the server-side work-queue filters on GET /api/leads: hot (score>=70, not
 * closed), followupsDue (nextFollowUpAt<=now, not closed), explicit-status precedence,
 * the plain-list default, and trainer RBAC scoping. Supertest + model mock; no DB.
 */
import express from 'express';
import request from 'supertest';
import { Op } from 'sequelize';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { findAndCountAll } = vi.hoisted(() => ({ findAndCountAll: vi.fn() }));

vi.mock('../models/Lead.mjs', () => ({ default: { findAndCountAll, count: vi.fn(), findAll: vi.fn() } }));
vi.mock('../models/LeadActivity.mjs', () => ({ default: {} }));
vi.mock('../services/leadCaptureShared.mjs', () => ({ aggregateLeadChannels: () => [] }));
vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: Number(req.get('x-uid') || 1), role: req.get('x-role') || 'admin' }; next(); },
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { default: leadRoutes } = await import('../routes/leadRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/leads', leadRoutes);

const whereOf = () => findAndCountAll.mock.calls[0][0].where;

describe('leadRoutes list filters (LCC-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
  });

  it('hot=true filters score>=70 and excludes closed leads', async () => {
    await request(app).get('/api/leads?hot=true');
    const where = whereOf();
    expect(where.score[Op.gte]).toBe(70);
    expect(where.status[Op.notIn]).toEqual(['converted', 'lost']);
  });

  it('followupsDue=true filters nextFollowUpAt<=now and excludes closed leads', async () => {
    await request(app).get('/api/leads?followupsDue=true');
    const where = whereOf();
    expect(where.nextFollowUpAt[Op.lte]).toBeInstanceOf(Date);
    expect(where.status[Op.notIn]).toEqual(['converted', 'lost']);
  });

  it('an explicit status wins over the hot/follow-up closed-lead default', async () => {
    await request(app).get('/api/leads?hot=true&status=new');
    const where = whereOf();
    expect(where.status).toBe('new');
    expect(where.score[Op.gte]).toBe(70);
  });

  it('no work-queue filters → no score/follow-up constraints', async () => {
    await request(app).get('/api/leads');
    const where = whereOf();
    expect(where.score).toBeUndefined();
    expect(where.nextFollowUpAt).toBeUndefined();
  });

  it('trainer list is scoped to their assigned leads', async () => {
    await request(app).get('/api/leads?hot=true').set('x-role', 'trainer').set('x-uid', '9');
    expect(whereOf().assignedTrainerId).toBe(9);
  });
});
