/**
 * ============================================================================
 * ERROR REPORTER — PII CONTAINMENT + 5xx CAPTURE  (SWA-75, 2026-07-29)
 * ============================================================================
 *
 * WHY THESE TESTS EXIST
 * Two things, one of which was a lie in user-facing copy:
 *
 *  1. `core/middleware/errorHandler.mjs` told users "Our team has been
 *     notified." Nothing notified anyone (rule 75 violation). It now calls
 *     reportServerError, so the sentence is true.
 *  2. AI features had threshold alerting; general HTTP 5xx had no tracking,
 *     grouping or alert anywhere.
 *
 * Kimi K3 (2026-07-29) called the PII-scrubbing config "the only real work, and
 * non-negotiable given minors' data — write a test that feeds a PII-laden fake
 * error through and asserts the payload is clean." That is the first block below.
 *
 * The containment strategy is deliberately blunt: request bodies are never
 * captured at all (absent, not truncated), headers are whitelisted, identity is
 * an id + role only, and everything still passes through the repo's existing
 * redactLogValue rules.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const {
  reportServerError,
  buildErrorEvent,
  getErrorSnapshot,
  registerErrorSink,
  fingerprint,
  __resetErrorReporter,
} = await import('../../services/monitoring/errorReporter.mjs');

/** A request carrying every kind of thing that must never leave the process. */
const piiRequest = () => ({
  method: 'POST',
  originalUrl: '/api/clients/61/onboarding',
  headers: {
    'user-agent': 'Mozilla/5.0',
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload.sig',
    cookie: 'session=abc123; refresh=def456',
    'x-api-key': 'sk-live-should-never-appear',
  },
  user: { id: 61, role: 'client', email: 'client@example.test', firstName: 'Alex' },
  body: {
    email: 'victim@example.test',
    phone: '555-867-5309',
    ssn: '123-45-6789',
    password: 'hunter2',
    injuryNotes: 'left knee reconstruction 2019',
  },
});

const serialize = (event) => JSON.stringify(event);

beforeEach(() => {
  __resetErrorReporter();
});

describe('PII containment — nothing sensitive may leave the process', () => {
  it('never captures the request body at all', () => {
    const event = buildErrorEvent({ err: new Error('boom'), req: piiRequest(), statusCode: 500 });
    expect(event.body).toBeUndefined();
    const s = serialize(event);
    for (const secret of ['victim@example.test', '555-867-5309', '123-45-6789', 'hunter2', 'left knee reconstruction']) {
      expect(s).not.toContain(secret);
    }
  });

  it('drops authorization, cookie and api-key headers', () => {
    const event = buildErrorEvent({ err: new Error('boom'), req: piiRequest(), statusCode: 500 });
    expect(event.headers.authorization).toBeUndefined();
    expect(event.headers.cookie).toBeUndefined();
    expect(event.headers['x-api-key']).toBeUndefined();
    const s = serialize(event);
    expect(s).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(s).not.toContain('sk-live-should-never-appear');
    expect(s).not.toContain('abc123');
  });

  it('keeps only the whitelisted headers', () => {
    const event = buildErrorEvent({ err: new Error('boom'), req: piiRequest(), statusCode: 500 });
    expect(event.headers['user-agent']).toBe('Mozilla/5.0');
    expect(Object.keys(event.headers).every((k) =>
      ['user-agent', 'referer', 'content-type', 'accept'].includes(k))).toBe(true);
  });

  // Rule 8: client IDs only, names mapped client-side.
  it('records identity as id + role, never name or email', () => {
    const event = buildErrorEvent({ err: new Error('boom'), req: piiRequest(), statusCode: 500 });
    expect(event.userId).toBe(61);
    expect(event.userRole).toBe('client');
    const s = serialize(event);
    expect(s).not.toContain('client@example.test');
    expect(s).not.toContain('Alex');
  });

  it('scrubs PII that leaks through the ERROR MESSAGE itself', () => {
    const err = new Error('failed for user victim@example.test with ssn 123-45-6789');
    const event = buildErrorEvent({ err, req: piiRequest(), statusCode: 500 });
    const s = serialize(event);
    expect(s).not.toContain('victim@example.test');
    expect(s).not.toContain('123-45-6789');
  });

  it('what reaches the SINK is the scrubbed event, not the raw one', () => {
    const captured = [];
    registerErrorSink((e) => captured.push(e));
    reportServerError({ err: new Error('boom for victim@example.test'), req: piiRequest(), statusCode: 500 });
    expect(captured).toHaveLength(1);
    expect(serialize(captured[0])).not.toContain('victim@example.test');
    expect(captured[0].body).toBeUndefined();
  });
});

