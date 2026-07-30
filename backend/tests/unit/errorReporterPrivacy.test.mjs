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
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

/**
 * The response-boundary reporter. Measured 2026-07-29: this codebase returns 5xx
 * DIRECTLY in 1,094 places across 203 files, none of which reach the global error
 * handler. Capturing only from that handler would have missed most server faults
 * while appearing to work — found by hostile review of this very slice.
 */
describe('response-boundary capture (the 1,094 direct 5xx returns)', () => {
  const runThrough = async (handler) => {
    const express = (await import('express')).default;
    const request = (await import('supertest')).default;
    const { serverErrorResponseReporter } = await import('../../services/monitoring/errorReporter.mjs');
    const app = express();
    app.use(serverErrorResponseReporter);
    app.get('/t', handler);
    return request(app).get('/t');
  };

  it('captures a 500 returned DIRECTLY, without next(err)', async () => {
    await runThrough((_req, res) => res.status(500).json({ error: 'internal' }));
    expect(getErrorSnapshot().serverErrorsInWindow).toBe(1);
  });

  it('captures a 503 returned directly', async () => {
    await runThrough((_req, res) => res.status(503).json({ error: 'unavailable' }));
    expect(getErrorSnapshot().serverErrorsInWindow).toBe(1);
  });

  it('ignores a 200', async () => {
    await runThrough((_req, res) => res.status(200).json({ ok: true }));
    expect(getErrorSnapshot().serverErrorsInWindow).toBe(0);
  });

  it('ignores a 404', async () => {
    await runThrough((_req, res) => res.status(404).json({ error: 'nope' }));
    expect(getErrorSnapshot().serverErrorsInWindow).toBe(0);
  });

  // A fault travelling through BOTH paths must be counted once.
  it('does not double-count a request the error handler already reported', async () => {
    await runThrough((req, res) => {
      req.__errorReported = true;
      res.status(500).json({ error: 'already captured' });
    });
    expect(getErrorSnapshot().serverErrorsInWindow).toBe(0);
  });

  it('never alters the response it observes', async () => {
    const res = await runThrough((_req, r) => r.status(500).json({ error: 'internal', keep: 'me' }));
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'internal', keep: 'me' });
  });
});

/** Read a file relative to THIS test file. */
function readRepoFile(relPath) {
  return readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), relPath), 'utf8');
}

/** backend/ root, derived from this test's location. */
function backendRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../..');
}

/**
 * Drop block and line comments so a prose MENTION of an identifier is not
 * mistaken for a call to it. Found the hard way: documenting "registerErrorSink()
 * has no runtime caller" inside errorHandler.mjs made that file register as a
 * caller of itself. Deliberately naive — good enough to tell code from prose,
 * and it never has to handle a comment marker inside a string literal here.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('wiring — the global handler actually calls this', () => {
  it('errorHandler.mjs reports server errors', () => {
    const src = readRepoFile('../../core/middleware/errorHandler.mjs');
    expect(src).toContain('reportServerError({ err, req, statusCode })');
  });
});

/**
 * Rule 75 guard, added by hostile round 23.
 *
 * The previous version of this suite asserted errorHandler.mjs must CONTAIN
 * "Our team has been notified" — i.e. a test was pinning the false claim in
 * place and would have failed anyone who corrected it. Capture is not
 * notification: registerErrorSink() has no runtime caller, so a 5xx reaches a
 * log line and an in-memory group and stops there.
 *
 * The assertion is now inverted, and made conditional on the real thing rather
 * than on a string: the strong "notified" wording is permitted only once some
 * runtime module actually registers a sink.
 */
describe('rule 75 — user-facing 5xx copy may not over-claim', () => {
  const COPY_SITES = [
    '../../core/middleware/errorHandler.mjs',
    '../../middleware/errorMiddleware.mjs',
  ];

  it('no runtime module registers an error sink (the premise of this guard)', () => {
    const SKIP_DIRS = new Set(['node_modules', 'tests', '__tests__', 'coverage', '.git']);
    const callers = [];
    (function walk(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
          continue;
        }
        if (!entry.name.endsWith('.mjs')) continue;
        // errorReporter.mjs DEFINES registerErrorSink; it is not a caller.
        if (entry.name === 'errorReporter.mjs') continue;
        const file = join(dir, entry.name);
        if (/registerErrorSink\s*\(/.test(stripComments(readFileSync(file, 'utf8')))) callers.push(file);
      }
    })(backendRoot());

    // If this ever fails, a sink DID get wired — at which point the stronger
    // "notified" copy becomes honest and the assertion below should be relaxed
    // DELIBERATELY, with the sink named. It must not drift back by accident.
    expect(callers).toEqual([]);
  });

  it.each(COPY_SITES)('%s does not tell users they were notified', (relPath) => {
    const src = readRepoFile(relPath);
    expect(src).not.toMatch(/message[^\n]*has been notified/);
  });
});
