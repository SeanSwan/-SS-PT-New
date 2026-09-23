/**
 * p0MonitoringRateWindow.test.mjs
 * ===============================
 * Two fixes from the §17 session/auth-transport round:
 *
 *   1. The `high_request_volume` indicator in middleware/p0Monitoring.mjs counted
 *      every request for the LIFETIME of a session and emitted an event on every
 *      request once the total passed 100 — so a normal user browsing past 100
 *      requests produced one security event per request, indefinitely. A lifetime
 *      total is also not a rate: it cannot tell a burst from a long session.
 *
 *   2. config/session.mjs degraded to express-session's MemoryStore in production
 *      with only a `warn`, next to routine startup noise. That store is
 *      per-instance, never prunes, and `rolling: true` plus any req.session write
 *      re-saves on every request — so a Redis outage became unbounded memory
 *      growth rather than a loud failure.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ trackSecurityEvent: vi.fn() }));

// Proxy so any other piiSafeLogger method the middleware reaches for is a no-op
// rather than a crash — only trackSecurityEvent needs to be observable.
vi.mock('../../utils/monitoring/piiSafeLogging.mjs', () => ({
  piiSafeLogger: new Proxy(
    {},
    {
      get: (_target, key) =>
        key === 'trackSecurityEvent' ? mocks.trackSecurityEvent : () => {},
    },
  ),
}));

vi.mock('../../utils/monitoring/accessibilityAuth.mjs', () => ({
  accessibilityAwareAuth: () => (_req, _res, next) => next(),
}));

const { p0SecurityMonitoring } = await import('../../middleware/p0Monitoring.mjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const readBackendFile = (relativePath) =>
  readFileSync(resolve(__dirname, '../..', relativePath), 'utf8').replace(/\r\n/g, '\n');

const makeReq = (session = {}) => ({
  ip: '203.0.113.10',
  headers: { 'user-agent': 'vitest' },
  path: '/api/ping',
  method: 'GET',
  user: { id: 7 },
  session,
  connection: { remoteAddress: '203.0.113.10' },
});

const makeRes = () => ({
  statusCode: 200,
  headersSent: false,
  on() {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json() {
    return this;
  },
  setHeader() {},
  getHeader() {
    return undefined;
  },
});

const volumeAlerts = () =>
  mocks.trackSecurityEvent.mock.calls.filter(([event]) => event === 'high_request_volume');

describe('high_request_volume is a rate window, not a lifetime total', () => {
  beforeEach(() => {
    mocks.trackSecurityEvent.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T22:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not alert at or below the 100-request threshold', async () => {
    const middleware = p0SecurityMonitoring();
    const session = {};

    for (let i = 0; i < 100; i += 1) {
      await middleware(makeReq(session), makeRes(), () => {});
    }

    expect(volumeAlerts()).toHaveLength(0);
  });

  it('alerts AT MOST ONCE inside a single window, however many requests arrive', async () => {
    const middleware = p0SecurityMonitoring();
    const session = {};

    // 400 requests inside one 60s window. The old implementation emitted an
    // event on every request past 100 — 300 events here. The fix emits one.
    for (let i = 0; i < 400; i += 1) {
      await middleware(makeReq(session), makeRes(), () => {});
    }

    const alerts = volumeAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0][2]).toMatchObject({ windowMs: 60000 });
  });

  it('opens a fresh window and can alert again after it rolls over', async () => {
    const middleware = p0SecurityMonitoring();
    const session = {};

    for (let i = 0; i < 150; i += 1) {
      await middleware(makeReq(session), makeRes(), () => {});
    }
    expect(volumeAlerts()).toHaveLength(1);

    // Roll past the window boundary.
    vi.setSystemTime(new Date('2026-09-18T22:01:30Z'));

    for (let i = 0; i < 150; i += 1) {
      await middleware(makeReq(session), makeRes(), () => {});
    }
    expect(volumeAlerts()).toHaveLength(2);
  });

  it('counts per session, not globally', async () => {
    const middleware = p0SecurityMonitoring();

    for (let i = 0; i < 60; i += 1) {
      await middleware(makeReq({}), makeRes(), () => {});
      await middleware(makeReq({}), makeRes(), () => {});
    }

    // Two sessions at 60 requests each — neither crosses the threshold, so a
    // shared global counter would have been wrong here.
    expect(volumeAlerts()).toHaveLength(0);
  });

  it('is a no-op when there is no session', async () => {
    const middleware = p0SecurityMonitoring();
    const req = makeReq();
    delete req.session;

    for (let i = 0; i < 150; i += 1) {
      await middleware(req, makeRes(), () => {});
    }

    expect(volumeAlerts()).toHaveLength(0);
  });
});

describe('session store degradation is loud in production', () => {
  // Strip comments before asserting on source text. session.mjs's own comments
  // deliberately quote the removed literal, which is the exact trap §11.1,
  // §13.8 and §14.4 each logged. secretFallbacks.test.mjs uses the same guard.
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('routes every in-memory fallback through reportStoreDegradation', () => {
    const source = readBackendFile('config/session.mjs');
    expect(source).toContain('const reportStoreDegradation = (reason) =>');
    // No bare warn about the in-memory store may remain.
    expect(source).not.toContain('NOT suitable for multi-instance deployments');
    // The production branch must be error-level.
    expect(source).toContain('logger.error(`⛔ ${detail}');
    // All three fallback paths must report: REDIS_URL unset, USE_REDIS_SESSIONS
    // false, and a failed Redis connection.
    const callSites = source.split('reportStoreDegradation(').length - 1;
    expect(callSites).toBe(3);
  });

  it('still refuses to fall back to a public literal secret (M-04 intact)', () => {
    const code = stripComments(readBackendFile('config/session.mjs'));
    expect(code).toContain('randomBytes(32)');
    expect(code).toContain("'SESSION_SECRET or JWT_SECRET is required in production'");
    expect(code).not.toContain('fallback-secret-change-in-production');
  });
});

describe('p0 middleware wiring status (documentation ratchet)', () => {
  // The session-based request counter only runs if p0SecurityMonitoring() is
  // mounted, and it is not. Pin that fact where wiring would happen, so wiring
  // one of these becomes a deliberate act that fails a test rather than an
  // accident — and so a future pass does not re-"discover" it.
  it('records that no p0 monitoring factory is mounted in the app stack', () => {
    const app = readBackendFile('core/app.mjs');
    const middlewareIndex = readBackendFile('core/middleware/index.mjs');

    for (const source of [app, middlewareIndex]) {
      expect(source).not.toContain('p0SecurityMonitoring');
      expect(source).not.toContain('p0MiddlewareStack');
      expect(source).not.toContain('p0RequestCorrelation');
      expect(source).not.toContain('p0PrivacyCompliance');
      expect(source).not.toContain('p0AccessibilityCompliance');
      expect(source).not.toContain('p0PerformanceMonitoring');
      expect(source).not.toContain('p0ErrorHandling');
      expect(source).not.toContain('p0MasterPromptIntegration');
    }
  });

  it('keeps the counter logic present so wiring it is a one-line change', () => {
    const source = readBackendFile('middleware/p0Monitoring.mjs');
    expect(source).toContain('rateWindowStart');
    expect(source).toContain('rateAlertedThisWindow');
    // The lifetime counter that caused the alert storm must be gone.
    expect(source).not.toContain('req.session.requestCount');
  });
});
