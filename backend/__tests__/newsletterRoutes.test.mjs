/**
 * newsletterRoutes — Tier 1.1 public double-opt-in endpoints.
 * Locks: confirm-email send on subscribe, honeypot bot trap, invalid-email 400,
 * no-email-for-already-confirmed, non-blocking send, confirm/unsubscribe HTML +
 * 400s. Service + SendGrid + rate-limiter vi.mock'd — no real DB/sends.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { subscribe, confirm, unsubscribe, sendGridEmail } = vi.hoisted(() => ({
  subscribe: vi.fn(), confirm: vi.fn(), unsubscribe: vi.fn(), sendGridEmail: vi.fn(),
}));
vi.mock('../services/newsletterService.mjs', () => ({ subscribe, confirm, unsubscribe }));
vi.mock('../services/sendgridService.mjs', () => ({ sendGridEmail }));
vi.mock('../middleware/authMiddleware.mjs', () => ({ rateLimiter: () => (_req, _res, next) => next() }));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { default: newsletterRoutes } = await import('../routes/newsletterRoutes.mjs');
const app = express();
app.use(express.json());
app.use('/api/newsletter', newsletterRoutes);

describe('newsletterRoutes (Tier 1.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribe.mockResolvedValue({ ok: true, action: 'created_pending', subscriber: { email: 'a@b.com' }, confirmToken: 'ctok' });
    confirm.mockResolvedValue({ ok: true, action: 'confirmed' });
    unsubscribe.mockResolvedValue({ ok: true, action: 'unsubscribed' });
    sendGridEmail.mockResolvedValue({ success: true });
  });

  it('subscribe: creates pending, sends confirm email with token URL, generic 200', async () => {
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'a@b.com', firstName: 'A', source: 'footer' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(sendGridEmail).toHaveBeenCalledTimes(1);
    const mail = sendGridEmail.mock.calls[0][0];
    expect(mail.to).toBe('a@b.com');
    expect(mail.html).toContain('/api/newsletter/confirm/ctok');
  });

  it('subscribe: honeypot (website filled) silently succeeds without subscribing or emailing', async () => {
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'bot@b.com', website: 'http://spam' });
    expect(res.status).toBe(200);
    expect(subscribe).not.toHaveBeenCalled();
    expect(sendGridEmail).not.toHaveBeenCalled();
  });

  it('subscribe: invalid email -> 400, no confirm email', async () => {
    subscribe.mockResolvedValue({ ok: false, error: 'invalid_email' });
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'bad' });
    expect(res.status).toBe(400);
    expect(sendGridEmail).not.toHaveBeenCalled();
  });

  it('subscribe: already-confirmed (no confirmToken) -> no email, still generic 200', async () => {
    subscribe.mockResolvedValue({ ok: true, action: 'already_confirmed', subscriber: { email: 'a@b.com' } });
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'a@b.com' });
    expect(res.status).toBe(200);
    expect(sendGridEmail).not.toHaveBeenCalled();
  });

  it('subscribe: stays 200 if the confirm email send throws (non-blocking)', async () => {
    sendGridEmail.mockRejectedValue(new Error('sg down'));
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'a@b.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('confirm: valid token -> 200 HTML confirmation', async () => {
    const res = await request(app).get('/api/newsletter/confirm/ctok');
    expect(res.status).toBe(200);
    expect(res.text).toContain("You're in");
    expect(confirm).toHaveBeenCalledWith('ctok');
  });

  it('confirm: invalid token -> 400', async () => {
    confirm.mockResolvedValue({ ok: false, error: 'invalid_token' });
    const res = await request(app).get('/api/newsletter/confirm/bad');
    expect(res.status).toBe(400);
  });

  it('unsubscribe: valid token -> 200 HTML', async () => {
    const res = await request(app).get('/api/newsletter/unsubscribe/utok');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Unsubscribed');
    expect(unsubscribe).toHaveBeenCalledWith('utok');
  });

  it('unsubscribe: invalid token -> 400', async () => {
    unsubscribe.mockResolvedValue({ ok: false, error: 'invalid_token' });
    const res = await request(app).get('/api/newsletter/unsubscribe/bad');
    expect(res.status).toBe(400);
  });
});
