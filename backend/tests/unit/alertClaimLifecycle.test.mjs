/**
 * SWA-138 S4b — alert claim ("who is handling this").
 * Read/archive are per-admin; a CLAIM is deliberately cross-admin, because its
 * entire job is stopping two admins from working the same item.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 42, role: 'admin', email: 'a@example.test' }; next(); },
  adminOnly: (_req, _res, next) => next(),
}));
vi.mock('../../models/NotificationReadState.mjs', () => ({
  default: { findAll: vi.fn(), findOne: vi.fn(), findOrCreate: vi.fn(), update: vi.fn() },
  ALERT_REF_TYPES: ['contact', 'finance', 'admin_notification', 'post_report'],
}));

const { default: NotificationReadState } = await import('../../models/NotificationReadState.mjs');
const { default: alertStateRoutes } = await import('../../routes/adminAlertStateRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin', alertStateRoutes);

describe('GET /alert-state/claims', () => {
  beforeEach(() => {
    NotificationReadState.findAll.mockReset().mockResolvedValue([
      { adminId: 42, refType: 'finance', refId: 'fin_1', claimedAt: '2026-08-06T00:00:00Z' },
      { adminId: 99, refType: 'contact', refId: '7', claimedAt: '2026-08-06T01:00:00Z' },
    ]);
  });

  it('is CROSS-admin by design and marks which claims are mine', async () => {
    const res = await request(app).get('/api/admin/alert-state/claims');
    expect(res.status).toBe(200);
    // Not scoped to adminId — that is the point of a claim.
    expect(NotificationReadState.findAll.mock.calls[0][0].where).not.toHaveProperty('adminId');
    expect(res.body.claims).toHaveLength(2);
    expect(res.body.claims.find((c) => c.adminId === 42).mine).toBe(true);
    expect(res.body.claims.find((c) => c.adminId === 99).mine).toBe(false);
  });

  it('exposes only ref + claimant id — never contact details (Rule 8)', async () => {
    const res = await request(app).get('/api/admin/alert-state/claims');
    const attrs = NotificationReadState.findAll.mock.calls[0][0].attributes;
    expect(attrs).toEqual(['adminId', 'refType', 'refId', 'claimedAt']);
    expect(JSON.stringify(res.body)).not.toMatch(/@|email|name/i);
  });
});

describe('POST /alert-state/claim', () => {
  beforeEach(() => {
    NotificationReadState.findOne.mockReset();
    NotificationReadState.findOrCreate.mockReset();
    NotificationReadState.update.mockReset();
  });

  it('rejects an unknown refType before touching the database', async () => {
    const res = await request(app)
      .post('/api/admin/alert-state/claim')
      .send({ refType: 'grimoire', refId: '1' });
    expect(res.status).toBe(400);
    expect(NotificationReadState.findOne).not.toHaveBeenCalled();
  });

  it('claims an unheld alert for the acting admin', async () => {
    NotificationReadState.findOne.mockResolvedValue(null);
    NotificationReadState.findOrCreate.mockResolvedValue([
      { claimedAt: '2026-08-06T02:00:00Z', update: vi.fn() }, true,
    ]);
    const res = await request(app)
      .post('/api/admin/alert-state/claim')
      .send({ refType: 'finance', refId: 'fin_9' });
    expect(res.status).toBe(200);
    expect(res.body.claim).toMatchObject({ refType: 'finance', refId: 'fin_9', adminId: 42 });
  });

  it('409s with the holder when another admin already claimed it (first-writer-wins)', async () => {
    NotificationReadState.findOne.mockResolvedValue({ adminId: 99, claimedAt: '2026-08-06T01:00:00Z' });
    const res = await request(app)
      .post('/api/admin/alert-state/claim')
      .send({ refType: 'contact', refId: '7' });
    expect(res.status).toBe(409);
    expect(res.body.claim.adminId).toBe(99);
    expect(NotificationReadState.findOrCreate).not.toHaveBeenCalled();
  });

  it('re-claiming my own alert is not a conflict', async () => {
    NotificationReadState.findOne.mockResolvedValue({ adminId: 42, claimedAt: '2026-08-06T01:00:00Z' });
    NotificationReadState.findOrCreate.mockResolvedValue([
      { claimedAt: '2026-08-06T01:00:00Z', update: vi.fn() }, false,
    ]);
    const res = await request(app)
      .post('/api/admin/alert-state/claim')
      .send({ refType: 'contact', refId: '7' });
    expect(res.status).toBe(200);
  });

  it('release clears ONLY the acting admin own claim', async () => {
    NotificationReadState.update.mockResolvedValue([1]);
    const res = await request(app)
      .post('/api/admin/alert-state/claim')
      .send({ refType: 'contact', refId: '7', release: true });
    expect(res.status).toBe(200);
    expect(res.body.released).toBe(true);
    const where = NotificationReadState.update.mock.calls[0][1].where;
    expect(where.adminId).toBe(42);
  });
});
