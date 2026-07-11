/**
 * automationService — nurture dry-run + suppression evaluator.
 * Locks the safety foundation for arming the follow-up engine:
 *  - evaluateScheduledMessage centralizes every send/suppress decision (pure), now
 *    with a fail-closed marketing-consent gate checked FIRST.
 *  - previewScheduledMessages reports what WOULD happen with NO sends + NO DB
 *    mutation, and is PII-safe (phone/suppression presence only, never the number).
 *  - recipients resolve to either a User OR a captured Lead (lead-nurture path).
 * Models, SMS service, and the suppression lookup are mocked — nothing is sent,
 * nothing is written, no real Subscriber query runs.
 */
import { Op } from 'sequelize';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const { logFindAll, logCount, logUpdate, userFindByPk, leadFindByPk, smsTemplated, smsMessage, resolveSuppression } = vi.hoisted(() => ({
  logFindAll: vi.fn(),
  logCount: vi.fn(),
  logUpdate: vi.fn(),
  userFindByPk: vi.fn(),
  leadFindByPk: vi.fn(),
  smsTemplated: vi.fn(),
  smsMessage: vi.fn(),
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
vi.mock('../services/smsService.mjs', () => ({
  sendTemplatedSMS: smsTemplated,
  sendSmsMessage: smsMessage,
}));
vi.mock('../services/marketingSuppressionService.mjs', () => ({
  resolveMarketingSuppression: resolveSuppression,
}));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { evaluateScheduledMessage, previewScheduledMessages, processScheduledMessages } = await import('../services/automationService.mjs');

const ALL_DAY_QUIET = { start: '00:00', end: '23:59' };
const ALLOWED = { suppressed: false, reason: null, checked: true };

describe('evaluateScheduledMessage (suppression decisions)', () => {
  it('SEND for an eligible sms log (sms on, has phone, not quiet hours)', () => {
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: '+15550001111', notificationPreferences: { sms: true } });
    expect(d.action).toBe('send');
  });
  it('CANCEL when the user disabled sms', () => {
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: '+1', notificationPreferences: { sms: false } });
    expect(d).toMatchObject({ action: 'cancel', reason: 'sms_disabled' });
  });
  it('FAIL no_phone when the user has no phone', () => {
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: null, notificationPreferences: { sms: true } });
    expect(d).toMatchObject({ action: 'fail', reason: 'no_phone' });
  });
  it('FAIL channel_not_implemented for an unimplemented channel (push)', () => {
    // email is now implemented (Epic 1 email channel); push remains unimplemented.
    const d = evaluateScheduledMessage({ channel: 'push' }, { phone: '+1' });
    expect(d).toMatchObject({ action: 'fail', reason: 'channel_not_implemented' });
  });
  it('DEFER during quiet hours, with a nextAttempt', () => {
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: '+1', notificationPreferences: { sms: true, quietHours: ALL_DAY_QUIET } });
    expect(d.action).toBe('defer');
    expect(d.reason).toBe('quiet_hours');
    expect(d.nextAttempt).toBeInstanceOf(Date);
  });

  // Marketing consent gate (fail-closed, checked FIRST).
  it('CANCEL when the recipient is marketing-suppressed (opt-out wins)', () => {
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: '+1', notificationPreferences: { sms: true } }, new Date(),
      { suppressed: true, reason: 'unsubscribed', checked: true });
    expect(d).toMatchObject({ action: 'cancel', reason: 'unsubscribed' });
  });
  it('FAIL suppression_unverified (fail CLOSED) when consent could not be verified', () => {
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: '+1', notificationPreferences: { sms: true } }, new Date(),
      { suppressed: false, checked: false });
    expect(d).toMatchObject({ action: 'fail', reason: 'suppression_unverified' });
  });
  it('suppression beats sms_disabled — an opt-out is the strongest signal', () => {
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: '+1', notificationPreferences: { sms: false } }, new Date(),
      { suppressed: true, reason: 'unsubscribed', checked: true });
    expect(d.reason).toBe('unsubscribed'); // not sms_disabled
  });
  it('omitted suppression (null) is skipped — legacy/unit calls behave as before', () => {
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: '+1', notificationPreferences: { sms: true } });
    expect(d.action).toBe('send');
  });

  // Rolling per-recipient frequency cap (defer, checked AFTER no_phone).
  it('DEFER frequency_capped when the recipient hit the rolling cap', () => {
    const next = new Date('2030-01-02T00:00:00Z');
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: '+1', notificationPreferences: { sms: true } }, new Date(),
      null, { capped: true, nextAttempt: next });
    expect(d).toMatchObject({ action: 'defer', reason: 'frequency_capped' });
    expect(d.nextAttempt).toBe(next);
  });
  it('SENDS when under the frequency cap', () => {
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: '+1', notificationPreferences: { sms: true } }, new Date(),
      null, { capped: false });
    expect(d.action).toBe('send');
  });
  it('no_phone beats the frequency cap (a terminal failure wins over a re-try)', () => {
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: null, notificationPreferences: { sms: true } }, new Date(),
      null, { capped: true });
    expect(d).toMatchObject({ action: 'fail', reason: 'no_phone' });
  });

});

