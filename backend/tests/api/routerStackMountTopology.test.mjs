/**
 * ============================================================================
 * FILE: routerStackMountTopology.test.mjs
 * PURPOSE: Assert mount topology against the REAL resolved Express router stack.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-30
 * ============================================================================
 *
 * WHY THIS EXISTS
 * Every mount-order check in this repo reads core/routes.mjs as TEXT and compares
 * `indexOf` positions. That technique has now failed in five separate suites — a
 * comment quoting `app.use('/api', apiRoutes)` sat above the real mounts, so the
 * generic mount "resolved" to prose and four guards went red while the routing was
 * correct. Stripping comments patched those, but the underlying problem stands:
 * source order is a PROXY for mount order, and nothing here had ever inspected the
 * thing that actually decides routing.
 *
 * This boots the real app via createApp() and walks app._router.stack. createApp is
 * a pure factory — no listen(), no sequelize.authenticate() — so this costs a few
 * seconds and needs no database.
 *
 * WHAT A NAIVE VERSION OF THIS TEST WOULD GET WRONG
 * "A broader prefix mounted before a more specific one" flags 152 pairs here, and
 * essentially all of them are fine: Express only shadows if the earlier router
 * ACTUALLY HANDLES the overlapping path — otherwise the request falls through to
 * the next layer. Asserting on prefix order alone would be the same ~100-false-
 * positive trap that made the earlier static IDOR sweep useless.
 *
 * Measured here, which is the point of walking the real stack: there are TWO `/api`
 * mounts. The first serves exactly 2 subpaths (the credit-grant rails); the second
 * is the 178-subpath aggregate fallback, and it is LAST. So nothing is shadowed.
 * Reading the source could not have told those two apart without tracing both
 * routers' contents by hand.
 *
 * The assertions below therefore encode the TRUE condition — an earlier mount may
 * not serve a path that a later, more specific mount owns — rather than the proxy.
 */

import { beforeAll, describe, expect, it } from 'vitest';

/** Recover a mount path from an Express 4 layer regexp. */
const decodeMountPath = (re) => {
  if (re.fast_slash) return '/';
  let s = re.source;
  s = s.replace(/^\^/, '');
  s = s.replace(/\(\?=\\\/\|\$\)$/, '');
  s = s.replace(/\\\/\?$/, '');
  s = s.replace(/\$$/, '');
  s = s.replace(/\\\//g, '/');
  return s || '/';
};

/** Every concrete route a mounted router answers, relative to its mount. */
const routesOf = (layer) => {
  const acc = [];
  const walk = (stack, prefix) => {
    for (const l of stack) {
      if (l.route) {
        acc.push({
          path: prefix + l.route.path,
          methods: Object.keys(l.route.methods).filter((m) => l.route.methods[m]),
        });
      } else if (l.handle?.stack) walk(l.handle.stack, prefix + decodeMountPath(l.regexp));
    }
  };
  if (layer.handle?.stack) walk(layer.handle.stack, '');
  return acc;
};

const subPathsOf = (layer) => routesOf(layer).map((r) => r.path);

/**
 * Does an earlier route pattern actually capture a later one? Express matches
 * segment-by-segment, and a `:param` eats exactly one segment — so
 * `/sessions/:sessionId` captures `/sessions/123` but NOT `/sessions/a/b`.
 * Comparing raw strings would over-flag badly.
 */
const capturesPattern = (earlierPath, laterPath) => {
  const e = earlierPath.split('/').filter(Boolean);
  const l = laterPath.split('/').filter(Boolean);
  if (e.length !== l.length) return false;
  return e.every((seg, i) => seg.startsWith(':') || seg === l[i]);
};

let app;
let mounts;

beforeAll(async () => {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  const { createApp } = await import('../../core/app.mjs');
  app = await createApp();
  mounts = app._router.stack
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => layer.name === 'router')
    .map(({ layer, index }) => ({ index, path: decodeMountPath(layer.regexp), layer }));
}, 120000);