describe('5xx capture and grouping', () => {
  it('ignores 4xx — a client mistake is not an outage', () => {
    expect(reportServerError({ err: new Error('bad input'), req: piiRequest(), statusCode: 400 })).toBeNull();
    expect(getErrorSnapshot().serverErrorsInWindow).toBe(0);
  });

  it.each([[500], [502], [503]])('records a %i', (code) => {
    expect(reportServerError({ err: new Error('boom'), req: piiRequest(), statusCode: code })).not.toBeNull();
  });

  // A flood must read as ONE problem, not 400 of them.
  it('collapses record ids so the same fault groups together', () => {
    const mk = (id) => ({ method: 'GET', originalUrl: `/api/clients/${id}/summary` });
    for (const id of [61, 62, 63, 64]) {
      reportServerError({ err: new Error('boom'), req: mk(id), statusCode: 500 });
    }
    const snap = getErrorSnapshot();
    expect(snap.serverErrorsInWindow).toBe(4);
    expect(snap.distinctProblems).toBe(1);
    expect(snap.topProblems[0].count).toBe(4);
  });

  it('separates genuinely different faults', () => {
    reportServerError({ err: new TypeError('a'), req: { originalUrl: '/api/x' }, statusCode: 500 });
    reportServerError({ err: new RangeError('b'), req: { originalUrl: '/api/y' }, statusCode: 503 });
    expect(getErrorSnapshot().distinctProblems).toBe(2);
  });

  it('collapses uuids as well as numeric ids', () => {
    const a = fingerprint({ name: 'Error', routePath: '/api/g/3f2504e0-4f89-11d3-9a0c-0305e82c3301/x', statusCode: 500 });
    const b = fingerprint({ name: 'Error', routePath: '/api/g/6ba7b810-9dad-11d1-80b4-00c04fd430c8/x', statusCode: 500 });
    expect(a).toBe(b);
  });
});

describe('reporting can never break a request', () => {
  it('survives a throwing sink and disables it', () => {
    registerErrorSink(() => { throw new Error('sink exploded'); });
    expect(() => reportServerError({ err: new Error('boom'), req: piiRequest(), statusCode: 500 })).not.toThrow();
    expect(getErrorSnapshot().sinkConfigured).toBe(false);
  });

  it('survives a rejecting async sink', () => {
    registerErrorSink(() => Promise.reject(new Error('nope')));
    expect(() => reportServerError({ err: new Error('boom'), req: piiRequest(), statusCode: 500 })).not.toThrow();
  });

  it('survives a malformed request object', () => {
    expect(() => reportServerError({ err: new Error('boom'), req: null, statusCode: 500 })).not.toThrow();
    expect(() => reportServerError({ err: null, req: undefined, statusCode: 500 })).not.toThrow();
  });

  it('produces a snapshot with no PII by construction', () => {
    reportServerError({ err: new Error('boom for victim@example.test'), req: piiRequest(), statusCode: 500 });
    expect(serialize(getErrorSnapshot())).not.toContain('victim@example.test');
  });
});

describe('wiring — the global handler actually calls this', () => {
  it('errorHandler.mjs reports server errors', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../core/middleware/errorHandler.mjs'),
      'utf8'
    );
    expect(src).toContain('reportServerError({ err, req, statusCode })');
    // and the reassurance it prints must remain backed by that call
    expect(src).toContain('Our team has been notified');
  });
});