describe('previewScheduledMessages (dry-run)', () => {
  const logs = [
    { id: 1, userId: 10, channel: 'sms', templateName: 'welcome', save: vi.fn() },
    { id: 2, userId: 20, channel: 'sms', templateName: 'welcome', save: vi.fn() },
    { id: 3, userId: 30, channel: 'sms', templateName: 'welcome', save: vi.fn() },
    { id: 4, userId: 40, channel: 'email', templateName: 'welcome', save: vi.fn() },
  ];
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSuppression.mockResolvedValue(ALLOWED);
    logCount.mockResolvedValue(0);
    logFindAll.mockResolvedValue(logs);
    userFindByPk.mockImplementation((id) => Promise.resolve(({
      10: { id: 10, phone: '+15550001111', notificationPreferences: { sms: true } },   // send
      20: { id: 20, phone: '+15550002222', notificationPreferences: { sms: false } },  // cancel
      30: { id: 30, phone: null, notificationPreferences: { sms: true } },             // fail no_phone
      40: { id: 40, phone: '+15550004444', notificationPreferences: { sms: true } },   // email channel + no email → fail no_email
    })[id] || null));
  });

  it('summarizes who would be messaged + the suppression reasons', async () => {
    const res = await previewScheduledMessages();
    expect(res.dryRun).toBe(true);
    expect(res.total).toBe(4);
    expect(res.summary).toEqual({ wouldSend: 1, wouldDefer: 0, wouldCancel: 1, wouldFail: 2 });
    expect(res.byReason).toMatchObject({ eligible: 1, sms_disabled: 1, no_phone: 1, no_email: 1 });
  });

  it('sends NOTHING and mutates NO logs (pure dry-run)', async () => {
    await previewScheduledMessages();
    expect(smsTemplated).not.toHaveBeenCalled();
    expect(smsMessage).not.toHaveBeenCalled();
    for (const log of logs) expect(log.save).not.toHaveBeenCalled();
  });

  it('is PII-safe: reports phone presence only, never the number', async () => {
    const res = await previewScheduledMessages();
    const sendItem = res.items.find((i) => i.id === 1);
    expect(sendItem).toMatchObject({ action: 'send', hasPhone: true, channel: 'sms', recipientKind: 'user' });
    expect(sendItem).not.toHaveProperty('phone');
    expect(JSON.stringify(res)).not.toContain('+1555'); // no raw phone numbers anywhere
  });
});

