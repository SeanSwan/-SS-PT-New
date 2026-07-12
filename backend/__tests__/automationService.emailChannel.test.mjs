/**
 * automationService — email channel (Epic 1: speed-to-lead)
 * =========================================================
 * Regression: before the email channel existed, `evaluateScheduledMessage` hard-failed
 * every non-SMS log (`channel_not_implemented`), so the phone-LESS, email-only leads that
 * make up most contact-form traffic were never nurtured. These tests prove:
 *   1. an email-only lead (no phone, channel:'email') is now SENT via the email sender, and
 *   2. the decision gates route on email presence + prefs.email, while SMS is unchanged.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evaluateScheduledMessage } from '../services/automationDecisionService.mjs';

// ── Pure decision-layer unit coverage (no mocks needed) ─────────────────────────────
describe('evaluateScheduledMessage — email channel', () => {
  const ALLOWED = { suppressed: false, checked: true };
  const emailLead = { email: 'lead@example.com', phone: null, notificationPreferences: null };

  it('SENDS an email log for an email-bearing recipient', () => {
    const d = evaluateScheduledMessage({ channel: 'email' }, emailLead, new Date(), ALLOWED, { capped: false });
    expect(d).toMatchObject({ action: 'send', channel: 'email' });
  });

  it('FAILS no_email when the recipient has no email', () => {
    const d = evaluateScheduledMessage({ channel: 'email' }, { email: null, phone: '+15550001111' }, new Date(), ALLOWED);
    expect(d).toMatchObject({ action: 'fail', reason: 'no_email', channel: 'email' });
  });

  it('CANCELS when the recipient opted out of email', () => {
    const d = evaluateScheduledMessage({ channel: 'email' }, { email: 'x@y.com', notificationPreferences: { email: false } }, new Date(), ALLOWED);
    expect(d).toMatchObject({ action: 'cancel', reason: 'email_disabled', channel: 'email' });
  });

  it('CANCELS when marketing-suppressed (consent gate wins first)', () => {
    const d = evaluateScheduledMessage({ channel: 'email' }, emailLead, new Date(), { suppressed: true, reason: 'unsubscribed' });
    expect(d).toMatchObject({ action: 'cancel', channel: 'email' });
  });

  it('regression: SMS path is unchanged (phone recipient still sends)', () => {
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: '+15550001111', notificationPreferences: null }, new Date(), ALLOWED, { capped: false });
    expect(d).toMatchObject({ action: 'send', channel: 'sms' });
  });
});

// ── End-to-end through processScheduledMessages (mocked models + senders) ────────────
const { logFindAll, logCount, logUpdate, userFindByPk, leadFindByPk, smsTemplated, emailTemplated, buildEmailVars, resolveSuppression } = vi.hoisted(() => ({
  logFindAll: vi.fn(), logCount: vi.fn(), logUpdate: vi.fn(),
  userFindByPk: vi.fn(), leadFindByPk: vi.fn(),
  smsTemplated: vi.fn(), emailTemplated: vi.fn(), buildEmailVars: vi.fn(),
  resolveSuppression: vi.fn(),
}));

vi.mock('../models/index.mjs', () => ({
  getAllModels: () => ({
    AutomationSequence: {},
    AutomationLog: { findAll: logFindAll, count: logCount, update: logUpdate },
    User: { findByPk: userFindByPk },
  }),
}));
vi.mock('../models/Lead.mjs', () => ({ default: { findByPk: leadFindByPk } }));
vi.mock('../services/smsService.mjs', () => ({ sendTemplatedSMS: smsTemplated, sendSmsMessage: vi.fn() }));
vi.mock('../services/emailTemplateService.mjs', () => ({ sendTemplatedEmail: emailTemplated, buildNurtureEmailVars: buildEmailVars }));
vi.mock('../services/marketingSuppressionService.mjs', () => ({ resolveMarketingSuppression: resolveSuppression }));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { processScheduledMessages } = await import('../services/automationService.mjs');

const makeEmailLog = () => ({
  id: 1, userId: null, leadId: 5, channel: 'email', templateName: 'welcome',
  payloadJson: { variables: { clientName: 'Alex' } },
  status: 'pending', scheduledFor: new Date('2020-01-01T00:00:00Z'),
  updatedAt: new Date('2020-01-01T00:00:00Z'),
  message: null, sentAt: null, recipient: null, error: null,
  changed() {}, save: vi.fn(async function save() {}),
});

describe('processScheduledMessages — email-only lead is nurtured', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'true';
    resolveSuppression.mockResolvedValue({ suppressed: false, checked: true });
    leadFindByPk.mockResolvedValue({ id: 5, email: 'lead@example.com', phone: null, firstName: 'Alex' });
    logCount.mockResolvedValue(0);
    logUpdate.mockResolvedValue([1]);
    buildEmailVars.mockReturnValue({ clientName: 'Alex', consultUrl: 'https://x/consult', unsubscribeUrl: 'https://x/unsub?t=1', businessAddress: 'Addr' });
    emailTemplated.mockResolvedValue({ success: true, body: 'Rendered email text' });
  });
  afterEach(() => { delete process.env.SWAN_AUTOMATION_CRON_ENABLED; });

  it('sends via the EMAIL sender to the lead email and marks the log sent', async () => {
    const log = makeEmailLog();
    logFindAll.mockResolvedValue([log]);

    const res = await processScheduledMessages();

    expect(emailTemplated).toHaveBeenCalledTimes(1);
    expect(emailTemplated).toHaveBeenCalledWith(expect.objectContaining({ to: 'lead@example.com', templateName: 'welcome' }));
    expect(smsTemplated).not.toHaveBeenCalled();
    expect(log.status).toBe('sent');
    expect(log.recipient).toBe('lead@example.com');
    expect(res.results).toEqual([{ id: 1, status: 'sent' }]);
    // C1: the email consent gate is email-only — NOT keyed on leadId/phone SMS-consent.
    expect(resolveSuppression).toHaveBeenCalledWith({ email: 'lead@example.com' });
  });

  it('C1 regression: an email lead with UNKNOWN sms consent still SENDS (email suppression is email-only)', async () => {
    const log = makeEmailLog();
    logFindAll.mockResolvedValue([log]);
    // Reproduce the real service: SMS-consent suppression fires ONLY when leadId is passed.
    // Before the fix, email sends passed leadId and every email nurture was cancelled.
    resolveSuppression.mockImplementation(async (args) => (
      'leadId' in args
        ? { suppressed: true, reason: 'lead_sms_consent_missing', checked: true }
        : { suppressed: false, checked: true }
    ));

    const res = await processScheduledMessages();

    expect(resolveSuppression).toHaveBeenCalledWith({ email: 'lead@example.com' }); // no leadId → SMS gate bypassed
    expect(emailTemplated).toHaveBeenCalledTimes(1);
    expect(res.results).toEqual([{ id: 1, status: 'sent' }]);
  });

  it('#4 config-error email send (missing business address) DEFERS, not permanently fails', async () => {
    const log = makeEmailLog();
    logFindAll.mockResolvedValue([log]);
    emailTemplated.mockResolvedValue({ success: false, error: 'missing_business_address' });

    const res = await processScheduledMessages();

    expect(res.results).toEqual([{ id: 1, status: 'deferred' }]);
    expect(log.status).toBe('pending'); // re-queued for after Sean sets the env, not burned
  });

  it('a marketing-suppressed email lead is CANCELLED and never emailed (glue regression guard)', async () => {
    const log = makeEmailLog();
    logFindAll.mockResolvedValue([log]);
    resolveSuppression.mockResolvedValue({ suppressed: true, reason: 'unsubscribed', checked: true });

    const res = await processScheduledMessages();

    expect(emailTemplated).not.toHaveBeenCalled();
    expect(log.status).toBe('cancelled');
    expect(res.results).toEqual([{ id: 1, status: 'cancelled' }]);
  });

  it('an unverifiable-consent (checked:false) email lead is NOT sent — DEFERS closed (transient, retried)', async () => {
    const log = makeEmailLog();
    logFindAll.mockResolvedValue([log]);
    resolveSuppression.mockResolvedValue({ suppressed: false, checked: false });

    const res = await processScheduledMessages();

    expect(emailTemplated).not.toHaveBeenCalled();                 // fail-closed: nothing sent while consent unverified
    expect(res.results).toEqual([{ id: 1, status: 'deferred' }]);  // transient DB blip → retry, not permanent drop
  });
});
