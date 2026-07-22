/**
 * speedToLeadService tests (SWA-40 gate trial 2)
 * Proves the three contract properties of the instant lead acknowledgment:
 *  1. FAIL-CLOSED: no send unless SPEED_TO_LEAD_REPLY_ENABLED === 'true'
 *  2. Sends the branded instant reply to the LEAD's address when enabled
 *  3. NEVER BLOCKS CAPTURE: resolves normally even when the email layer throws/rejects
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../services/sendgridService.mjs', () => ({
  sendGridEmail: vi.fn().mockResolvedValue({ success: true }),
}));

const { sendGridEmail } = await import('../services/sendgridService.mjs');
const { sendSpeedToLeadReply } = await import('../services/speedToLeadService.mjs');

const FLAG = 'SPEED_TO_LEAD_REPLY_ENABLED';

describe('sendSpeedToLeadReply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env[FLAG];
  });
  afterEach(() => {
    delete process.env[FLAG];
  });

  it('fail-closed: does NOT send when SPEED_TO_LEAD_REPLY_ENABLED is unset', async () => {
    const result = await sendSpeedToLeadReply({ email: 'lead@example.com', name: 'Alex' });
    expect(result).toEqual({ sent: false, skipped: 'flag_off' });
    expect(sendGridEmail).not.toHaveBeenCalled();
  });

  it('fail-closed: does NOT send when the flag is "false" or any non-"true" value', async () => {
    for (const v of ['false', '1', 'TRUE', 'yes', '']) {
      process.env[FLAG] = v;
      await sendSpeedToLeadReply({ email: 'lead@example.com', name: 'Alex' });
    }
    expect(sendGridEmail).not.toHaveBeenCalled();
  });

  it('sends the branded instant reply to the lead when the flag is true', async () => {
    process.env[FLAG] = 'true';
    const result = await sendSpeedToLeadReply({ email: 'lead@example.com', name: 'Alex', leadId: 7, source: 'consult' });
    expect(result).toEqual({ sent: true });
    expect(sendGridEmail).toHaveBeenCalledTimes(1);
    const msg = sendGridEmail.mock.calls[0][0];
    expect(msg.to).toBe('lead@example.com');
    expect(msg.subject).toContain('Alex');
    expect(msg.text).toContain('SwanStudios');
    expect(msg.html).toContain('SwanStudios');
    expect(msg.html).toContain('one-time confirmation'); // transactional footer, not nurture unsubscribe
  });

  it('personalizes with a safe fallback when name is missing', async () => {
    process.env[FLAG] = 'true';
    await sendSpeedToLeadReply({ email: 'lead@example.com' });
    expect(sendGridEmail.mock.calls[0][0].subject).toContain('there');
  });

  it('skips invalid/missing email without calling the sender', async () => {
    process.env[FLAG] = 'true';
    expect(await sendSpeedToLeadReply({ email: 'not-an-email' })).toEqual({ sent: false, skipped: 'invalid_email' });
    expect(await sendSpeedToLeadReply({})).toEqual({ sent: false, skipped: 'invalid_email' });
    expect(sendGridEmail).not.toHaveBeenCalled();
  });

  it('capture is never blocked: resolves (does not throw) when the email layer REJECTS', async () => {
    process.env[FLAG] = 'true';
    sendGridEmail.mockRejectedValueOnce(new Error('sendgrid down'));
    await expect(sendSpeedToLeadReply({ email: 'lead@example.com', name: 'Alex' }))
      .resolves.toEqual({ sent: false, error: 'unexpected' });
  });

  it('capture is never blocked: reports send_failed on a soft failure result', async () => {
    process.env[FLAG] = 'true';
    sendGridEmail.mockResolvedValueOnce({ success: false, error: new Error('quota') });
    await expect(sendSpeedToLeadReply({ email: 'lead@example.com' }))
      .resolves.toEqual({ sent: false, error: 'send_failed' });
  });
});
