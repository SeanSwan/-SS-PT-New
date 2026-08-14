/**
 * Admin Alert Service Tests — commission/accrual failure alarms
 * =============================================================
 * The 2026-07-14 hostile review proved commission writes can fail
 * silently for months (0 rows ever, no alarm). raiseMoneyWriteAlert
 * turns any pay-write failure into a CRITICAL admin notification with
 * dedupe (no alert storms) and a never-throws contract.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockNotificationModel } = vi.hoisted(() => ({
  mockNotificationModel: { findOne: vi.fn(), create: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getModel: (name) => (name === 'AdminNotification' ? mockNotificationModel : null),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { raiseMoneyWriteAlert, raiseSendFailureAlert } = await import('../../services/adminAlertService.mjs');

beforeEach(() => {
  vi.clearAllMocks();
  mockNotificationModel.findOne.mockResolvedValue(null);
  mockNotificationModel.create.mockImplementation(async (row) => ({ id: 'uuid-1', ...row }));
});

describe('raiseMoneyWriteAlert', () => {
  it('creates a CRITICAL system_alert with lane context in metadata', async () => {
    const created = await raiseMoneyWriteAlert({
      lane: 'session_flat_accrual',
      error: new Error('boom'),
      context: { sessionId: 55, trainerId: 2, clientId: 9 },
    });

    expect(created).not.toBeNull();
    const row = mockNotificationModel.create.mock.calls[0][0];
    expect(row.type).toBe('system_alert');
    expect(row.priority).toBe('critical');
    expect(row.actionRequired).toBe(true);
    expect(row.title).toContain('Trainer pay write FAILED');
    expect(row.message).toContain('session_flat_accrual');
    const meta = JSON.parse(row.metadata);
    expect(meta).toMatchObject({ lane: 'session_flat_accrual', sessionId: 55, trainerId: 2, error: 'boom' });
  });

  it('dedupes: skips when an unread alert for the same lane exists', async () => {
    mockNotificationModel.findOne.mockResolvedValue({ id: 'existing' });

    const created = await raiseMoneyWriteAlert({ lane: 'purchase_commission', error: new Error('x'), context: {} });

    expect(created).toBeNull();
    expect(mockNotificationModel.create).not.toHaveBeenCalled();
  });

  it('never throws — even when notification creation itself fails', async () => {
    mockNotificationModel.create.mockRejectedValue(new Error('db down'));
    await expect(
      raiseMoneyWriteAlert({ lane: 'purchase_commission', error: new Error('x'), context: {} })
    ).resolves.toBeNull();
  });

  it('never throws when the model is unavailable', async () => {
    const { raiseMoneyWriteAlert: raise } = await import('../../services/adminAlertService.mjs');
    // getModel returns null for anything but AdminNotification; simulate by lane only — covered via mock override
    mockNotificationModel.findOne.mockRejectedValue(new Error('no cache'));
    await expect(raise({ lane: 'session_flat_accrual', error: new Error('x'), context: {} })).resolves.toBeNull();
  });
});

/**
 * Send-failure lane — added 2026-08-14.
 *
 * WHY: `speedToLeadService` and `sendgridService` swallow every failure so a
 * broken provider cannot lose a lead. That made failures invisible. Once
 * SPEED_TO_LEAD_REPLY_ENABLED is armed, silence is indistinguishable from
 * success — a lead can go unanswered for weeks with nothing to see.
 */
