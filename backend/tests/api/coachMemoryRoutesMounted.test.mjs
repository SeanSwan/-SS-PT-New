/**
 * ============================================================================
 * FILE: coachMemoryRoutesMounted.test.mjs
 * PURPOSE: Prove the G09/S9 Coach memory capability is REACHABLE over HTTP from
 *          the real Express app, and that the real `protect` middleware refuses
 *          an unauthenticated caller before the handler runs.
 * AUTHOR: Astra | CREATED: 2026-09-13
 * ============================================================================
 *
 * WHY THIS FILE EXISTS
 * Plan 43 (G09) shipped the CoachFact model, migration, service and memory
 * policy, and packet 75 recorded them green — but nothing in backend/routes or
 * backend/controllers imported them, so the whole inspect / correct / forget
 * lifecycle had no API. A route file that is never mounted is exactly the
 * failure mode this repo keeps rediscovering ("helpers/models alone are not
 * completed products"), so reachability is asserted against the thing that
 * actually decides routing: the resolved stack of createApp().
 *
 * WHAT IS AND IS NOT MOCKED
 *   REAL: createApp, every mount, express routing, `protect`, jsonwebtoken,
 *         getJwtSecret, the waiver gate prefix matcher.
 *   MOCK: nothing. No database row is needed: `protect` answers 401 on a
 *         missing/invalid token BEFORE it reads the User model, and the
 *         off-path control below never reaches a handler.
 *         (The authenticated behaviour matrix lives in the sibling file
 *         coachMemoryRoutesAuthz.test.mjs, which mocks the DATABASE only.)
 *
 * THE DISCRIMINATOR THAT MATTERS
 * A 401 alone would not prove the request reached OUR router — a global gate
 * would produce the same status. Two things separate them: the stack walk names
 * the mount and its exact route list, and the 401 body is asserted to be
 * `protect`'s own contract shape. The off-path request under the same prefix is
 * asserted NOT to be 401, so a blanket gate cannot satisfy both.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

const MOUNT_PATH = '/api/coach/memory';

/** Every concrete route a mounted router answers, relative to its mount. */
const routesOf = (layer) => {
  const acc = [];
  for (const l of layer?.handle?.stack ?? []) {
    if (l.route) {
      acc.push({
        path: l.route.path,
        // Express lower-cases route.methods keys; normalise for a readable pin.
        methods: Object.keys(l.route.methods).filter((m) => l.route.methods[m]).map((m) => m.toUpperCase()).sort(),
      });
    }
  }
  return acc;
};

/** Recover a mount path from an Express 4 layer regexp (routerStackMountTopology pattern). */
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

let app;
let memoryMount = null;
let memoryRoutes = [];
// A path under the same prefix that NO route answers: the control for "the 401
// came from our own protect layer, not from a global gate in front of /api".
let offPathStatus = null;

beforeAll(async () => {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  const { createApp } = await import('../../core/app.mjs');
  app = await createApp();

  for (const layer of app._router.stack) {
    if (layer.name !== 'router') continue;
    if (decodeMountPath(layer.regexp) !== MOUNT_PATH) continue;
    memoryMount = layer;
  }
  memoryRoutes = memoryMount ? routesOf(memoryMount) : [];

  const off = await request(app).get(`${MOUNT_PATH}/42/not-a-route`);
  offPathStatus = off.status;
}, 600_000);

describe('coach memory HTTP surface — reachable from the real app', () => {
  it('createApp mounts a router at /api/coach/memory', () => {
    expect(app).toBeTruthy();
    expect(
      memoryMount,
      'no router is mounted at /api/coach/memory — the CoachFact lifecycle has no HTTP surface',
    ).toBeTruthy();
  });

  it('exposes exactly the T35 remember / correct / forget / inspect routes', () => {
    const seen = memoryRoutes
      .map((r) => `${r.methods.join(',')} ${r.path}`)
      .sort();

    expect(seen).toEqual([
      'GET /:clientId/facts',
      'POST /:clientId/facts',
      'POST /:clientId/facts/:factId/correct',
      'POST /:clientId/facts/:factId/forget',
    ].sort());
  });

  it('refuses an unauthenticated inspect with the real protect contract shape', async () => {
    const res = await request(app).get(`${MOUNT_PATH}/42/facts`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: 'Not authorized, no token' });
  });

  it('refuses unauthenticated remember / correct / forget', async () => {
    const calls = [
      request(app).post(`${MOUNT_PATH}/42/facts`).send({ category: 'preference', statement: 'x' }),
      request(app).post(`${MOUNT_PATH}/42/facts/101/correct`).send({ category: 'preference', statement: 'y' }),
      request(app).post(`${MOUNT_PATH}/42/facts/101/forget`).send({}),
    ];
    for (const call of calls) {
      const res = await call;
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ success: false, message: 'Not authorized, no token' });
    }
  });

  it('refuses a present-but-unverifiable token with the same 401', async () => {
    const res = await request(app)
      .get(`${MOUNT_PATH}/42/facts`)
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('the off-path control is NOT 401 — so the 401 above is our own route gate', () => {
    // If this ever becomes 401 the "route is gated" assertions above stop
    // discriminating, because a blanket gate in front of /api/coach would
    // satisfy them without the router being mounted at all.
    expect(offPathStatus).not.toBe(401);
  });
});
