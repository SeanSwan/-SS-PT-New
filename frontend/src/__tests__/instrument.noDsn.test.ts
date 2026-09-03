/**
 * The merge-safety proof for EX-4.
 *
 * This file ships to production BEFORE the DSN reaches Render. If the module
 * were not genuinely inert without one, merging it would start shipping user
 * data to a third party that nobody has configured, reviewed, or paid for.
 *
 * NOTE: there is deliberately no "made no network call" test. A fetch spy cannot
 * prove that - Sentry resolves a native fetch from a fresh iframe precisely to
 * dodge monkeypatching, so a stubbed global is never consulted, and such an
 * assertion stayed green under a deliberately-broken unconditional init. What
 * IS provable, and is proved here, is that no client exists and that the app's
 * own reporting entry point does nothing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/react';

describe('instrument.ts without a DSN', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_SENTRY_DSN', '');
  });

  afterEach(() => { vi.unstubAllEnvs(); });

  it('constructs no Sentry client', async () => {
    const mod = await import('../instrument');
    expect(mod.isErrorReportingEnabled).toBe(false);
    expect(Sentry.getClient()).toBeUndefined();
  });

  it('reportError is a no-op that never initialises the SDK', async () => {
    const mod = await import('../instrument');
    mod.reportError(new Error('boom'));
    await Promise.resolve();
    expect(Sentry.getClient()).toBeUndefined();
  });

  it('reportError does not throw on any input', async () => {
    const mod = await import('../instrument');
    expect(() => mod.reportError(undefined)).not.toThrow();
    expect(() => mod.reportError('a string, not an Error')).not.toThrow();
  });
});
