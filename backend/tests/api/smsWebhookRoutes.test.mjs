/**
 * SMS webhook routes
 * ==================
 *
 * Verifies Twilio inbound STOP webhooks persist phone opt-outs.
 */
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  recordSmsOptOut: vi.fn(),
}));

vi.mock('../../services/smsSuppressionService.mjs', () => ({
  recordSmsOptOut: mocks.recordSmsOptOut,
}));

const { default: smsWebhookRoutes } = await import('../../routes/smsWebhookRoutes.mjs');
const originalNodeEnv = process.env.NODE_ENV;

function makeApp() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use('/api/sms/webhooks', smsWebhookRoutes);
  return app;
}

describe('smsWebhookRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_WEBHOOK_SIGNATURE_REQUIRED;
    delete process.env.TWILIO_WEBHOOK_PUBLIC_BASE_URL;
    delete process.env.SWAN_API_BASE_URL;
    mocks.recordSmsOptOut.mockResolvedValue({
      recorded: true,
      phone: '+15551234567',
      created: true,
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_WEBHOOK_SIGNATURE_REQUIRED;
    delete process.env.TWILIO_WEBHOOK_PUBLIC_BASE_URL;
    delete process.env.SWAN_API_BASE_URL;
  });

  it('persists an inbound Twilio STOP opt-out and returns TwiML', async () => {
    const res = await request(makeApp())
      .post('/api/sms/webhooks/inbound')
      .type('form')
      .send({
        From: '+15551234567',
        Body: 'STOP',
        MessageSid: 'SMstop123',
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/xml');
    expect(res.text).toContain('<Response>');
    expect(mocks.recordSmsOptOut).toHaveBeenCalledWith({
      from: '+15551234567',
      body: 'STOP',
      messageSid: 'SMstop123',
      raw: expect.objectContaining({ From: '+15551234567' }),
    });
  });

  it('rejects an unsigned production webhook before persisting an opt-out', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TWILIO_AUTH_TOKEN = 'test-token';

    const res = await request(makeApp())
      .post('/api/sms/webhooks/inbound')
      .type('form')
      .send({
        From: '+15551234567',
        Body: 'STOP',
        MessageSid: 'SMstop123',
      });

    expect(res.status).toBe(403);
    expect(mocks.recordSmsOptOut).not.toHaveBeenCalled();
  });
});
