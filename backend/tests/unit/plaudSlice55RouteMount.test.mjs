/**
 * Phase 5 Slice 5.5 — route mount + middleware + startup env validation
 * =======================================================================
 * Behavioral coverage of shouldMountApplaudWebhookRoute (env-gated boot
 * decision) + the route's middleware (HTTPS check, raw-body capture,
 * rate limiter). Source-text locks for the wiring in core/routes.mjs and
 * the JSON parser exclusion in core/middleware/index.mjs.
 *
 * Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §13.1, §13.2, §18.2.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  shouldMountApplaudWebhookRoute,
  requireHttpsProxy,
  applaudJsonParser,
  applaudRateLimiter,
  _resetRateLimiterForTests,
} from '../../routes/plaud/plaudWebhookRoutes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTE_SRC = readFileSync(
  resolve(__dirname, '../../routes/plaud/plaudWebhookRoutes.mjs'),
  'utf8',
);
const CORE_ROUTES_SRC = readFileSync(
  resolve(__dirname, '../../core/routes.mjs'),
  'utf8',
);
const CORE_MIDDLEWARE_SRC = readFileSync(
  resolve(__dirname, '../../core/middleware/index.mjs'),
  'utf8',
);

// Helper: set required env to a known-valid baseline; tests override individual fields.
function setValidEnv() {
  vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_ENABLED', 'true');
  vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_SECRET_V1', 'a'.repeat(64));
  vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_KEY_ID', 'V1');
  vi.stubEnv('PLAUD_APPLAUD_USER_ID', '42');
  vi.stubEnv('PLAUD_APPLAUD_MEDIA_BASE_URL', 'https://applaud-tunnel.test.local');
}

// Per Codex CR-IMPL-1 + NC-CRIT-2: shouldMountApplaudWebhookRoute now
// REQUIRES models.User AND a schema check. Provide a fully-valid mock that
// makes the function return true; specific tests override portions.
function makeValidModelsAndSchema() {
  return {
    models: {
      User: {
        findByPk: vi.fn().mockResolvedValue({ id: 42, role: 'admin' }),
      },
    },
    sequelizeOverride: {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes('information_schema.columns')) {
          return Promise.resolve([
            { column_name: 'clip_source' },
            { column_name: 'clip_external_id' },
            { column_name: 'applaud_event_id' },
          ]);
        }
        if (sql.includes('plaud_webhook_nonces')) {
          return Promise.resolve([{ exists: 'plaud_webhook_nonces' }]);
        }
        return Promise.resolve([]);
      }),
    },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  _resetRateLimiterForTests();
});

// ─── shouldMountApplaudWebhookRoute (Codex HIGH-7 + §13.2) ────────────
describe('Slice 5.5 — shouldMountApplaudWebhookRoute', () => {
  it('returns true with all valid env + valid models + valid schema', async () => {
    setValidEnv();
    const result = await shouldMountApplaudWebhookRoute(makeValidModelsAndSchema());
    expect(result).toBe(true);
  });

  it('returns false when PLAUD_APPLAUD_WEBHOOK_ENABLED is unset', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_ENABLED', '');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when PLAUD_APPLAUD_WEBHOOK_ENABLED is "false"', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_ENABLED', 'false');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when PLAUD_APPLAUD_WEBHOOK_ENABLED is "1" (must be exactly "true")', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_ENABLED', '1');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when PLAUD_APPLAUD_WEBHOOK_SECRET_V1 missing', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_SECRET_V1', '');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when PLAUD_APPLAUD_WEBHOOK_KEY_ID missing', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_KEY_ID', '');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when PLAUD_APPLAUD_USER_ID missing', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_USER_ID', '');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when PLAUD_APPLAUD_MEDIA_BASE_URL missing', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_MEDIA_BASE_URL', '');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when MEDIA_BASE_URL is HTTP (not HTTPS)', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_MEDIA_BASE_URL', 'http://applaud-tunnel.test.local');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when MEDIA_BASE_URL contains credentials (Codex L-2)', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_MEDIA_BASE_URL', 'https://user:pass@applaud-tunnel.test.local');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when MEDIA_BASE_URL is malformed', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_MEDIA_BASE_URL', 'not-a-url');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when USER_ID is non-numeric', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_USER_ID', 'abc');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when USER_ID is zero or negative', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_USER_ID', '0');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
    vi.stubEnv('PLAUD_APPLAUD_USER_ID', '-1');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when KEY_ID resolves to empty/short secret (Codex HIGH-7)', async () => {
    setValidEnv();
    // KEY_ID points at V2 but V2 secret env doesn't exist
    vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_KEY_ID', 'V2');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when secret is too short (<32 chars) for active KEY_ID', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_SECRET_V1', 'too-short');
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when KEY_ID has invalid charset (env-var injection defense)', async () => {
    setValidEnv();
    vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_KEY_ID', 'v1');     // lowercase
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
    vi.stubEnv('PLAUD_APPLAUD_WEBHOOK_KEY_ID', '../etc'); // path traversal
    expect(await shouldMountApplaudWebhookRoute()).toBe(false);
  });

  it('returns false when user_id does not exist (models check is now mandatory per CR-IMPL-1)', async () => {
    setValidEnv();
    const args = makeValidModelsAndSchema();
    args.models.User.findByPk = vi.fn().mockResolvedValue(null);
    const result = await shouldMountApplaudWebhookRoute(args);
    expect(result).toBe(false);
    expect(args.models.User.findByPk).toHaveBeenCalledWith(42, expect.any(Object));
  });

  it('returns false when user role is not trainer/admin', async () => {
    setValidEnv();
    const args = makeValidModelsAndSchema();
    args.models.User.findByPk = vi.fn().mockResolvedValue({ id: 42, role: 'client' });
    expect(await shouldMountApplaudWebhookRoute(args)).toBe(false);
  });

  it('returns true when user role is trainer', async () => {
    setValidEnv();
    const args = makeValidModelsAndSchema();
    args.models.User.findByPk = vi.fn().mockResolvedValue({ id: 42, role: 'trainer' });
    expect(await shouldMountApplaudWebhookRoute(args)).toBe(true);
  });

  it('returns true when user role is admin', async () => {
    setValidEnv();
    expect(await shouldMountApplaudWebhookRoute(makeValidModelsAndSchema())).toBe(true);
  });

  it('returns false when user lookup throws (fail-closed)', async () => {
    setValidEnv();
    const args = makeValidModelsAndSchema();
    args.models.User.findByPk = vi.fn().mockRejectedValue(new Error('DB unreachable'));
    expect(await shouldMountApplaudWebhookRoute(args)).toBe(false);
  });

  it('returns false when Phase 5 plaud_clips columns missing (Codex NC-CRIT-2 schema check)', async () => {
    setValidEnv();
    const args = makeValidModelsAndSchema();
    // Schema check returns only 1 column instead of 3 — migration not applied
    args.sequelizeOverride.query = vi.fn().mockImplementation((sql) => {
      if (sql.includes('information_schema.columns')) {
        return Promise.resolve([{ column_name: 'clip_source' }]);  // missing 2
      }
      return Promise.resolve([{ exists: 'plaud_webhook_nonces' }]);
    });
    expect(await shouldMountApplaudWebhookRoute(args)).toBe(false);
  });

  it('returns false when plaud_webhook_nonces table missing (Codex NC-CRIT-2)', async () => {
    setValidEnv();
    const args = makeValidModelsAndSchema();
    args.sequelizeOverride.query = vi.fn().mockImplementation((sql) => {
      if (sql.includes('information_schema.columns')) {
        return Promise.resolve([
          { column_name: 'clip_source' },
          { column_name: 'clip_external_id' },
          { column_name: 'applaud_event_id' },
        ]);
      }
      if (sql.includes('plaud_webhook_nonces')) {
        return Promise.resolve([{ exists: null }]);  // table absent
      }
      return Promise.resolve([]);
    });
    expect(await shouldMountApplaudWebhookRoute(args)).toBe(false);
  });

  it('returns false when schema introspection throws (fail-closed)', async () => {
    setValidEnv();
    const args = makeValidModelsAndSchema();
    args.sequelizeOverride.query = vi.fn().mockRejectedValue(new Error('DB locked'));
    expect(await shouldMountApplaudWebhookRoute(args)).toBe(false);
  });
});

// ─── requireHttpsProxy ────────────────────────────────────────────────
describe('Slice 5.5 — requireHttpsProxy', () => {
  function mockReq(proto) {
    return { headers: { 'x-forwarded-proto': proto } };
  }
  function mockRes() {
    const res = {
      statusCode: null,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };
    return res;
  }

  it('calls next() when X-Forwarded-Proto is https', () => {
    const next = vi.fn();
    requireHttpsProxy(mockReq('https'), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 HTTPS_REQUIRED when X-Forwarded-Proto is http', () => {
    const next = vi.fn();
    const res = mockRes();
    requireHttpsProxy(mockReq('http'), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody.error.code).toBe('HTTPS_REQUIRED');
  });

  it('returns 400 when X-Forwarded-Proto header is missing', () => {
    const next = vi.fn();
    const res = mockRes();
    requireHttpsProxy({ headers: {} }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });
});

// ─── applaudJsonParser raw-body capture (Codex ICR-2) ───────────────
describe('Slice 5.5 — applaudJsonParser', () => {
  it('is an Express middleware function (parser)', () => {
    expect(typeof applaudJsonParser).toBe('function');
  });
  it('source declares verify hook that captures req.rawBody (Codex ICR-2)', () => {
    expect(ROUTE_SRC).toMatch(
      /express\.json\(\s*\{[\s\S]{0,400}verify:[\s\S]{0,200}req\.rawBody\s*=\s*Buffer\.from\(buf\)/,
    );
  });
  it('source declares 10kb body limit (small JSON metadata; no audio inline)', () => {
    expect(ROUTE_SRC).toMatch(/express\.json\(\s*\{[\s\S]{0,400}limit:\s*'10kb'/);
  });
  it('source declares type: application/json (rejects other content-types)', () => {
    expect(ROUTE_SRC).toMatch(/express\.json\(\s*\{[\s\S]{0,400}type:\s*'application\/json'/);
  });
});

// ─── applaudRateLimiter ───────────────────────────────────────────────
describe('Slice 5.5 — applaudRateLimiter', () => {
  function mockRes() {
    const res = {
      statusCode: null,
      jsonBody: null,
      headers: {},
      set(k, v) { this.headers[k] = v; return this; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };
    return res;
  }

  it('passes through up to 60 requests in a window (default cap)', () => {
    const next = vi.fn();
    for (let i = 0; i < 60; i += 1) {
      applaudRateLimiter({}, mockRes(), next);
    }
    expect(next).toHaveBeenCalledTimes(60);
  });

  it('returns 429 RATE_LIMITED on the 61st request in window', () => {
    const next = vi.fn();
    for (let i = 0; i < 60; i += 1) applaudRateLimiter({}, mockRes(), next);
    const res = mockRes();
    applaudRateLimiter({}, res, next);
    expect(res.statusCode).toBe(429);
    expect(res.jsonBody.error.code).toBe('RATE_LIMITED');
    expect(res.headers['Retry-After']).toBe('60');
    // next() called only for the 60 successful ones, not the 61st
    expect(next).toHaveBeenCalledTimes(60);
  });

  it('clears rate state via _resetRateLimiterForTests (test isolation)', () => {
    const next = vi.fn();
    for (let i = 0; i < 60; i += 1) applaudRateLimiter({}, mockRes(), next);
    _resetRateLimiterForTests();
    const res = mockRes();
    applaudRateLimiter({}, res, next);
    expect(res.statusCode).toBeNull(); // not set = passed through
    expect(next).toHaveBeenCalled();
  });
});

// ─── core/routes.mjs wiring ───────────────────────────────────────────
describe('Slice 5.5 — core/routes.mjs wiring', () => {
  it('does NOT statically import the webhook route module (Codex NC-CRIT-1 fix)', () => {
    // The route module was previously statically imported. Codex NC-CRIT-1
    // flagged: even with flag=off, any import-time error in the webhook
    // stack would crash production boot. v1.2 fix: lazy-import only when
    // the feature flag is on.
    expect(CORE_ROUTES_SRC).not.toMatch(
      /^import\s+plaudWebhookRoutes/m,
    );
  });

  it('lazy-imports the webhook route ONLY when PLAUD_APPLAUD_WEBHOOK_ENABLED === "true"', () => {
    expect(CORE_ROUTES_SRC).toMatch(
      /if\s*\(\s*process\.env\.PLAUD_APPLAUD_WEBHOOK_ENABLED\s*===\s*['"]true['"]\s*\)/,
    );
    expect(CORE_ROUTES_SRC).toMatch(
      /await\s+import\(\s*['"][\s\S]{0,80}plaudWebhookRoutes\.mjs['"]/,
    );
  });

  it('mounts the webhook route conditionally on shouldMountApplaudWebhookRoute() at /api/plaud/webhook', () => {
    expect(CORE_ROUTES_SRC).toMatch(
      /if\s*\(\s*await\s+shouldMountApplaudWebhookRoute\(\)\s*\)\s*\{[\s\S]{0,200}app\.use\(\s*['"]\/api\/plaud\/webhook['"]\s*,\s*plaudWebhookRoutes/,
    );
  });

  it('mount-decision is wrapped in try/catch (fail-closed on lazy-import or mount error)', () => {
    expect(CORE_ROUTES_SRC).toMatch(
      /try\s*\{[\s\S]{0,500}shouldMountApplaudWebhookRoute[\s\S]{0,500}\}\s*catch/,
    );
  });
});

// ─── core/middleware/index.mjs JSON parser exclusion (Codex HIGH-5) ───
describe('Slice 5.5 — core/middleware JSON parser exclusion', () => {
  it('skips global express.json() for /api/plaud/webhook (Codex HIGH-5)', () => {
    expect(CORE_MIDDLEWARE_SRC).toMatch(
      /req\.path\.startsWith\(['"]\/api\/plaud\/webhook['"]\)/,
    );
  });
  it('preserves Stripe webhook exclusion (no Phase 3 regression)', () => {
    expect(CORE_MIDDLEWARE_SRC).toMatch(/req\.path\.startsWith\(['"]\/api\/webhook['"]\)/);
    expect(CORE_MIDDLEWARE_SRC).toMatch(/req\.path\.startsWith\(['"]\/webhooks['"]\)/);
  });
});

// ─── route file source-text locks ─────────────────────────────────────
describe('Slice 5.5 — route file source-text locks', () => {
  it('middleware order: requireHttpsProxy → applaudJsonParser → applaudRateLimiter → applaudWebhookHandler', () => {
    // Find the position of each middleware in the router.post call.
    const postCallMatch = ROUTE_SRC.match(/router\.post\([\s\S]{0,500}\)/);
    expect(postCallMatch).toBeTruthy();
    const block = postCallMatch[0];
    const httpsIdx = block.indexOf('requireHttpsProxy');
    const parserIdx = block.indexOf('applaudJsonParser');
    const rateIdx = block.indexOf('applaudRateLimiter');
    const handlerIdx = block.indexOf('applaudWebhookHandler');
    expect(httpsIdx).toBeGreaterThan(-1);
    expect(parserIdx).toBeGreaterThan(httpsIdx);
    expect(rateIdx).toBeGreaterThan(parserIdx);
    expect(handlerIdx).toBeGreaterThan(rateIdx);
  });

  it('per-route error handler returns 400 INVALID_PAYLOAD on entity.parse.failed', () => {
    expect(ROUTE_SRC).toMatch(/entity\.parse\.failed[\s\S]{0,200}'INVALID_PAYLOAD'/);
  });

  it('per-route error handler returns 413 PAYLOAD_TOO_LARGE on entity.too.large', () => {
    expect(ROUTE_SRC).toMatch(/entity\.too\.large[\s\S]{0,200}'PAYLOAD_TOO_LARGE'/);
  });

  it('exports shouldMountApplaudWebhookRoute (named) for core/routes.mjs', () => {
    expect(ROUTE_SRC).toMatch(/export async function shouldMountApplaudWebhookRoute/);
  });

  it('exports default router (Express convention)', () => {
    expect(ROUTE_SRC).toMatch(/export default router/);
  });

  it('does NOT call next(err) for INVALID_PAYLOAD/PAYLOAD_TOO_LARGE — handles inline', () => {
    // Confirm the error handler short-circuits with a JSON response, not next(err)
    expect(ROUTE_SRC).toMatch(/return res\.status\(400\)\.json\([\s\S]{0,200}'INVALID_PAYLOAD'/);
    expect(ROUTE_SRC).toMatch(/return res\.status\(413\)\.json\([\s\S]{0,200}'PAYLOAD_TOO_LARGE'/);
  });
});