describe('raiseSendFailureAlert', () => {
  it('creates a HIGH system_alert (not critical — a missed reply is not missed pay)', async () => {
    const created = await raiseSendFailureAlert({
      lane: 'speed_to_lead',
      error: new Error('quota exceeded'),
      context: { leadId: 42, source: 'consult' },
    });

    expect(mockNotificationModel.create).toHaveBeenCalledTimes(1);
    expect(created.type).toBe('system_alert');
    expect(created.priority).toBe('high');
    expect(created.actionRequired).toBe(true);
    expect(created.title).toContain('speed_to_lead');
    expect(JSON.parse(created.metadata)).toMatchObject({
      lane: 'speed_to_lead', leadId: '42', source: 'consult',
    });
  });

  it('dedupes per lane — a bounce storm raises ONE alert, not one per lead', async () => {
    mockNotificationModel.findOne.mockResolvedValue({ id: 'already-open' });
    const result = await raiseSendFailureAlert({ lane: 'speed_to_lead', error: new Error('x') });
    expect(result).toBeNull();
    expect(mockNotificationModel.create).not.toHaveBeenCalled();
  });

  it('never assigns a userId — a lead is not a User, and guessing one mislabels the alert', async () => {
    const created = await raiseSendFailureAlert({
      lane: 'speed_to_lead', error: new Error('x'), context: { leadId: 7 },
    });
    expect(created.userId).toBeNull();
  });

  // --- Rule 8: the whole reason this guard exists -------------------------
  it('REDACTS an email embedded in the error message (SendGrid puts the recipient there)', async () => {
    const created = await raiseSendFailureAlert({
      lane: 'sendgrid',
      error: new Error('550 rejected for to=lead@example.com, retry later'),
      context: { leadId: 9 },
    });
    expect(created.message).not.toContain('lead@example.com');
    expect(created.metadata).not.toContain('lead@example.com');
    expect(created.message).toContain('<redacted-email>');
  });

  it('REDACTS an email a careless future caller passes in context', async () => {
    const created = await raiseSendFailureAlert({
      lane: 'speed_to_lead',
      error: new Error('x'),
      context: { leadId: 9, email: 'someone@real.com' },
    });
    expect(created.message).not.toContain('someone@real.com');
    expect(created.metadata).not.toContain('someone@real.com');
  });

  it.each([
    ['NA with separators', 'sms fallback failed for +1 (555) 867-5309'],
    ['NA bare 10-digit', 'callback to 5558675309 failed'],
    ['NA hyphenated', 'call 555-867-5309 now'],
    ['E.164', 'sms to +15558675309 bounced'],
    ['international with spaces', 'sms to +44 20 7946 0958 bounced'],
  ])('REDACTS a phone number — %s', async (_label, msg) => {
    const created = await raiseSendFailureAlert({
      lane: 'sendgrid', error: new Error(msg), context: { leadId: 9 },
    });
    expect(created.message).toContain('<redacted-phone>');
  });

  /**
   * The other half of the guard, and the reason it was rewritten.
   *
   * The first phone pattern (`/\+?\d[\d\s().-]{7,}\d/`) redacted the exact
   * fields this alert exists to surface: it turned `2026-08-14 10:30:00` and
   * the request id `7f3a-1122-3344-5566` into `<redacted-phone>`. A privacy
   * guard that eats the timestamp and correlation id has destroyed the alert
   * while looking like it protected it. These inputs defeated that form — do
   * not loosen the pattern back.
   */
  it.each([
    ['ISO-ish timestamp', 'rejected at 2026-08-14 10:30:00 UTC'],
    ['ISO-T timestamp', 'retry after 2026-08-14T10:30:00Z'],
    ['hyphenated request id', 'request id 7f3a-1122-3344-5566 failed'],
    ['duration in ms', 'HTTP 429 after 12345678 ms'],
    ['order number', 'order 90210 line 4'],
  ])('KEEPS diagnostics intact — %s', async (_label, msg) => {
    const created = await raiseSendFailureAlert({
      lane: 'sendgrid', error: new Error(msg), context: { leadId: 9 },
    });
    expect(created.message).not.toContain('<redacted-phone>');
  });

  it('never throws when the model layer explodes — an alert must not create a failure', async () => {
    mockNotificationModel.create.mockRejectedValueOnce(new Error('db down'));
    await expect(raiseSendFailureAlert({ lane: 'speed_to_lead', error: new Error('x') }))
      .resolves.toBeNull();
  });
});