describe('the real Express router stack', () => {
  it('the app boots and mounts routers', () => {
    // Worth asserting on its own: a router module that throws on import, or an
    // export that stops existing, crashes Render at boot (rule 42's two classes).
    // Nothing else in the suite actually constructs the app.
    expect(app).toBeTruthy();
    expect(mounts.length).toBeGreaterThan(100);
  });

  /**
   * KNOWN, PROVEN shadowing — pinned rather than asserted away.
   *
   * Verified BY EXECUTION against the booted app (each route's handler swapped for
   * a marker reporting its owning mount, then real requests driven through
   * supertest). `/api/workout` is mounted at layer 69 and the dedicated
   * `/api/workout/sessions` router at 70, so five of the latter's nine routes are
   * DEAD — every core CRUD operation is answered by the older router:
   *
   *   GET    /api/workout/sessions       -> /api/workout@69/sessions
   *   GET    /api/workout/sessions/123   -> /api/workout@69/sessions/:sessionId
   *   POST   /api/workout/sessions       -> /api/workout@69/sessions
   *   PUT    /api/workout/sessions/123   -> /api/workout@69/sessions/:sessionId
   *   DELETE /api/workout/sessions/123   -> /api/workout@69/sessions/:sessionId
   *
   * Reachable, because @69 has no matching pattern: POST /start, POST /:id/end,
   * GET /:id/handoff, GET /statistics/:userId.
   *
   * This is the exact hazard CLAUDE.md rule 31 names by example, and it is live.
   * NOT fixed here: reordering the mounts changes which implementation serves five
   * live endpoints, and the two may differ in auth, response shape or side effects.
   * That is Sean's call — filed on SWA-75.
   *
   * The list is an ALLOWLIST, not a mute: any NEW shadowing fails this test.
   */
  const KNOWN_SHADOWED = [
    'GET /api/workout/sessions',
    'POST /api/workout/sessions',
    'GET /api/workout/sessions/:id',
    'PUT /api/workout/sessions/:id',
    'DELETE /api/workout/sessions/:id',
  ];

  it('no NEW route is shadowed by an earlier mount', () => {
    const shadowed = [];

    for (let a = 0; a < mounts.length; a += 1) {
      const earlier = mounts[a];
      if (earlier.path === '/') continue;
      const earlierRoutes = routesOf(earlier.layer);
      if (earlierRoutes.length === 0) continue;

      for (let b = a + 1; b < mounts.length; b += 1) {
        const later = mounts[b];
        if (later.path === earlier.path) continue;
        if (!later.path.startsWith(`${earlier.path}/`)) continue;

        const territory = later.path.slice(earlier.path.length); // e.g. '/sessions'

        for (const laterRoute of routesOf(later.layer)) {
          // Full path of the later route as the earlier router would see it.
          const asSeenByEarlier = (territory + laterRoute.path).replace(/\/$/, '') || territory;

          for (const earlierRoute of earlierRoutes) {
            if (!capturesPattern(earlierRoute.path, asSeenByEarlier)) continue;
            // Only a shared METHOD actually steals the request; otherwise Express
            // keeps walking and the later router still gets it.
            const stolen = laterRoute.methods.filter((m) => earlierRoute.methods.includes(m));
            for (const method of stolen) {
              shadowed.push(
                `${method.toUpperCase()} ${later.path}${laterRoute.path === '/' ? '' : laterRoute.path}`
                  .replace(/:\w+/g, ':id'),
              );
            }
          }
        }
      }
    }

    const unexpected = [...new Set(shadowed)].filter((s) => !KNOWN_SHADOWED.includes(s));
    expect(unexpected).toEqual([]);
  });

  it('the known shadowing is still exactly as documented (no silent drift)', () => {
    // If someone fixes the mount order, this fails and the allowlist above should
    // be emptied — a fix must not pass unnoticed either.
    const shadowed = new Set();

    for (let a = 0; a < mounts.length; a += 1) {
      const earlier = mounts[a];
      if (earlier.path === '/') continue;
      const earlierRoutes = routesOf(earlier.layer);
      for (let b = a + 1; b < mounts.length; b += 1) {
        const later = mounts[b];
        if (later.path === earlier.path || !later.path.startsWith(`${earlier.path}/`)) continue;
        const territory = later.path.slice(earlier.path.length);
        for (const lr of routesOf(later.layer)) {
          const asSeen = (territory + lr.path).replace(/\/$/, '') || territory;
          for (const er of earlierRoutes) {
            if (!capturesPattern(er.path, asSeen)) continue;
            for (const m of lr.methods.filter((x) => er.methods.includes(x))) {
              shadowed.add(
                `${m.toUpperCase()} ${later.path}${lr.path === '/' ? '' : lr.path}`.replace(/:\w+/g, ':id'),
              );
            }
          }
        }
      }
    }

    expect([...shadowed].sort()).toEqual([...KNOWN_SHADOWED].sort());
  });

  it('the broad /api aggregate fallback is mounted LAST among /api mounts', () => {
    const apiMounts = mounts.filter((m) => m.path === '/api');
    expect(apiMounts.length).toBeGreaterThan(0);

    const withCounts = apiMounts.map((m) => ({ index: m.index, subs: subPathsOf(m.layer).length }));
    const broadest = withCounts.reduce((acc, cur) => (cur.subs > acc.subs ? cur : acc));
    const lastIndex = Math.max(...withCounts.map((m) => m.index));

    // The aggregate router answers ~178 paths. If it were mounted before a narrower
    // /api sibling, it would swallow that sibling's routes wholesale — the exact
    // failure the source-string guards were written to prevent and could not see.
    expect(broadest.index).toBe(lastIndex);
  });

  it('any /api mount that is NOT last is narrow', () => {
    const apiMounts = mounts
      .filter((m) => m.path === '/api')
      .map((m) => ({ index: m.index, subs: subPathsOf(m.layer) }))
      .sort((x, y) => x.index - y.index);

    for (const m of apiMounts.slice(0, -1)) {
      // A narrow, purposeful mount (today: the two credit-grant rails). If this
      // starts growing, it is becoming a second fallback in front of the real one.
      expect(m.subs.length).toBeLessThan(10);
    }
  });
});
