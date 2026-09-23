/**
 * emailAutomationSender — unit tests
 * ==================================
 * The sender is the ONLY bridge between the drip processor and SendGrid, and it
 * must NEVER throw (03-contracts.md: "a failed email must NEVER break contact
 * submission, lead capture, or the processor loop").
 *
 * Every refusal is asserted on its EXACT literal, because those strings land in
 * `automation_logs.error` and are the operator's only explanation for a
 * non-delivery. A loose assertion here would let a typo ship to production.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendGridEmailMock, isConfiguredMock, loggerMock } = vi.hoisted(() => ({
  sendGridEmailMock: vi.fn(),
  isConfiguredMock: vi.fn(),
  loggerMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../services/sendgridService.mjs', () => ({
  sendGridEmail: sendGridEmailMock,
  isSendGridServiceConfigured: isConfiguredMock,
}));

vi.mock('../utils/logger.mjs', () => ({ default: loggerMock }));

import { sendAutomationEmail } from '../services/emailAutomationSender.mjs';

const LEAD = { id: 7, firstName: 'Marcus', email: 'marcus@example.com', tags: [] };

/** A log row as the processor would supply it. */
const makeLog = (over = {}) => ({
  id: 1,
  channel: 'email',
  templateName: 'stl_instant_reply',
  recipient: 'marcus@example.com',
  payloadJson: { clientName: 'Marcus' },
  ...over,
});

let envSnapshot;

beforeEach(() => {
  vi.clearAllMocks();
  envSnapshot = {
    LEAD_UNSUB_SECRET: process.env.LEAD_UNSUB_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
  };
  process.env.LEAD_UNSUB_SECRET = 'sender-test-secret';
  delete process.env.PUBLIC_BASE_URL;
  isConfiguredMock.mockReturnValue(true);
  sendGridEmailMock.mockResolvedValue({ success: true });
});

afterEach(() => {
  for (const [k, v] of Object.entries(envSnapshot)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('sendAutomationEmail — success path', () => {
  it('sends once with the rendered subject, text and html', async () => {
    const result = await sendAutomationEmail({ log: makeLog(), lead: LEAD });

    expect(result).toEqual({ success: true });
    expect(sendGridEmailMock).toHaveBeenCalledTimes(1);

    const call = sendGridEmailMock.mock.calls[0][0];
    expect(call.to).toBe('marcus@example.com');
    expect(call.subject).toBe("Got your message \u2014 here's your next step, Marcus");
    expect(call.text).toContain('Marcus');
    expect(call.html).toContain('<!DOCTYPE html');
    expect(call.html).toContain("You're receiving this because you contacted SwanStudios.");
  });

  it('includes a working unsubscribe link when a secret is configured', async () => {
    await sendAutomationEmail({ log: makeLog(), lead: LEAD });
    const { html } = sendGridEmailMock.mock.calls[0][0];
    expect(html).toContain('/api/leads/unsubscribe?lid=7&amp;tok=');
  });

  it('prefers payloadJson.clientName over lead.firstName for firstName', async () => {
    await sendAutomationEmail({
      log: makeLog({ payloadJson: { clientName: 'Beyonce' } }),
      lead: LEAD,
    });
    const { subject } = sendGridEmailMock.mock.calls[0][0];
    expect(subject).toContain('Beyonce');
    expect(subject).not.toContain('Marcus');
  });

  it('falls back to "there" when no name exists anywhere', async () => {
    await sendAutomationEmail({
      log: makeLog({ payloadJson: null }),
      lead: { id: 9, tags: [] },
    });
    const { text, html } = sendGridEmailMock.mock.calls[0][0];
    expect(text).toContain('Hey there,');
    expect(html).toContain('there');
  });
});

describe('sendAutomationEmail — refusals (exact literals)', () => {
  it('missing_recipient when recipient is absent', async () => {
    const r = await sendAutomationEmail({ log: makeLog({ recipient: null }), lead: LEAD });
    expect(r).toEqual({ success: false, error: 'missing_recipient' });
    expect(sendGridEmailMock).not.toHaveBeenCalled();
  });

  it('missing_recipient when recipient is not an address', async () => {
    const r = await sendAutomationEmail({ log: makeLog({ recipient: 'not-an-email' }), lead: LEAD });
    expect(r).toEqual({ success: false, error: 'missing_recipient' });
    expect(sendGridEmailMock).not.toHaveBeenCalled();
  });

  it('lead_email_unsubscribed — and SendGrid is never called', async () => {
    const r = await sendAutomationEmail({
      log: makeLog(),
      lead: { ...LEAD, tags: ['hot', 'email-unsubscribed'] },
    });
    expect(r).toEqual({ success: false, error: 'lead_email_unsubscribed' });
    expect(sendGridEmailMock).not.toHaveBeenCalled();
  });

  it('unknown_template:<name> for a template that does not exist', async () => {
    const r = await sendAutomationEmail({ log: makeLog({ templateName: 'nope' }), lead: LEAD });
    expect(r).toEqual({ success: false, error: 'unknown_template:nope' });
    expect(sendGridEmailMock).not.toHaveBeenCalled();
  });

  it('unknown_template:<name> even when templateName is undefined', async () => {
    const r = await sendAutomationEmail({ log: makeLog({ templateName: undefined }), lead: LEAD });
    expect(r.success).toBe(false);
    expect(r.error.startsWith('unknown_template:')).toBe(true);
  });

  it('sendgrid_not_configured when transport is off', async () => {
    isConfiguredMock.mockReturnValue(false);
    const r = await sendAutomationEmail({ log: makeLog(), lead: LEAD });
    expect(r).toEqual({ success: false, error: 'sendgrid_not_configured' });
    expect(sendGridEmailMock).not.toHaveBeenCalled();
  });

  it('sendgrid_error:<message> when the transport fails', async () => {
    sendGridEmailMock.mockResolvedValue({ success: false, error: new Error('bad api key') });
    const r = await sendAutomationEmail({ log: makeLog(), lead: LEAD });
    expect(r).toEqual({ success: false, error: 'sendgrid_error:bad api key' });
  });

  it('sendgrid_error:<message> when the error carries no message', async () => {
    sendGridEmailMock.mockResolvedValue({ success: false });
    const r = await sendAutomationEmail({ log: makeLog(), lead: LEAD });
    expect(r).toEqual({ success: false, error: 'sendgrid_error:unknown error' });
  });
});

describe('sendAutomationEmail — never-throw guarantee', () => {
  it('converts a transport that THROWS into a visible failure, not an exception', async () => {
    sendGridEmailMock.mockRejectedValue(new Error('socket hang up'));
    const r = await sendAutomationEmail({ log: makeLog(), lead: LEAD });
    expect(r).toEqual({ success: false, error: 'sendgrid_error:socket hang up' });
  });

  it('survives a null log entirely', async () => {
    await expect(sendAutomationEmail({ log: null, lead: null })).resolves.toEqual({
      success: false,
      error: 'missing_recipient',
    });
  });

  it('handles a null lead (soft leadId) and still sends', async () => {
    const r = await sendAutomationEmail({ log: makeLog(), lead: null });
    expect(r).toEqual({ success: true });
    expect(sendGridEmailMock).toHaveBeenCalledTimes(1);
  });

  it('does not leak the full recipient address into the log line', async () => {
    await sendAutomationEmail({ log: makeLog(), lead: LEAD });
    const logged = loggerMock.info.mock.calls.map((c) => String(c[0])).join(' ');
    expect(logged).not.toContain('marcus@example.com');
    expect(logged).toContain('m***@example.com');
  });
});
