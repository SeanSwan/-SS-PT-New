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
vi.mock('../services/adminAlertService.mjs', () => ({
  raiseSendFailureAlert: vi.fn().mockResolvedValue(null),
}));

const { sendGridEmail } = await import('../services/sendgridService.mjs');
const { raiseSendFailureAlert } = await import('../services/adminAlertService.mjs');
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

/**
 * Observability — added 2026-08-14 (activation-debt audit, step 6).
 *
 * The three properties above make failure SAFE. They also made it SILENT: every
 * path logs and returns. Once the flag is armed, a dead sender key produces no
 * signal anywhere Sean looks, so "no leads replied to" and "everything fine"
 * are the same observation. These prove the failure is now surfaced — without
 * giving the alert any way to block a capture.
 */
describe('sendSpeedToLeadReply — failure is surfaced, never blocking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env[FLAG];
  });

  it('raises an alert on a soft send failure, with IDs only', async () => {
    process.env[FLAG] = 'true';
    sendGridEmail.mockResolvedValueOnce({ success: false, error: new Error('quota') });
    await sendSpeedToLeadReply({ email: 'lead@example.com', name: 'Alex', leadId: 42, source: 'consult' });

    expect(raiseSendFailureAlert).toHaveBeenCalledTimes(1);
    expect(raiseSendFailureAlert.mock.calls[0][0]).toMatchObject({
      lane: 'speed_to_lead', context: { leadId: 42, source: 'consult' },
    });
  });

  it('raises an alert when the email layer REJECTS', async () => {
    process.env[FLAG] = 'true';
    sendGridEmail.mockRejectedValueOnce(new Error('sendgrid down'));
    await sendSpeedToLeadReply({ email: 'lead@example.com', leadId: 7, source: 'prism' });
    expect(raiseSendFailureAlert).toHaveBeenCalledTimes(1);
    expect(raiseSendFailureAlert.mock.calls[0][0].lane).toBe('speed_to_lead');
  });

  /**
   * Rule 8. The call site holds the lead's real address in scope, so the only
   * thing stopping it reaching an admin-visible, LLM-read row is that nobody
   * passes it. Assert the argument SHAPE, not just its absence from a string —
   * a future refactor that spreads `opts` into context would defeat a weaker check.
   */
  it('never hands the lead\'s email or name to the alert', async () => {
    process.env[FLAG] = 'true';
    sendGridEmail.mockResolvedValueOnce({ success: false, error: new Error('quota') });
    await sendSpeedToLeadReply({ email: 'private@person.com', name: 'Alex', leadId: 42, source: 'consult' });

    const arg = raiseSendFailureAlert.mock.calls[0][0];
    expect(Object.keys(arg.context).sort()).toEqual(['leadId', 'source']);
    expect(JSON.stringify(arg)).not.toContain('private@person.com');
    expect(JSON.stringify(arg)).not.toContain('Alex');
  });

  it('does NOT alert on success', async () => {
    process.env[FLAG] = 'true';
    await sendSpeedToLeadReply({ email: 'lead@example.com', leadId: 1 });
    expect(raiseSendFailureAlert).not.toHaveBeenCalled();
  });

  it('does NOT alert when the flag is off (dark is not a failure)', async () => {
    await sendSpeedToLeadReply({ email: 'lead@example.com', leadId: 1 });
    expect(raiseSendFailureAlert).not.toHaveBeenCalled();
  });

  it('does NOT alert on an invalid email — that is caller error, not a send failure', async () => {
    process.env[FLAG] = 'true';
    await sendSpeedToLeadReply({ email: 'not-an-email' });
    expect(raiseSendFailureAlert).not.toHaveBeenCalled();
  });

  /**
   * The one thing this slice must never do. If the alert path can throw or
   * reject into the send path, an undelivered email becomes a LOST LEAD —
   * strictly worse than the silence it replaces.
   */
  it('a THROWING alert never breaks capture', async () => {
    process.env[FLAG] = 'true';
    sendGridEmail.mockResolvedValueOnce({ success: false, error: new Error('quota') });
    raiseSendFailureAlert.mockImplementationOnce(() => { throw new Error('alert exploded'); });
    await expect(sendSpeedToLeadReply({ email: 'lead@example.com', leadId: 1 }))
      .resolves.toEqual({ sent: false, error: 'send_failed' });
  });

  /**
   * ⚠ REGRESSION ARMOUR, NOT EVIDENCE — and saying so is the point.
   *
   * This test passes with OR without the `.catch()` guard in
   * `alertSendFailure`. I confirmed that by deleting the guard and re-running:
   * still green. I then validated the probe itself (a deliberately orphaned
   * `Promise.reject` DOES fire the listener here), so the negative is real, not
   * a broken instrument.
   *
   * The reason it cannot discriminate: `raiseSendFailureAlert` is mocked, and
   * vitest attaches its own handler to a `mockRejectedValueOnce` promise to
   * populate `.mock.results` — so the rejection is never orphaned no matter
   * what the send path does.
   *
   * The guard STAYS regardless, as defence in depth: the real
   * `raiseSendFailureAlert` cannot currently reject (its own try/catch covers
   * every path), so today the `.catch()` is protecting against a FUTURE edit
   * that removes that internal guard. If that happened, Node 15+ treats an
   * unhandled rejection as fatal by default — an undelivered email would become
   * a dead API process.
   *
   * What this test genuinely proves: capture still returns the right result when
   * the alert rejects. That is worth keeping. It is not proof the guard bites.
   */
  it('a REJECTING alert still returns the correct capture result [armour, not proof]', async () => {
    process.env[FLAG] = 'true';
    const unhandled = [];
    const onUnhandled = (reason) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      sendGridEmail.mockResolvedValueOnce({ success: false, error: new Error('quota') });
      raiseSendFailureAlert.mockRejectedValueOnce(new Error('alert rejected'));

      await expect(sendSpeedToLeadReply({ email: 'lead@example.com', leadId: 1 }))
        .resolves.toEqual({ sent: false, error: 'send_failed' });

      // Let the microtask queue drain so an orphaned rejection would be reported.
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});
