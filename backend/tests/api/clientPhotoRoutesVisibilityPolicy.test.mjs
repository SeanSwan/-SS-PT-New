/**
 * ============================================================================
 * FILE: clientPhotoRoutesVisibilityPolicy.test.mjs
 * PURPOSE: CA-1 — `routes/clientPhotoRoutes.mjs:75` gates the `trainer_only`
 *          visibility filter on the hand-rolled `req.user?.role === 'client'`.
 *          `'user'` is the DEFAULT role minted by public self-registration and
 *          is client-equivalent per `utils/clientAccess.mjs:23`, so a normal
 *          member skips the branch entirely and is served their own
 *          `trainer_only` progress photos — a photograph a trainer deliberately
 *          withheld from client view.
 *
 *          This is the un-repaired twin of the 2026-08-04 notes bug: see
 *          `routes/clientNoteRoutes.mjs:72` (the fix and its post-mortem) and
 *          `tests/api/clientNoteRoutesPrivacy.test.mjs:17-24` (the record).
 * AUTHOR: Claude (DeepSeek Harness) | CREATED: 2026-09-13
 * ============================================================================
 *
 * WHY BEHAVIOURAL AND NOT A SOURCE-TEXT GUARD
 * The repo already carries two per-route source-text guards for exactly this
 * class (`clientNoteRoutesPrivacy.test.mjs`, `painEntryRoutesAccessGuard
 * .test.mjs`). Clip 72 §"Next" identifies that per-route approach as the reason
 * photos and the AI BFF were missed. So this test drives the REAL route through
 * its REAL `ensureClientAccess` chokepoint and asserts on the where-clause the
 * handler actually hands to the data layer.
 *
 * ISOLATION: `config/database.mjs` loads repository env files, so the data layer
 * is mocked at the module boundary (`models/index.mjs`) and `DATABASE_URL` is
 * removed — no SQL, no socket. `utils/clientAccess.mjs` is deliberately NOT
 * mocked: it is the subject.
 */

import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const USER_ID = 901;          // default public-signup role — the defect's subject
const CLIENT_ID = 903;        // an explicit 'client'-role account (previous behaviour)
const OTHER_CLIENT_ID = 902;
const TRAINER_ID = 700;
const ADMIN_ID = 1;

const mocks = vi.hoisted(() => ({
  user: { findByPk: vi.fn() },
  assignment: { findOne: vi.fn() },
  photo: { findAll: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    User: mocks.user,
    ClientTrainerAssignment: mocks.assignment,
    ClientPhoto: mocks.photo,
  }),
  getModel: (name) => ({ ClientPhoto: mocks.photo }[name] ?? {}),
  getUser: () => mocks.user,
}));

let currentUser = { id: String(USER_ID), role: 'user' };
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
  rateLimiter: () => (_req, _res, next) => next(),
}));

const photoRoutes = (await import('../../routes/clientPhotoRoutes.mjs')).default;

const savedDatabaseUrl = process.env.DATABASE_URL;
delete process.env.DATABASE_URL; // isolation: no remote DB target can be resolved

afterAll(() => {
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
});

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/photos', photoRoutes);
  return app;
}

/** The where-clause the handler actually passed to `ClientPhoto.findAll`. */
const capturedWhere = () => mocks.photo.findAll.mock.calls.at(-1)?.[0]?.where;

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = { id: String(USER_ID), role: 'user' };
  // The target always resolves to a real, client-equivalent account: the hostile
  // setup, so a passing test cannot be an artefact of a missing target.
  mocks.user.findByPk.mockImplementation(async (id) => {
    const numeric = Number(id);
    return [USER_ID, CLIENT_ID, OTHER_CLIENT_ID].includes(numeric)
      ? { id: numeric, role: 'client' }
      : null;
  });
  mocks.assignment.findOne.mockResolvedValue(null);
  mocks.photo.findAll.mockResolvedValue([]);
});

describe('CA-1 — a `user`-role member must not receive their own trainer_only photos', () => {
  it('applies the visibility filter for a `user`-role caller reading their OWN record', async () => {
    const response = await request(makeApp()).get(`/api/photos/${USER_ID}`);

    expect(response.status).toBe(200); // control: the caller IS admitted to their own record
    expect(capturedWhere()).toMatchObject({
      userId: USER_ID,
      isDeleted: false,
      visibility: ['public', 'private'],
    });
  });

  it('still applies the visibility filter for an explicit `client`-role caller (no regression)', async () => {
    currentUser = { id: String(CLIENT_ID), role: 'client' };
    const response = await request(makeApp()).get(`/api/photos/${CLIENT_ID}`);

    expect(response.status).toBe(200);
    expect(capturedWhere()).toMatchObject({
      userId: CLIENT_ID,
      isDeleted: false,
      visibility: ['public', 'private'],
    });
  });

  it('does NOT filter for an ASSIGNED trainer (control — trainers see trainer_only)', async () => {
    currentUser = { id: String(TRAINER_ID), role: 'trainer' };
    mocks.assignment.findOne.mockResolvedValue({
      id: 5, clientId: OTHER_CLIENT_ID, trainerId: TRAINER_ID, status: 'active',
    });

    const response = await request(makeApp()).get(`/api/photos/${OTHER_CLIENT_ID}`);

    expect(response.status).toBe(200);
    expect(capturedWhere()).not.toHaveProperty('visibility');
  });

  it('does NOT filter for an admin (control)', async () => {
    currentUser = { id: String(ADMIN_ID), role: 'admin' };
    const response = await request(makeApp()).get(`/api/photos/${OTHER_CLIENT_ID}`);

    expect(response.status).toBe(200);
    expect(capturedWhere()).not.toHaveProperty('visibility');
  });

  it('still denies a `user`-role caller another client\'s photos (guard unchanged)', async () => {
    const response = await request(makeApp()).get(`/api/photos/${OTHER_CLIENT_ID}`);
    expect(response.status).toBe(403);
    expect(mocks.photo.findAll).not.toHaveBeenCalled();
  });
});

describe('CA-1 — secondary source-text net (never the only proof)', () => {
  it('uses the canonical helper rather than a hand-rolled role comparison', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const source = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../routes/clientPhotoRoutes.mjs'),
      'utf8',
    ).replace(/\r\n/g, '\n');

    expect(source).toContain("import { ensureClientAccess, isClientEquivalentRole } from '../utils/clientAccess.mjs'");
    expect(source).toContain('if (isClientEquivalentRole(req.user?.role)) {');
    expect(source).not.toContain("if (req.user?.role === 'client') {");
  });
});
