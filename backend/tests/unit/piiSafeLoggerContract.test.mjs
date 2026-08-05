/**
 * piiSafeLogger method contract — "the logger a caller assumes exists, exists"
 * ===========================================================================
 * `/api/master-prompt` (5 mounted route files) returned **HTTP 500 to every role, including admin**.
 * Not a permission bug: `piiSafeLogger.trackAccessibilityUsage` did not exist, so the permission
 * middleware threw a TypeError *while writing its audit line* and its catch turned that into a 500.
 * Seven methods were missing across 47 call sites, among them `trackSecurityEvent` — so
 * suspicious-request, auth-failure and permission-denial audit events threw instead of recording.
 *
 * Why it hid: every call site sits inside a `try` whose `catch` logs and continues, so a missing
 * method never surfaced as a missing method — it surfaced as an unrelated 500 (or as silence).
 * The existing guard test asserted the middleware's *source text* contained the permission call.
 * That regex passed against a middleware that denied everyone, because reading source is not
 * running it. This suite runs it.
 *
 * The first test is deliberately a repo scan rather than a fixed list: a hand-written list of seven
 * names would be satisfied the day someone adds an eighth call site for a method that does not
 * exist. The scan makes the codebase itself the spec.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import request from 'supertest';

import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';
import { requirePermissionWithAccessibility } from '../../middleware/p0Monitoring.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '../..');

const SCAN_DIRS = ['routes', 'controllers', 'services', 'middleware', 'utils'];
const SKIP_DIR = /(^|[\\/])(node_modules|dist|build|coverage|archive|retired-mjs-\d+)([\\/]|$)/;
// The leading (^|[^\w$.]) guard matters: without it this also matches the tail of a LONGER
// identifier — `myPiiSafeLogger.foo()` or `VALID_X.has()` when scanning for `X.has()`. A sibling
// sweep written during this fix hit exactly that false positive, so the boundary is load-bearing.
const CALL = /(?:^|[^\w$.])piiSafeLogger\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/g;

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = path.join(dir, name);
    if (SKIP_DIR.test(full)) continue;
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, out);
    // Tests may legitimately reference a method they mock, so they are not part of the contract.
    else if (full.endsWith('.mjs') && !/\.test\.mjs$/.test(full)) out.push(full);
  }
  return out;
}

describe('piiSafeLogger exposes every method the codebase calls', () => {
  it('has no call site naming a method that does not exist', () => {
    const missing = new Map();

    for (const dir of SCAN_DIRS) {
      for (const file of walk(path.join(backendRoot, dir))) {
        const src = readFileSync(file, 'utf8');
        for (const m of src.matchAll(CALL)) {
          const method = m[1];
          if (typeof piiSafeLogger[method] === 'function') continue;
          const rel = path.relative(backendRoot, file).replace(/\\/g, '/');
          if (!missing.has(method)) missing.set(method, new Set());
          missing.get(method).add(rel);
        }
      }
    }

    const report = [...missing.entries()]
      .map(([m, files]) => `  piiSafeLogger.${m}() — ${files.size} file(s): ${[...files].slice(0, 3).join(', ')}`)
      .join('\n');

    expect(missing.size, `Call sites reference logger methods that do not exist:\n${report}`).toBe(0);
  });

  it('keeps the security-audit tracker callable — it records intrusion signals', async () => {
    // p0Monitoring calls this for suspicious_request / authentication_failure / permission_denial.
    // If it throws, those events are lost AND the throw is laundered into an unrelated 500.
    expect(typeof piiSafeLogger.trackSecurityEvent).toBe('function');
    await expect(piiSafeLogger.trackSecurityEvent('authentication_failure', 42, { path: '/x' }))
      .resolves.not.toThrow();
  });
});

describe('requirePermissionWithAccessibility returns a real verdict, not a 500', () => {
  const mount = (permission) => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      const raw = req.headers['x-test-user'];
      if (raw) req.user = JSON.parse(raw);
      next();
    });
    app.post('/probe', requirePermissionWithAccessibility(permission), (_req, res) => res.json({ reached: true }));
    return app;
  };

  const call = (app, user) => {
    const r = request(app).post('/probe').send({});
    return user ? r.set('x-test-user', JSON.stringify(user)) : r;
  };

  it('denies an unprivileged client with 403 — not 500', async () => {
    // 500 is not a denial: it means the gate crashed, and a crashing gate is one refactor away
    // from a catch that calls next().
    const res = await call(mount('system_monitoring'), { id: 3, role: 'client' });
    expect(res.status).toBe(403);
  });

  it('does not answer 500 to an admin on a permitted route', async () => {
    const res = await call(mount('system_monitoring'), { id: 1, role: 'admin' });
    expect(res.status).not.toBe(500);
  });

  it('still rejects an unauthenticated caller with 401', async () => {
    const res = await call(mount('system_monitoring'), null);
    expect(res.status).toBe(401);
  });
});