describe('previewScheduledMessages (suppression + lead recipients)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logCount.mockResolvedValue(0);
    userFindByPk.mockImplementation((id) => Promise.resolve(({
      10: { id: 10, phone: '+15550001111', email: 'active@x.com', notificationPreferences: { sms: true } },
      20: { id: 20, phone: '+15550002222', email: 'unsub@x.com', notificationPreferences: { sms: true } },
    })[id] || null));
    leadFindByPk.mockImplementation((id) => Promise.resolve(({
      777: { id: 777, phone: '+15550007777', email: 'lead@x.com', firstName: 'Lead' },
    })[id] || null));
    // unsubscribed email is suppressed; everyone else allowed.
    resolveSuppression.mockImplementation(async ({ email }) => (
      email === 'unsub@x.com'
        ? { suppressed: true, reason: 'unsubscribed', checked: true }
        : ALLOWED
    ));
  });

  it('CANCELS a suppressed (unsubscribed) recipient and flags suppressed:true', async () => {
    logFindAll.mockResolvedValue([
      { id: 1, userId: 10, channel: 'sms', templateName: 'welcome' },  // allowed → send
      { id: 2, userId: 20, channel: 'sms', templateName: 'welcome' },  // unsubscribed → cancel
    ]);
    const res = await previewScheduledMessages();
    expect(res.summary).toMatchObject({ wouldSend: 1, wouldCancel: 1 });
    expect(res.byReason).toMatchObject({ eligible: 1, unsubscribed: 1 });
    const cancelled = res.items.find((i) => i.id === 2);
    expect(cancelled).toMatchObject({ action: 'cancel', reason: 'unsubscribed', suppressed: true });
  });

  it('resolves a LEAD recipient (no userId) → send with recipientKind:lead', async () => {
    logFindAll.mockResolvedValue([
      { id: 9, userId: null, leadId: 777, channel: 'sms', templateName: 'follow_up_day1' },
    ]);
    const res = await previewScheduledMessages();
    expect(leadFindByPk).toHaveBeenCalledWith(777);
    expect(resolveSuppression).toHaveBeenCalledWith({ email: 'lead@x.com', phone: '+15550007777', leadId: 777 });
    const item = res.items.find((i) => i.id === 9);
    expect(item).toMatchObject({ action: 'send', recipientKind: 'lead', leadId: 777, hasPhone: true });
    expect(JSON.stringify(res)).not.toContain('+1555'); // still PII-safe for leads
  });

  it('CANCELS a lead recipient by phone STOP opt-out', async () => {
    resolveSuppression.mockImplementation(async ({ phone }) => (
      phone === '+15550007777'
        ? { suppressed: true, reason: 'sms_opt_out', checked: true }
        : ALLOWED
    ));
    logFindAll.mockResolvedValue([
      { id: 10, userId: null, leadId: 777, channel: 'sms', templateName: 'follow_up_day1' },
    ]);

    const res = await previewScheduledMessages();

    expect(resolveSuppression).toHaveBeenCalledWith({ email: 'lead@x.com', phone: '+15550007777', leadId: 777 });
    expect(res.summary).toMatchObject({ wouldCancel: 1 });
    expect(res.byReason).toMatchObject({ sms_opt_out: 1 });
    expect(res.items[0]).toMatchObject({ action: 'cancel', reason: 'sms_opt_out', suppressed: true });
    expect(JSON.stringify(res)).not.toContain('+1555');
  });

  it('FAILS closed (suppression_unverified) when the consent lookup could not run', async () => {
    resolveSuppression.mockResolvedValue({ suppressed: false, reason: 'suppression_check_failed', checked: false });
    logFindAll.mockResolvedValue([
      { id: 3, userId: 10, channel: 'sms', templateName: 'welcome' },
    ]);
    const res = await previewScheduledMessages();
    expect(res.summary).toMatchObject({ wouldFail: 1 });
    expect(res.byReason).toMatchObject({ suppression_unverified: 1 });
  });

  it('DEFERS a frequency-capped recipient and flags frequencyCapped:true', async () => {
    logCount.mockResolvedValue(3); // at the default cap (SWAN_AUTOMATION_MAX_PER_WINDOW=3)
    logFindAll.mockResolvedValue([
      { id: 7, userId: 10, channel: 'sms', templateName: 'welcome' }, // allowed + capped → defer
    ]);
    const res = await previewScheduledMessages();
    expect(res.summary).toMatchObject({ wouldDefer: 1 });
    expect(res.byReason).toMatchObject({ frequency_capped: 1 });
    const item = res.items.find((i) => i.id === 7);
    expect(item).toMatchObject({ action: 'defer', reason: 'frequency_capped', frequencyCapped: true, sentInWindow: 3 });
  });

  it('counts manual sent SMS logs by resolved phone when applying the automation cap', async () => {
    logFindAll.mockResolvedValue([
      { id: 8, userId: 10, channel: 'sms', templateName: 'welcome' },
    ]);
    logCount.mockImplementation(async ({ where }) => {
      const andClauses = where[Op.and] || [];
      const identityClause = andClauses.find((clause) => Array.isArray(clause[Op.or]));
      const identities = identityClause?.[Op.or] || [];
      return identities.some((identity) => identity.recipient === '+15550001111') ? 3 : 2;
    });

    const res = await previewScheduledMessages();

    const item = res.items.find((i) => i.id === 8);
    expect(item).toMatchObject({ action: 'defer', reason: 'frequency_capped', frequencyCapped: true, sentInWindow: 3 });
  });
});

