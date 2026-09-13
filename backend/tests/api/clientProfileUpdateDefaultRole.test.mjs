/**
 * ============================================================================
 * FILE: clientProfileUpdateDefaultRole.test.mjs
 * PURPOSE: CA-2 — `controllers/profileController.mjs:598` rejects every role
 *          that is not literally `'client'`, but the route it serves
 *          (`routes/clientDashboardRoutes.mjs:206-212`) is gated by
 *          `protect -> clientOnly -> rateLimiter -> updateClientProfile`, and
 *          `clientOnly` (`middleware/authMiddleware.mjs:519-521`) ADMITS
 *          `'client'`, `'user'` and `'admin'`.
 *
 *          Net effect: a `'user'`-role account — the default role minted by
 *          public self-registration, and client-equivalent per
 *          `utils/clientAccess.mjs:23` — passes the middleware and is then 403'd
 *          by the controller, so it cannot update its own profile.
 *
 *          The middleware and the controller disagree about what "client-only"
 *          means. This test drives the REAL chain so the disagreement is
 *          observed rather than inferred.
 * AUTHOR: Claude (DeepSeek Harness) | CREATED: 2026-09-13
 * ============================================================================
 *
 * ISOLATION: `config/database.mjs` loads repository env files, so `DATABASE_URL`
 * is removed and the `User` model's `findByPk` is stubbed at runtime. No SQL,
 * no socket. `clientOnly` and `rateLimiter` are REAL — mocking them would erase
 * the very disagreement under test.
 */

import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const USER_ID = 901;   // default public-signup role — the defect's subject
const ADMIN_ID = 1;

const savedDatabaseUrl = process.env.DATABASE_URL;
delete process.env.DATABASE_URL; // isolation: no remote DB target can be resolved

const User = (await import('../../models/User.mjs')).default;

let currentUser = { id: String(USER_ID), role: 'user' };
let updatedWith = null;

const clientDashboardRoutes = (await import('../../routes/clientDashboardRoutes.mjs')).default;

// Repo's established pattern (tests/api/destructiveOwnershipMatrix.test.mjs:
// 152-161): patch `protect` in the router stack so no real JWT is needed, while
// leaving `clientOnly` and `rateLimiter` untouched and REAL.
const replacement = (req, _res, next) => { req.user = { ...currentUser }; next(); };
const patch = (stack) => {
  for (const layer of stack) {
    if (layer.route) {
      for (const l of layer.route.stack) if (l.name === 'protect') l.handle = replacement;
    } else if (layer.handle?.stack) patch(layer.handle.stack);
    else if (layer.name === 'protect') layer.handle = replacement;
  }
};
patch(clientDashboardRoutes.stack);

afterAll(() => {
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
});

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/client', clientDashboardRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = { id: String(USER_ID), role: 'user' };
  updatedWith = null;
  User.findByPk = async (id) => ({
    id: Number(id),
    role: currentUser.role,
    firstName: 'Probe',
    async update(values) { updatedWith = values; return this; },
    toJSON() { return { id: Number(id), firstName: 'Probe' }; },
  });
});

describe('CA-2 — PATCH /api/client/profile admits the default self-registration role', () => {
  it('lets a `user`-role account update its OWN profile', async () => {
    const response = await request(makeApp())
      .patch('/api/client/profile')
      .send({ firstName: 'Updated' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(updatedWith).toMatchObject({ firstName: 'Updated' });
  });

  it('lets a `client`-role account update its own profile (no regression)', async () => {
    currentUser = { id: String(USER_ID), role: 'client' };
    const response = await request(makeApp())
      .patch('/api/client/profile')
      .send({ firstName: 'Updated' });

    expect(response.status).toBe(200);
    expect(updatedWith).toMatchObject({ firstName: 'Updated' });
  });

  it('still rejects `admin` — admin is NOT client-equivalent', async () => {
    currentUser = { id: String(ADMIN_ID), role: 'admin' };
    const response = await request(makeApp())
      .patch('/api/client/profile')
      .send({ firstName: 'Updated' });

    expect(response.status).toBe(403);
    expect(updatedWith).toBeNull();
  });

  it('still rejects a `trainer` that `clientOnly` never admitted', async () => {
    currentUser = { id: '700', role: 'trainer' };
    const response = await request(makeApp())
      .patch('/api/client/profile')
      .send({ firstName: 'Updated' });

    expect(response.status).toBe(403);
    expect(updatedWith).toBeNull();
  });
});

describe('CA-2 — the controller and its middleware must agree', () => {
  it('uses the canonical client-equivalence helper, not a bare role comparison', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const source = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../controllers/profileController.mjs'),
      'utf8',
    ).replace(/\r\n/g, '\n');

    expect(source).toContain('isClientEquivalentRole(req.user.role)');
    expect(source).not.toContain("if (req.user.role !== 'client') {");
  });
});
