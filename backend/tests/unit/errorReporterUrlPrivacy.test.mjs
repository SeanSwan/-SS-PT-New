/**
 * ============================================================================
 * ERROR REPORTER — URL / QUERY-STRING PII  (SWA-75, hostile review 2026-07-29)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * The reporter captures `req.originalUrl` as the route. Request bodies are
 * refused outright and headers are whitelisted — but the URL was never tested,
 * and URLs carry query strings, and query strings carry reset tokens, API keys,
 * JWTs, emails and phone numbers.
 *
 * A password-reset link is the sharpest case: `/api/auth/reset?token=...` is a
 * live credential. If a 5xx on that route captured the token, the error store
 * would hold a working account-takeover primitive.
 *
 * Found by hostile review of my own observability slice. These tests exist to
 * prove the containment, not to assume it.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { buildErrorEvent } = await import('../../services/monitoring/errorReporter.mjs');

const eventFor = (url) =>
  buildErrorEvent({ err: new Error('boom'), req: { method: 'GET', originalUrl: url }, statusCode: 500 });

const serialize = (e) => JSON.stringify(e);

describe('query-string secrets never survive into an error event', () => {
  it.each([
    ['an email',        '/api/x?email=victim@example.test',                              'victim@example.test'],
    ['a phone number',  '/api/x?phone=555-867-5309',                                     '555-867-5309'],
    ['an api key',      '/api/x?key=sk-live-abcdef1234567890abcdef',                     'sk-live-abcdef1234567890abcdef'],
    ['a JWT',           '/api/x?t=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdef.ghijkl',   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'],
  ])('scrubs %s from the captured route', (_label, url, secret) => {
    expect(serialize(eventFor(url))).not.toContain(secret);
  });

  // The sharpest case: a reset token in a URL is a live account-takeover primitive.
  it('does not retain a password-reset token', () => {
    const token = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    expect(serialize(eventFor(`/api/auth/reset-password?token=${token}`))).not.toContain(token);
  });

  it('still records enough route to be actionable', () => {
    const e = eventFor('/api/clients/61/summary?email=victim@example.test');
    expect(e.route).toContain('/api/clients');
    expect(e.method).toBe('GET');
    expect(e.statusCode).toBe(500);
  });

  it('groups by route shape, so a secret cannot fragment the fingerprint', () => {
    const a = eventFor('/api/auth/reset?token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const b = eventFor('/api/auth/reset?token=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    expect(a.fingerprint).toBe(b.fingerprint);
  });
});
