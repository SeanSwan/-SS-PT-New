/**
 * marketingUnsubscribeRoutes — public lead-nurture one-click unsubscribe (CAN-SPAM)
 * =================================================================================
 * Verifies: HMAC token is required on both verbs; GET is SIDE-EFFECT-FREE (a confirm
 * page, so email-scanner link pre-fetch can't auto-unsubscribe); POST records the opt-out
 * in the unified email-suppression surface (a Subscriber `unsubscribed` row).
 */
import request from 'supertest';
import express from 'express';
import crypto from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { leadFindByPk, subFindOrCreate } = vi.hoisted(() => ({ leadFindByPk: vi.fn(), subFindOrCreate: vi.fn() }));
vi.mock('../models/Lead.mjs', () => ({ default: { findByPk: leadFindByPk } }));
vi.mock('../models/Subscriber.mjs', () => ({ default: { findOrCreate: subFindOrCreate } }));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

process.env.SWAN_UNSUBSCRIBE_SECRET = 'testsecret';
const { default: marketingUnsubscribeRoutes } = await import('../routes/marketingUnsubscribeRoutes.mjs');

const tokenFor = (leadId) => crypto.createHmac('sha256', 'testsecret').update(`lead:${leadId}`).digest('hex').slice(0, 32);

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use('/api/marketing', marketingUnsubscribeRoutes);

describe('GET /api/marketing/unsubscribe (side-effect-free confirm)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('400s on a forged/invalid token', async () => {
    const res = await request(app).get('/api/marketing/unsubscribe?lead=5&token=deadbeef');
    expect(res.status).toBe(400);
    expect(res.text).toContain('invalid');
  });

  it('400s on a non-numeric lead', async () => {
    const res = await request(app).get(`/api/marketing/unsubscribe?lead=abc&token=${tokenFor('abc')}`);
    expect(res.status).toBe(400);
  });

  it('valid token shows a confirm FORM and suppresses NOTHING (pre-fetch safe)', async () => {
    const res = await request(app).get(`/api/marketing/unsubscribe?lead=5&token=${tokenFor(5)}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Confirm unsubscribe');
    expect(res.text).toContain('method="POST"');
    expect(leadFindByPk).not.toHaveBeenCalled();
    expect(subFindOrCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/marketing/unsubscribe (performs opt-out)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('400s on a forged token and suppresses NOTHING', async () => {
    const res = await request(app).post('/api/marketing/unsubscribe').type('form').send({ lead: 5, token: 'bad' });
    expect(res.status).toBe(400);
    expect(subFindOrCreate).not.toHaveBeenCalled();
  });

  it('suppresses the lead email (Subscriber unsubscribed), lowercased', async () => {
    leadFindByPk.mockResolvedValue({ id: 5, email: 'Lead@Example.COM' });
    subFindOrCreate.mockResolvedValue([{ id: 9, status: 'unsubscribed' }, true]);

    const res = await request(app).post('/api/marketing/unsubscribe').type('form').send({ lead: 5, token: tokenFor(5) });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Unsubscribed');
    expect(subFindOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: 'lead@example.com' },
      defaults: expect.objectContaining({ status: 'unsubscribed', source: 'lead_unsubscribe' }),
    }));
  });

  it('flips an EXISTING confirmed subscriber to unsubscribed', async () => {
    leadFindByPk.mockResolvedValue({ id: 7, email: 'x@y.com' });
    const save = vi.fn();
    subFindOrCreate.mockResolvedValue([{ id: 3, status: 'confirmed', save }, false]);

    const res = await request(app).post('/api/marketing/unsubscribe').type('form').send({ lead: 7, token: tokenFor(7) });

    expect(res.status).toBe(200);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('valid token but lead/email gone → still 200, records nothing (no leak)', async () => {
    leadFindByPk.mockResolvedValue(null);
    const res = await request(app).post('/api/marketing/unsubscribe').type('form').send({ lead: 99, token: tokenFor(99) });
    expect(res.status).toBe(200);
    expect(subFindOrCreate).not.toHaveBeenCalled();
  });

  it('#1 one-click: reads lead+token from QUERY on POST (Gmail/Yahoo body is List-Unsubscribe=One-Click)', async () => {
    leadFindByPk.mockResolvedValue({ id: 5, email: 'a@b.com' });
    subFindOrCreate.mockResolvedValue([{ id: 1, status: 'unsubscribed' }, true]);
    const res = await request(app)
      .post(`/api/marketing/unsubscribe?lead=5&token=${tokenFor(5)}`)
      .type('form').send({ 'List-Unsubscribe': 'One-Click' });
    expect(res.status).toBe(200);
    expect(subFindOrCreate).toHaveBeenCalled();
  });

  it('#11/M3 DB failure → 200 but does NOT falsely claim "Unsubscribed" (honest, never 500)', async () => {
    leadFindByPk.mockResolvedValue({ id: 5, email: 'a@b.com' });
    subFindOrCreate.mockRejectedValue(new Error('db down'));
    const res = await request(app).post('/api/marketing/unsubscribe').type('form').send({ lead: 5, token: tokenFor(5) });
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('Unsubscribed'); // no false success
    expect(res.text).toContain('processing');
  });
});
