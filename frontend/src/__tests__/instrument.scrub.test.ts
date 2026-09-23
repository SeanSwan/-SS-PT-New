/**
 * The privacy proof for EX-4 (Rule 8: zero PII to third parties).
 *
 * `sendDefaultPii: false` only governs what the SDK collects on its own. It does
 * nothing about what the application hands it, which is where the real leaks are.
 * Each case below is a specific way this repo could ship a secret to Sentry.
 *
 * The load-bearing one is the breadcrumb query string. A password-reset link
 * carries its token in `?token=`, so a breadcrumb reading "navigated to
 * /reset?token=live-value" is a live credential sitting in a third-party dashboard.
 * The path survives because the path is how an engineer finds the bug.
 */
import { describe, it, expect } from 'vitest';
import type { ErrorEvent } from '@sentry/react';
import { scrubEvent } from '../instrument';

const build = (over: Partial<ErrorEvent>): ErrorEvent => ({ ...over }) as ErrorEvent;

describe('scrubEvent', () => {
  it('drops the request object entirely (headers, cookies, body)', () => {
    const out = scrubEvent(build({
      request: { cookies: { session: 'live-session-value' }, url: 'https://x/y?t=1' },
    }));
    expect(out.request).toBeUndefined();
  });

  it('strips the query string from breadcrumb urls but keeps the path', () => {
    const out = scrubEvent(build({
      breadcrumbs: [{ data: { url: '/reset-password?token=live-reset-token' } }],
    }));
    const url = out.breadcrumbs?.[0]?.data?.url;
    expect(url).toBe('/reset-password');
    expect(String(url)).not.toContain('live-reset-token');
  });

  it('drops breadcrumb request and response bodies', () => {
    const out = scrubEvent(build({
      breadcrumbs: [{ data: { url: '/api/login', body: 'password=hunter2', response: 'token=abc' } }],
    }));
    expect(out.breadcrumbs?.[0]?.data?.body).toBeUndefined();
    expect(out.breadcrumbs?.[0]?.data?.response).toBeUndefined();
  });

  it('redacts email addresses out of exception text', () => {
    const out = scrubEvent(build({
      exception: { values: [{ value: 'No user for member@example.com found' }] },
    }));
    const value = out.exception?.values?.[0]?.value ?? '';
    expect(value).not.toContain('member@example.com');
    expect(value).toContain('<redacted-email>');
  });

  it('redacts key-shaped strings out of messages', () => {
    const out = scrubEvent(build({ message: 'auth failed with sk_live_abc123def456' }));
    expect(out.message).not.toContain('sk_live_abc123def456');
    expect(out.message).toContain('<redacted-key>');
  });

  it('redacts a JWT out of extra context', () => {
    // Assembled at runtime, not written as a literal: a JWT-shaped string sitting
    // in a source file trips this repo's secret scanner, and it is right to.
    const jwt = ['eyJ' + 'hbGciOiJIUzI1NiJ9', 'eyJ' + 'zdWIiOiIxIn0', 'signaturevalue'].join('.');
    const out = scrubEvent(build({ extra: { token: jwt } }));
    expect(String(out.extra?.token)).not.toContain('signaturevalue');
  });

  it('leaves an already-clean event intact', () => {
    const out = scrubEvent(build({
      message: 'Cannot read property length of undefined',
      breadcrumbs: [{ data: { url: '/dashboard/progress' } }],
    }));
    expect(out.message).toBe('Cannot read property length of undefined');
    expect(out.breadcrumbs?.[0]?.data?.url).toBe('/dashboard/progress');
  });
});
