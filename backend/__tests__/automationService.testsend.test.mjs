/**
 * automationService — guarded nurture test send.
 * The single manual-approval send before arming outbound automation. Every guard
 * must hold: confirm:true, valid single phone, known template, owner allowlist (when
 * configured). Number is PII-masked in the result. smsService + models mocked — the
 * real Twilio path is never hit.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const { sendTemplated, listTemplates } = vi.hoisted(() => ({
  sendTemplated: vi.fn(),
  listTemplates: vi.fn(() => [{ name: 'welcome' }, { name: 'follow_up_day1' }]),
}));

vi.mock('../models/index.mjs', () => ({ getAllModels: () => ({ AutomationSequence: {}, AutomationLog: {}, User: {} }) }));
vi.mock('../services/smsService.mjs', () => ({
  sendTemplatedSMS: sendTemplated,
  sendSmsMessage: vi.fn(),
  listSmsTemplates: listTemplates,
}));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { sendNurtureTestMessage } = await import('../services/automationService.mjs');

describe('sendNurtureTestMessage (guarded test send)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTemplates.mockReturnValue([{ name: 'welcome' }, { name: 'follow_up_day1' }]);
    sendTemplated.mockResolvedValue({ success: true, body: 'Welcome to SwanStudios, Alex!' });
    delete process.env.OWNER_PHONE;
    delete process.env.OWNER_WIFE_PHONE;
  });
  afterEach(() => { delete process.env.OWNER_PHONE; delete process.env.OWNER_WIFE_PHONE; });

  it('refuses without confirm:true (no send)', async () => {
    const r = await sendNurtureTestMessage({ to: '+15551230000', templateName: 'welcome' });
    expect(r).toMatchObject({ success: false, error: 'confirm_required' });
    expect(sendTemplated).not.toHaveBeenCalled();
  });

  it('rejects an invalid phone (no send)', async () => {
    const r = await sendNurtureTestMessage({ to: 'not-a-phone', templateName: 'welcome', confirm: true });
    expect(r.error).toBe('invalid_phone');
    expect(sendTemplated).not.toHaveBeenCalled();
  });

  it('rejects an unknown template (no send)', async () => {
    const r = await sendNurtureTestMessage({ to: '+15551230000', templateName: 'nope', confirm: true });
    expect(r.error).toBe('unknown_template');
    expect(r.allowed).toContain('welcome');
    expect(sendTemplated).not.toHaveBeenCalled();
  });

  it('enforces the owner allowlist when configured (no send to a non-owner number)', async () => {
    process.env.OWNER_PHONE = '+15559998888';
    const r = await sendNurtureTestMessage({ to: '+15551230000', templateName: 'welcome', confirm: true });
    expect(r.error).toBe('not_in_test_allowlist');
    expect(sendTemplated).not.toHaveBeenCalled();
  });

  it('sends ONE templated message when fully valid + masks the number', async () => {
    const r = await sendNurtureTestMessage({
      to: '+15551239999', templateName: 'welcome', confirm: true,
      variables: { clientName: 'Alex' }, triggeredByUserId: 1,
    });
    expect(sendTemplated).toHaveBeenCalledTimes(1);
    expect(sendTemplated).toHaveBeenCalledWith({ to: '+15551239999', templateName: 'welcome', variables: { clientName: 'Alex' } });
    expect(r.success).toBe(true);
    expect(r.to).toBe('***9999');
    expect(r.to).not.toContain('1555');
    expect(r.body).toContain('Alex');
  });

  it('allows an owner number when the allowlist is configured', async () => {
    process.env.OWNER_PHONE = '+15559998888';
    const r = await sendNurtureTestMessage({ to: '+15559998888', templateName: 'welcome', confirm: true });
    expect(sendTemplated).toHaveBeenCalledTimes(1);
    expect(r.success).toBe(true);
  });

  it('surfaces a send failure without throwing', async () => {
    sendTemplated.mockResolvedValue({ success: false, error: 'Twilio not configured' });
    const r = await sendNurtureTestMessage({ to: '+15551239999', templateName: 'welcome', confirm: true });
    expect(r.success).toBe(false);
    expect(r.error).toBe('Twilio not configured');
  });
});
