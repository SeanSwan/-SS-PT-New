/**
 * smsRoutes safety gates
 * ======================
 * Locks the raw admin SMS resend routes behind the same outbound-send safety
 * posture as scheduled automation: default-off arm switch, fail-closed
 * suppression, and per-recipient frequency cap before any Twilio call.
 */
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  automationLogCount,
  automationLogCreate,
  automationLogFindAll,
  listSmsTemplates,
  resolveSuppression,
  sendSmsMessage,
  sendTemplatedSMS,
} = vi.hoisted(() => ({
  automationLogCount: vi.fn(),
  automationLogCreate: vi.fn(),
  automationLogFindAll: vi.fn(),
  listSmsTemplates: vi.fn(() => [{ name: 'welcome' }]),
  resolveSuppression: vi.fn(),
  sendSmsMessage: vi.fn(),
  sendTemplatedSMS: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    AutomationLog: {
      count: automationLogCount,
      create: automationLogCreate,
      findAll: automationLogFindAll,
    },
    AutomationSequence: { name: 'AutomationSequence' },
    User: { name: 'User' },
    Lead: { name: 'Lead' },
  }),
}));

vi.mock('../../services/marketingSuppressionService.mjs', () => ({
  resolveMarketingSuppression: resolveSuppression,
}));

vi.mock('../../services/smsService.mjs', () => ({
  listSmsTemplates,
  sendSmsMessage,
  sendTemplatedSMS,
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { default: smsRoutes } = await import('../../routes/smsRoutes.mjs');

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/sms', smsRoutes);
  return app;
};

const ALLOWED = { suppressed: false, reason: null, checked: true };

describe('smsRoutes raw send safety gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SWAN_AUTOMATION_CRON_ENABLED;
    delete process.env.SWAN_AUTOMATION_MAX_PER_WINDOW;
    delete process.env.SWAN_AUTOMATION_WINDOW_DAYS;
    automationLogCount.mockResolvedValue(0);
    automationLogCreate.mockResolvedValue({});
    automationLogFindAll.mockResolvedValue([]);
    resolveSuppression.mockResolvedValue(ALLOWED);
    sendSmsMessage.mockResolvedValue({ success: true });
    sendTemplatedSMS.mockResolvedValue({ success: true, body: 'Rendered body' });
  });

  afterEach(() => {
    delete process.env.SWAN_AUTOMATION_CRON_ENABLED;
    delete process.env.SWAN_AUTOMATION_MAX_PER_WINDOW;
    delete process.env.SWAN_AUTOMATION_WINDOW_DAYS;
  });

  it('blocks /send while disarmed and makes zero Twilio calls', async () => {
    const res = await request(makeApp())
      .post('/api/sms/send')
      .send({ to: '+15550001111', body: 'Manual resend', recipientEmail: 'active@example.com' });

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ success: false, reason: 'automation_disarmed' });
    expect(sendSmsMessage).not.toHaveBeenCalled();
    expect(sendTemplatedSMS).not.toHaveBeenCalled();
    expect(automationLogCreate).not.toHaveBeenCalled();
  });

  it('blocks /send-template while disarmed and makes zero Twilio calls', async () => {
    const res = await request(makeApp())
      .post('/api/sms/send-template')
      .send({ to: '+15550001111', templateName: 'welcome', recipientEmail: 'active@example.com' });

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ success: false, reason: 'automation_disarmed' });
    expect(sendSmsMessage).not.toHaveBeenCalled();
    expect(sendTemplatedSMS).not.toHaveBeenCalled();
    expect(automationLogCreate).not.toHaveBeenCalled();
  });

  it('blocks a suppressed recipient before Twilio', async () => {
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'true';
    resolveSuppression.mockResolvedValue({ suppressed: true, reason: 'unsubscribed', checked: true });

    const res = await request(makeApp())
      .post('/api/sms/send')
      .send({ to: '+15550001111', body: 'Manual resend', recipientEmail: 'unsub@example.com' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, reason: 'unsubscribed' });
    expect(resolveSuppression).toHaveBeenCalledWith({ email: 'unsub@example.com', phone: '+15550001111' });
    expect(sendSmsMessage).not.toHaveBeenCalled();
    expect(automationLogCreate).not.toHaveBeenCalled();
  });

  it('blocks a frequency-capped recipient before Twilio', async () => {
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'true';
    automationLogCount.mockResolvedValue(3);

    const res = await request(makeApp())
      .post('/api/sms/send-template')
      .send({ to: '+15550001111', templateName: 'welcome', recipientEmail: 'active@example.com' });

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ success: false, reason: 'frequency_capped' });
    expect(sendTemplatedSMS).not.toHaveBeenCalled();
    expect(automationLogCreate).not.toHaveBeenCalled();
  });

  it('blocks an armed raw send without recipient email before suppression or Twilio', async () => {
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'true';

    const res = await request(makeApp())
      .post('/api/sms/send')
      .send({ to: '+15550001111', body: 'Manual resend' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, reason: 'suppression_identity_required' });
    expect(resolveSuppression).not.toHaveBeenCalled();
    expect(sendSmsMessage).not.toHaveBeenCalled();
    expect(automationLogCreate).not.toHaveBeenCalled();
  });

  it('blocks an armed raw send when suppression cannot be verified', async () => {
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'true';
    resolveSuppression.mockResolvedValue({ suppressed: false, reason: 'lookup_failed', checked: false });

    const res = await request(makeApp())
      .post('/api/sms/send-template')
      .send({ to: '+15550001111', templateName: 'welcome', recipientEmail: 'active@example.com' });

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ success: false, reason: 'suppression_unverified' });
    expect(sendTemplatedSMS).not.toHaveBeenCalled();
    expect(automationLogCreate).not.toHaveBeenCalled();
  });

  it('sends and records one manual SMS when armed, allowed, and under the cap', async () => {
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'true';

    const res = await request(makeApp())
      .post('/api/sms/send')
      .send({ to: '+15550001111', body: 'Manual resend', recipientEmail: 'active@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: 'SMS sent' });
    expect(resolveSuppression).toHaveBeenCalledWith({ email: 'active@example.com', phone: '+15550001111' });
    expect(automationLogCount).toHaveBeenCalledTimes(1);
    expect(sendSmsMessage).toHaveBeenCalledWith({ to: '+15550001111', body: 'Manual resend' });
    expect(automationLogCreate).toHaveBeenCalledTimes(1);
    expect(automationLogCreate.mock.calls[0][0]).toMatchObject({
      channel: 'sms',
      status: 'sent',
      recipient: '+15550001111',
      message: 'Manual resend',
      payloadJson: { source: 'manual' },
      error: null,
    });
  });

  it('includes lead email on SMS logs so lead resends can pass suppression identity checks', async () => {
    automationLogFindAll.mockResolvedValue([
      {
        id: 41,
        channel: 'sms',
        status: 'failed',
        recipient: '+15550002222',
        lead: { id: 7, firstName: 'Lead', email: 'lead@example.com', phone: '+15550002222' },
      },
    ]);

    const res = await request(makeApp()).get('/api/sms/logs?limit=5');

    expect(res.status).toBe(200);
    expect(automationLogFindAll).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.arrayContaining([
        expect.objectContaining({
          as: 'lead',
          attributes: expect.arrayContaining(['email', 'phone']),
        }),
      ]),
    }));
    expect(res.body.data[0].lead.email).toBe('lead@example.com');
  });
});