describe('processScheduledMessages (arm gate — BLOCKER 1: disarmed = zero delivery)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSuppression.mockResolvedValue(ALLOWED);
    logCount.mockResolvedValue(0);
    logUpdate.mockResolvedValue([1]);
    smsTemplated.mockResolvedValue({ success: true, body: 'hi' });
    delete process.env.SWAN_AUTOMATION_CRON_ENABLED;
  });
  afterEach(() => { delete process.env.SWAN_AUTOMATION_CRON_ENABLED; });

  it('is a NO-OP when disarmed (flag unset) — reads no logs, sends nothing', async () => {
    const res = await processScheduledMessages();
    expect(res).toMatchObject({ processed: 0, skipped: 'disarmed' });
    expect(logFindAll).not.toHaveBeenCalled();
    expect(smsTemplated).not.toHaveBeenCalled();
  });

  it('is a NO-OP for any value other than the literal "true"', async () => {
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'false';
    expect((await processScheduledMessages()).skipped).toBe('disarmed');
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'TRUE';
    expect((await processScheduledMessages()).skipped).toBe('disarmed');
    process.env.SWAN_AUTOMATION_CRON_ENABLED = '1';
    expect((await processScheduledMessages()).skipped).toBe('disarmed');
  });

  it('processes + SENDS only when ARMED ("true")', async () => {
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'true';
    const updatedAt = new Date('2030-01-01T00:00:00Z');
    logFindAll.mockResolvedValue([
      { id: 1, userId: 10, status: 'pending', updatedAt, channel: 'sms', templateName: 'welcome', payloadJson: {}, save: vi.fn() },
    ]);
    userFindByPk.mockResolvedValue({ id: 10, phone: '+15550001111', email: 'a@x.com', notificationPreferences: { sms: true } });
    const res = await processScheduledMessages();
    expect(logFindAll).toHaveBeenCalled();
    expect(logUpdate).toHaveBeenCalledWith(
      { status: 'processing' },
      { where: { id: 1, status: 'pending', updatedAt } }
    );
    expect(smsTemplated).toHaveBeenCalledTimes(1);
    expect(res.processed).toBe(1);
  });

  it('honors the in-code force override even when disarmed (NOT exposed via HTTP)', async () => {
    logFindAll.mockResolvedValue([]); // empty queue → enters but processes nothing
    const res = await processScheduledMessages({ force: true });
    expect(logFindAll).toHaveBeenCalled();
    expect(res.skipped).toBeUndefined();
    expect(res.processed).toBe(0);
  });
});
