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

const { buildErrorEvent, normalizeRoute } = await import('../../services/monitoring/errorReporter.mjs');

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

/**
 * Second hostile probe, 2026-07-29. The first fix cut only on a literal '?' and
 * '#'. These are the ways a secret still reached the event afterwards.
 */
describe('separators and path-embedded secrets', () => {
  it('strips a PERCENT-ENCODED question mark', () => {
    expect(normalizeRoute('/api/x%3Ftoken=secret123')).toBe('/api/x');
  });

  it('strips matrix-parameter separators', () => {
    expect(normalizeRoute('/api/x;token=secret123')).toBe('/api/x');
  });

  // Magic-link and verification routes put the token in the PATH, not the query.
  it('redacts a JWT that IS a path segment', () => {
    expect(normalizeRoute('/api/verify/eyJhbGciOiJIUzI1NiJ9.abc.def')).toBe('/api/verify/:token');
  });

  it('redacts a long opaque token path segment', () => {
    expect(normalizeRoute('/claim/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).toBe('/claim/:token');
  });

  // Over-matching would destroy the diagnostic value the route exists to provide.
  it.each([
    ['/api/files/report.tar.gz'],
    ['/static/app.min.js'],
    ['/api/v1/users'],
    ['/api/workout-sessions/history'],
    ['/dashboard/client/overview'],
  ])('leaves the innocent route %s untouched', (p) => {
    expect(normalizeRoute(p)).toBe(p);
  });
});

describe('bounded capture — one pathological error cannot eat memory', () => {
  it('truncates a huge stack', () => {
    const err = new Error('boom');
    err.stack = 'x'.repeat(500_000);
    const e = buildErrorEvent({ err, req: { originalUrl: '/a' }, statusCode: 500 });
    expect(e.stack.length).toBeLessThan(9_000);
    expect(e.stack).toContain('truncated');
  });

  it('truncates a huge message', () => {
    const e = buildErrorEvent({ err: new Error('y'.repeat(200_000)), req: { originalUrl: '/a' }, statusCode: 500 });
    expect(e.message.length).toBeLessThan(3_000);
  });

  it('leaves a normal message intact', () => {
    const e = buildErrorEvent({ err: new Error('ordinary failure'), req: { originalUrl: '/a' }, statusCode: 500 });
    expect(e.message).toBe('ordinary failure');
  });
});

describe('referer is a URL and therefore carries secrets', () => {
  it('strips the query string from a whitelisted referer', () => {
    const e = buildErrorEvent({
      err: new Error('e'),
      req: { originalUrl: '/a', headers: { referer: 'https://app.test/reset?token=secret123' } },
      statusCode: 500,
    });
    expect(JSON.stringify(e)).not.toContain('secret123');
  });

  it('flattens a repeated header to a string', () => {
    const e = buildErrorEvent({
      err: new Error('e'),
      req: { originalUrl: '/a', headers: { 'user-agent': ['a', 'b'] } },
      statusCode: 500,
    });
    expect(typeof e.headers['user-agent']).toBe('string');
  });

  it('bounds an absurdly long header', () => {
    const e = buildErrorEvent({
      err: new Error('e'),
      req: { originalUrl: '/a', headers: { 'user-agent': 'u'.repeat(50_000) } },
      statusCode: 500,
    });
    expect(e.headers['user-agent'].length).toBeLessThan(400);
  });
});
