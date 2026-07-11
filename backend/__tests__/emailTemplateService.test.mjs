/**
 * emailTemplateService — REAL module (drives the fail-closed CAN-SPAM guards + HTML escaping
 * that the mocked automation E2E never exercised — hostile-review findings M1/M3/H2/L1/M2).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { sendGrid } = vi.hoisted(() => ({ sendGrid: vi.fn() }));
vi.mock('../services/sendgridService.mjs', () => ({ sendGridEmail: sendGrid }));

const { sendTemplatedEmail, buildNurtureEmailVars } = await import('../services/emailTemplateService.mjs');

const OK_VARS = { clientName: 'Alex', consultUrl: 'https://x/c', unsubscribeUrl: 'https://x/u?t=1' };

describe('sendTemplatedEmail — fail-closed compliance + escaping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SWAN_BUSINESS_ADDRESS = '123 Main St, City, ST 00000';
    sendGrid.mockResolvedValue({ success: true });
  });
  afterEach(() => { delete process.env.SWAN_BUSINESS_ADDRESS; });

  it('FAILS CLOSED (no send) when unsubscribeUrl is missing (M3)', async () => {
    const res = await sendTemplatedEmail({ to: 'a@b.com', templateName: 'welcome', variables: { clientName: 'Alex' } });
    expect(res).toMatchObject({ success: false, error: 'missing_unsubscribe_url' });
    expect(sendGrid).not.toHaveBeenCalled();
  });

  it('FAILS CLOSED (no send) when SWAN_BUSINESS_ADDRESS is unset (M1)', async () => {
    delete process.env.SWAN_BUSINESS_ADDRESS;
    const res = await sendTemplatedEmail({ to: 'a@b.com', templateName: 'welcome', variables: OK_VARS });
    expect(res).toMatchObject({ success: false, error: 'missing_business_address' });
    expect(sendGrid).not.toHaveBeenCalled();
  });

  it('sends with RFC 8058 List-Unsubscribe headers when compliant (M2)', async () => {
    await sendTemplatedEmail({ to: 'a@b.com', templateName: 'welcome', variables: OK_VARS });
    expect(sendGrid).toHaveBeenCalledTimes(1);
    const arg = sendGrid.mock.calls[0][0];
    expect(arg.headers['List-Unsubscribe']).toBe('<https://x/u?t=1>');
    expect(arg.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('HTML-escapes a malicious clientName — no raw tag in outbound HTML (H2)', async () => {
    await sendTemplatedEmail({ to: 'a@b.com', templateName: 'welcome', variables: { ...OK_VARS, clientName: '<img src=x onerror=alert(1)>' } });
    const arg = sendGrid.mock.calls[0][0];
    expect(arg.html).not.toContain('<img src=x onerror=');
    expect(arg.html).toContain('&lt;img');
  });

  it('inserts a `$&` name literally (no replace-pattern corruption) (L1)', async () => {
    await sendTemplatedEmail({ to: 'a@b.com', templateName: 'welcome', variables: { ...OK_VARS, clientName: 'Tom $& Jerry' } });
    const arg = sendGrid.mock.calls[0][0];
    expect(arg.text).toContain('Tom $& Jerry');       // text: literal, no escape
    expect(arg.html).toContain('Tom $&amp; Jerry');    // html: & escaped, $ literal
  });
});

describe('buildNurtureEmailVars — signed unsubscribe URL', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { delete process.env.SWAN_UNSUBSCRIBE_SECRET; delete process.env.API_URL; });

  it('yields NO unsubscribeUrl when the signing env is unset (→ send fails closed)', () => {
    const vars = buildNurtureEmailVars({ leadId: 5, clientName: 'Alex' });
    expect(vars.unsubscribeUrl).toBeUndefined();
  });

  it('yields a signed unsubscribeUrl at the API route when base + secret are set', () => {
    process.env.API_URL = 'https://api.x';
    process.env.SWAN_UNSUBSCRIBE_SECRET = 'sekret';
    const vars = buildNurtureEmailVars({ leadId: 5, clientName: 'Alex' });
    expect(vars.unsubscribeUrl).toMatch(/^https:\/\/api\.x\/api\/marketing\/unsubscribe\?lead=5&token=[a-f0-9]{32}$/);
  });
});
