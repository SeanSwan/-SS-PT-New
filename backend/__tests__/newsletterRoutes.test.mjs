/**
 * newsletterRoutes — Tier 1.1 public double-opt-in endpoints.
 * Locks: confirm-email send on subscribe, honeypot bot trap, invalid-email 400,
 * no-email-for-already-confirmed, non-blocking send, confirm/unsubscribe HTML +
 * 400s. Service + SendGrid + rate-limiter vi.mock'd — no real DB/sends.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { subscribe, confirm, unsubscribe, sendGridEmail, captureLeadFromNewsletter } = vi.hoisted(() => ({
  subscribe: vi.fn(), confirm: vi.fn(), unsubscribe: vi.fn(), sendGridEmail: vi.fn(), captureLeadFromNewsletter: vi.fn(),
}));
vi.mock('../services/newsletterService.mjs', () => ({ subscribe, confirm, unsubscribe }));
vi.mock('../services/sendgridService.mjs', () => ({ sendGridEmail }));
vi.mock('../services/leadCaptureService.mjs', () => ({ captureLeadFromNewsletter }));
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
    confirm.mockResolvedValue({ ok: true, action: 'confirmed', subscriber: { email: 'a@b.com', firstName: 'Ann', unsubscribeToken: 'utok' } });
    unsubscribe.mockResolvedValue({ ok: true, action: 'unsubscribed' });
    sendGridEmail.mockResolvedValue({ success: true });
    captureLeadFromNewsletter.mockResolvedValue({ leadId: 1, created: true });
  });

  it('subscribe: creates pending, sends confirm email with token URL, generic 200', async () => {
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'a@b.com', firstName: 'A', source: 'footer' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.emailDelivery).toBe('sent');
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

  it('subscribe: stays 200 but reports when the confirm email send throws', async () => {
    sendGridEmail.mockRejectedValue(new Error('sg down'));
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'a@b.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.emailDelivery).toBe('failed');
    expect(res.body.message).toMatch(/confirmation email could not be sent/i);
  });

  it('subscribe: reports SendGrid result failure without pretending the email was sent', async () => {
    sendGridEmail.mockResolvedValue({ success: false, error: new Error('SendGrid service not configured') });
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'a@b.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.emailDelivery).toBe('failed');
    expect(res.body.message).toMatch(/confirmation email could not be sent/i);
  });

  it('confirm: valid token -> 200, creates CRM lead + sends welcome email (w/ unsubscribe) + booking CTA', async () => {
    const res = await request(app).get('/api/newsletter/confirm/ctok');
    expect(res.status).toBe(200);
    expect(res.text).toContain("You're in");
    expect(res.text).toContain('Book your free assessment'); // next-action CTA on the confirm page
    expect(confirm).toHaveBeenCalledWith('ctok');
    expect(captureLeadFromNewsletter).toHaveBeenCalledTimes(1);
    expect(captureLeadFromNewsletter.mock.calls[0][0]).toMatchObject({ email: 'a@b.com' });
    expect(sendGridEmail).toHaveBeenCalledTimes(1); // welcome email
    const mail = sendGridEmail.mock.calls[0][0];
    expect(mail.subject).toContain('Welcome');
    expect(mail.html).toContain('/api/newsletter/unsubscribe/utok'); // one-click unsubscribe in welcome
  });

  it('confirm: escapes subscriber display name before rendering welcome email HTML', async () => {
    confirm.mockResolvedValue({
      ok: true,
      action: 'confirmed',
      subscriber: {
        email: 'a@b.com',
        firstName: '<img src=x onerror="alert(1)">',
        unsubscribeToken: 'utok',
      },
    });

    const res = await request(app).get('/api/newsletter/confirm/ctok');

    expect(res.status).toBe(200);
    const mail = sendGridEmail.mock.calls[0][0];
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('Hi &lt;img src=x onerror=&quot;alert(1)&quot;&gt;,');
  });
  it('confirm: still 200 if the welcome email send fails (non-blocking)', async () => {
    sendGridEmail.mockRejectedValue(new Error('sg down'));
    const res = await request(app).get('/api/newsletter/confirm/ctok');
    expect(res.status).toBe(200);
    expect(res.text).toContain("You're in");
  });

  it('confirm: invalid token -> 400, no lead capture, no welcome email', async () => {
    confirm.mockResolvedValue({ ok: false, error: 'invalid_token' });
    const res = await request(app).get('/api/newsletter/confirm/bad');
    expect(res.status).toBe(400);
    expect(captureLeadFromNewsletter).not.toHaveBeenCalled();
    expect(sendGridEmail).not.toHaveBeenCalled();
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
