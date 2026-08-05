/**
 * SWA-138 S4 — per-admin alert read-state API contract.
 * Locks: admin-scoping (IDOR guard), ack/archive upsert semantics,
 * first-ack preservation, bulk validation + cap, stub retirement.
 */
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 42, role: 'admin', email: 'admin@example.test' }; next(); },
  adminOnly: (_req, _res, next) => next(),
}));
vi.mock('../../models/NotificationReadState.mjs', () => ({
  default: {
    findAll: vi.fn(),
    findOrCreate: vi.fn(),
  },
  ALERT_REF_TYPES: ['contact', 'finance', 'admin_notification', 'post_report'],
}));

const { default: NotificationReadState } = await import('../../models/NotificationReadState.mjs');
const { default: alertStateRoutes } = await import('../../routes/adminAlertStateRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin', alertStateRoutes);

const freshRow = (overrides = {}) => ({
  readAt: null,
  archivedAt: null,
  update: vi.fn(async function updateImpl(vals) { Object.assign(this, vals); return this; }),
  ...overrides,
});

describe('alert-state API (SWA-138 S4)', () => {
  beforeEach(() => {
    NotificationReadState.findAll.mockReset().mockResolvedValue([]);
    NotificationReadState.findOrCreate.mockReset();
  });

  it('GET /alert-state is scoped to the ACTING admin only (IDOR guard)', async () => {
    const res = await request(app).get('/api/admin/alert-state');
    expect(res.status).toBe(200);
    expect(NotificationReadState.findAll.mock.calls[0][0].where).toEqual({ adminId: 42 });
  });

  it('ack rejects an unknown refType with 400', async () => {
    const res = await request(app)
      .post('/api/admin/alert-state/ack')
      .send({ refType: 'grimoire', refId: '1' });
    expect(res.status).toBe(400);
    expect(NotificationReadState.findOrCreate).not.toHaveBeenCalled();
  });

  it('ack upserts under the acting admin and stamps readAt', async () => {
    const row = freshRow();
    NotificationReadState.findOrCreate.mockResolvedValue([row, true]);
    const res = await request(app)
      .post('/api/admin/alert-state/ack')
      .send({ refType: 'finance', refId: 'fin_milestone_x' });
    expect(res.status).toBe(200);
    expect(NotificationReadState.findOrCreate.mock.calls[0][0].where).toEqual({
      adminId: 42, refType: 'finance', refId: 'fin_milestone_x',
    });
  });

  it('ack preserves the FIRST readAt (idempotent)', async () => {
    const row = freshRow({ readAt: '2026-08-01T00:00:00.000Z' });
    NotificationReadState.findOrCreate.mockResolvedValue([row, false]);
    const res = await request(app)
      .post('/api/admin/alert-state/ack')
      .send({ refType: 'contact', refId: 7 });
    expect(res.status).toBe(200);
    expect(row.update).not.toHaveBeenCalled();
  });

  it('archive stamps archivedAt without touching readAt', async () => {
    const row = freshRow({ readAt: '2026-08-01T00:00:00.000Z' });
    NotificationReadState.findOrCreate.mockResolvedValue([row, false]);
    const res = await request(app)
      .post('/api/admin/alert-state/archive')
      .send({ refType: 'finance', refId: 'fin_1' });
    expect(res.status).toBe(200);
    expect(row.update).toHaveBeenCalledTimes(1);
    expect(Object.keys(row.update.mock.calls[0][0])).toEqual(['archivedAt']);
  });

  it('bulk validates the op and caps at 100 items', async () => {
    const tooMany = Array.from({ length: 101 }, (_, i) => ({ refType: 'finance', refId: String(i) }));
    const bad = await request(app).post('/api/admin/alert-state/bulk').send({ op: 'ack', items: tooMany });
    expect(bad.status).toBe(400);
    const wrongOp = await request(app).post('/api/admin/alert-state/bulk').send({ op: 'delete', items: [{ refType: 'finance', refId: '1' }] });
    expect(wrongOp.status).toBe(400);
  });

  it('bulk ack processes every valid item for the acting admin', async () => {
    NotificationReadState.findOrCreate.mockImplementation(async () => [freshRow(), true]);
    const res = await request(app).post('/api/admin/alert-state/bulk').send({
      op: 'ack',
      items: [{ refType: 'finance', refId: 'a' }, { refType: 'contact', refId: 9 }],
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, op: 'ack', processed: 2 });
    expect(NotificationReadState.findOrCreate).toHaveBeenCalledTimes(2);
    expect(NotificationReadState.findOrCreate.mock.calls.every((c) => c[0].where.adminId === 42)).toBe(true);
  });
});

describe('501 stub retirement (SWA-138 S4)', () => {
  it('the abandoned /alerts/active + acknowledge stubs are gone from adminEnterpriseRoutes', () => {
    const source = readFileSync(
      resolvePath(process.cwd(), 'routes/adminEnterpriseRoutes.mjs'),
      'utf8',
    );
    expect(source).not.toContain("router.get('/alerts/active'");
    expect(source).not.toContain("router.post('/alerts/:alertId/acknowledge'");
    expect(source).not.toContain('getActiveSystemAlerts');
    expect(source).toContain('adminAlertStateRoutes.mjs');
  });

  it('the new alert-state routes are mounted in core/routes.mjs', () => {
    const core = readFileSync(resolvePath(process.cwd(), 'core/routes.mjs'), 'utf8');
    expect(core).toContain("import adminAlertStateRoutes from '../routes/adminAlertStateRoutes.mjs'");
    expect(core).toContain("app.use('/api/admin', adminAlertStateRoutes)");
  });
});
