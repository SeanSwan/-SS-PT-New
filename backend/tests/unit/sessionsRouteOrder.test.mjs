/**
 * Route-ordering regression tests for /api/sessions.
 *
 * WHY THIS FILE EXISTS (SWA-71, 2026-07-28):
 * `routes/sessions.mjs` defines `router.get("/:id", protect, ...)`, which matches ANY
 * single-segment path under `/api/sessions/`. Express matches in DEFINITION order, so every
 * literal single-segment route must be declared BEFORE `/:id` or it becomes unreachable.
 *
 * The risk is not theoretical, though the specific scare I first chased turned out to be wrong.
 * `GET /available` ALSO existed in the retired `sessionRoutes.mjs` with NO auth guard. I initially
 * concluded the frontend's available-sessions feature was broken in production — it was not.
 * `sessions.mjs` already declared `/available` with `protect` BEFORE `/:id`, and that copy has
 * always served the frontend correctly. My first grep searched only single-quoted route
 * declarations and missed the double-quoted one.
 *
 * The real defect was quieter: TWO copies of one endpoint, one guarded and one not. The unguarded
 * copy was dead only because the guarded one is mounted first — which is exactly how an unguarded
 * duplicate survives unnoticed until someone reorders a mount.
 *
 * Two constraints are pinned here, and both were previously invisible:
 *   1. `/available` is declared before `/:id`, so it stays reachable.
 *   2. Nothing under /api/sessions is served without an auth guard. `/test` and `/available` both
 *      had NO guard and were safe only because `/:id` happened to swallow them first. An
 *      authorization outcome that depends on route-declaration order is the fragile kind of safe;
 *      this test makes it enforced instead of accidental.
 *
 * Source-level assertions rather than a live server: booting Express requires a database, and the
 * property under test is DECLARATION ORDER, which is exactly what the source shows.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(path.join(backendDir, rel), 'utf8');

const sessionsSource = read('routes/sessions.mjs');
const retiredSource = read('routes/sessionRoutes.mjs');

/** Index of the first declaration matching a route pattern, or -1. */
const declIndex = (source, method, routePath) =>
  source.indexOf(`router.${method}("${routePath}"`) >= 0
    ? source.indexOf(`router.${method}("${routePath}"`)
    : source.indexOf(`router.${method}('${routePath}'`);

describe('sessions.mjs — literal routes must precede the /:id catch-all', () => {
  it('declares GET /available BEFORE GET /:id', () => {
    const available = declIndex(sessionsSource, 'get', '/available');
    const byId = declIndex(sessionsSource, 'get', '/:id');

    expect(available).toBeGreaterThan(-1);
    expect(byId).toBeGreaterThan(-1);
    // If this fails, /available is being swallowed by /:id and silently returns
    // 400 "Invalid session id" to the frontend, which renders it as an empty list.
    expect(available).toBeLessThan(byId);
  });

  it('guards GET /available with protect', () => {
    // The retired copy had NO guard. It never actually leaked — it was unreachable because the
    // guarded copy is mounted first — but it WOULD have exposed trainer first/last name, photo and
    // specialties to anyone who reached it. Unreachable-by-accident is not a guard.
    const idx = declIndex(sessionsSource, 'get', '/available');
    const declaration = sessionsSource.slice(idx, idx + 120);
    expect(declaration).toMatch(/protect/);
  });

  it('has every single-segment literal GET declared before /:id', () => {
    // Generalized version of the bug: ANY literal single-segment GET added after /:id is dead on
    // arrival. This catches the next one automatically instead of waiting for a silent failure.
    const byId = declIndex(sessionsSource, 'get', '/:id');
    const literalGets = [...sessionsSource.matchAll(/router\.get\(["']\/([a-z][a-z0-9-]*)["']/gi)];

    const declaredAfter = literalGets
      .filter((m) => m.index > byId)
      .map((m) => `/${m[1]}`);

    expect(declaredAfter).toEqual([]);
  });
});

describe('sessionRoutes.mjs (retired, still mounted via the /api fallback)', () => {
  it('has no unguarded endpoints', () => {
    // Every route in this file must carry its own guard. It is reached through the fallback
    // aggregator, so it cannot rely on anything mounted earlier to protect it.
    const routeLines = retiredSource
      .split('\n')
      .filter((line) => /^router\.(get|post|put|patch|delete)\(/.test(line));

    const unguarded = routeLines.filter(
      (line) => !/(protect|adminOnly|authorize|requireRole)/.test(line)
    );

    expect(unguarded).toEqual([]);
  });

  it('no longer defines /test', () => {
    // Guardless, returned internal service-health data, zero callers anywhere in the repo.
    expect(retiredSource).not.toMatch(/router\.get\(["']\/test["']/);
  });

  it('no longer defines /available — the unified router owns it', () => {
    // Two copies of one endpoint, one guarded and one not, is how the guardless copy stays alive.
    expect(retiredSource).not.toMatch(/router\.get\(["']\/available["']/);
  });
});