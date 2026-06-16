/**
 * automationService — nurture dry-run + suppression evaluator.
 * Locks the safety foundation for arming the follow-up engine:
 *  - evaluateScheduledMessage centralizes every send/suppress decision (pure).
 *  - previewScheduledMessages reports what WOULD happen with NO sends + NO DB
 *    mutation, and is PII-safe (phone presence only, never the number).
 * Models + SMS service are mocked — nothing is sent, nothing is written.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { logFindAll, userFindByPk, smsTemplated, smsMessage } = vi.hoisted(() => ({
  logFindAll: vi.fn(),
  userFindByPk: vi.fn(),
  smsTemplated: vi.fn(),
  smsMessage: vi.fn(),
}));

vi.mock('../models/index.mjs', () => ({
  getAllModels: () => ({
    AutomationSequence: {},
    AutomationLog: { findAll: logFindAll },
    User: { findByPk: userFindByPk },
  }),
}));
vi.mock('../services/smsService.mjs', () => ({
  sendTemplatedSMS: smsTemplated,
  sendSmsMessage: smsMessage,
}));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { evaluateScheduledMessage, previewScheduledMessages } = await import('../services/automationService.mjs');

const ALL_DAY_QUIET = { start: '00:00', end: '23:59' };

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
  it('FAIL channel_not_implemented for a non-sms channel', () => {
    const d = evaluateScheduledMessage({ channel: 'email' }, { phone: '+1' });
    expect(d).toMatchObject({ action: 'fail', reason: 'channel_not_implemented' });
  });
  it('DEFER during quiet hours, with a nextAttempt', () => {
    const d = evaluateScheduledMessage({ channel: 'sms' }, { phone: '+1', notificationPreferences: { sms: true, quietHours: ALL_DAY_QUIET } });
    expect(d.action).toBe('defer');
    expect(d.reason).toBe('quiet_hours');
    expect(d.nextAttempt).toBeInstanceOf(Date);
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
    logFindAll.mockResolvedValue(logs);
    userFindByPk.mockImplementation((id) => Promise.resolve(({
      10: { id: 10, phone: '+15550001111', notificationPreferences: { sms: true } },   // send
      20: { id: 20, phone: '+15550002222', notificationPreferences: { sms: false } },  // cancel
      30: { id: 30, phone: null, notificationPreferences: { sms: true } },             // fail no_phone
      40: { id: 40, phone: '+15550004444', notificationPreferences: { sms: true } },   // fail channel
    })[id] || null));
  });

  it('summarizes who would be messaged + the suppression reasons', async () => {
    const res = await previewScheduledMessages();
    expect(res.dryRun).toBe(true);
    expect(res.total).toBe(4);
    expect(res.summary).toEqual({ wouldSend: 1, wouldDefer: 0, wouldCancel: 1, wouldFail: 2 });
    expect(res.byReason).toMatchObject({ eligible: 1, sms_disabled: 1, no_phone: 1, channel_not_implemented: 1 });
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
    expect(sendItem).toMatchObject({ action: 'send', hasPhone: true, channel: 'sms' });
    expect(sendItem).not.toHaveProperty('phone');
    expect(JSON.stringify(res)).not.toContain('+1555'); // no raw phone numbers anywhere
  });
});
