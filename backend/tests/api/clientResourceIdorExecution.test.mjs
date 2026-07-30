/**
 * ============================================================================
 * FILE: clientResourceIdorExecution.test.mjs
 * PURPOSE: Drive the REAL client-resource routes as user A against user B's id
 *          and prove the response is a denial, not B's data.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-30 (hostile loop, IDOR-by-execution)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * `utils/clientAccess.mjs::ensureClientAccess` is a chokepoint: 21 call sites across
 * 9 route files depend on it for cross-user authorization. It is well covered as a
 * FUNCTION — tests/unit/clientAccess.test.mjs, tests/api/clientAccessStrictIdParsing
 * and tests/middleware/verifyClientAccessStrictIds all exercise the logic.
 *
 * None of them uses supertest. Measured: zero `request(` calls across all three.
 *
 * So the helper is proven correct, and NOTHING proved that the routes which import
 * it actually CALL it and HONOR its verdict. A handler could compute `access` and
 * then ignore `access.allowed`, or read `req.params.userId` directly further down,
 * and every existing test would still pass. That gap is only visible by executing
 * the endpoint.
 *
 * A previous STATIC sweep of this same question produced ~100 false positives and
 * found nothing real — because the guard lives inside the handler body, where a
 * middleware-chain scan cannot see it. Hence: drive the route.
 *
 * CONTROL PROBES ARE MANDATORY HERE. A test that only asserts "denied" passes just
 * as happily against a route that is broken shut, or against a harness that never
 * reached the handler at all. Every endpoint below is therefore driven twice: once
 * as the OWNER (must succeed) and once as a DIFFERENT client (must be denied).
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CLIENT_A = { id: 901, role: 'client', email: 'a@example.test' };
const CLIENT_B_ID = 902;
const TRAINER = { id: 700, role: 'trainer' };
const ADMIN = { id: 1, role: 'admin' };

const mocks = vi.hoisted(() => ({
  user: { findByPk: vi.fn() },
  assignment: { findOne: vi.fn() },
  photo: { findAll: vi.fn(), count: vi.fn() },
  note: { findAll: vi.fn(), count: vi.fn() },
  nutrition: { findOne: vi.fn(), findAll: vi.fn() },
}));

// The REAL ensureClientAccess is the subject — deliberately NOT mocked. Only the
// data layer beneath it is.
vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    User: mocks.user,
    ClientTrainerAssignment: mocks.assignment,
    ClientPhoto: mocks.photo,
    ClientNote: mocks.note,
    ClientNutritionPlan: mocks.nutrition,
    NutritionPlan: mocks.nutrition,
  }),
  getUser: () => mocks.user,
  getModel: (name) => ({
    ClientPhoto: mocks.photo,
    ClientNote: mocks.note,
  }[name] ?? {}),
}));

let currentUser = CLIENT_A;
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
  rateLimiter: () => (_req, _res, next) => next(),
}));

vi.mock('../../services/nutrition/foodCatalogSearchService.mjs', () => ({
  searchFoodCatalog: vi.fn(async () => []),
}));

const photoRoutes = (await import('../../routes/clientPhotoRoutes.mjs')).default;
const noteRoutes = (await import('../../routes/clientNoteRoutes.mjs')).default;
const nutritionRoutes = (await import('../../routes/clientNutritionRoutes.mjs')).default;

function app(router, mount) {
  const a = express();
  a.use(express.json());
  a.use(mount, router);
  return a;
}

/**
 * Every id the helper is asked about resolves to a real client. That is the HOSTILE
 * setup: if the route leaked, B would exist and its data would come back. Making B
 * absent would hide a real leak behind a 404.
 */
function seedUsers() {
  mocks.user.findByPk.mockImplementation(async (id) => {
    const numeric = Number(id);
    if (numeric === CLIENT_A.id) return { id: CLIENT_A.id, role: 'client' };
    if (numeric === CLIENT_B_ID) return { id: CLIENT_B_ID, role: 'client' };
    if (numeric === TRAINER.id) return { id: TRAINER.id, role: 'trainer' };
    return null;
  });
}

const SURFACES = [
  { label: 'progress photos', mount: '/api/photos', router: () => photoRoutes, path: (id) => `/api/photos/${id}` },
  { label: 'client notes', mount: '/api/notes', router: () => noteRoutes, path: (id) => `/api/notes/${id}` },
  { label: 'nutrition plan', mount: '/api/nutrition', router: () => nutritionRoutes, path: (id) => `/api/nutrition/${id}/current` },
];

describe('client-resource routes deny cross-user reads (driven, not inspected)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = CLIENT_A;
    seedUsers();
    mocks.assignment.findOne.mockResolvedValue(null);
    mocks.photo.findAll.mockResolvedValue([]);
    mocks.photo.count.mockResolvedValue(0);
    mocks.note.findAll.mockResolvedValue([]);
    mocks.note.count.mockResolvedValue(0);
    mocks.nutrition.findOne.mockResolvedValue(null);
    mocks.nutrition.findAll.mockResolvedValue([]);
  });

  it.each(SURFACES)('$label — client A reading their OWN record succeeds (control)', async ({ router, mount, path }) => {
    // Without this control, "denied" below would also pass on a route that is
    // simply broken, or on a harness that never reached the handler.
    const res = await request(app(router(), mount)).get(path(CLIENT_A.id));
    expect(res.status).toBeLessThan(400);
  });

  it.each(SURFACES)('$label — client A reading client B is DENIED', async ({ router, mount, path }) => {
    const res = await request(app(router(), mount)).get(path(CLIENT_B_ID));
    expect(res.status).toBe(403);
    // Belt and braces: no B-scoped payload may ride along on a denial.
    expect(JSON.stringify(res.body)).not.toContain(String(CLIENT_B_ID));
  });

  it.each(SURFACES)('$label — an UNASSIGNED trainer is DENIED', async ({ router, mount, path }) => {
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue(null); // no active assignment
    const res = await request(app(router(), mount)).get(path(CLIENT_B_ID));
    expect(res.status).toBe(403);
  });

  it.each(SURFACES)('$label — an ASSIGNED trainer is allowed (control)', async ({ router, mount, path }) => {
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue({ id: 5, clientId: CLIENT_B_ID, trainerId: TRAINER.id, status: 'active' });
    const res = await request(app(router(), mount)).get(path(CLIENT_B_ID));
    expect(res.status).toBeLessThan(400);
  });

  it.each(SURFACES)('$label — admin is allowed (control)', async ({ router, mount, path }) => {
    currentUser = ADMIN;
    const res = await request(app(router(), mount)).get(path(CLIENT_B_ID));
    expect(res.status).toBeLessThan(400);
  });
});

/**
 * WRITES. Round 39 of this loop drove only the three GETs and called the surfaces
 * covered — that was wrong: these routers expose TEN endpoints, and the seven
 * writes were untested. A cross-client WRITE (planting a note on someone else's
 * record, deleting their photo) is strictly worse than a read, so the untested half
 * was the more dangerous half.
 *
 * The sharp case is an UNASSIGNED TRAINER, not a client: both POST handlers gate on
 * role first (`only trainers and admins can create`), so a client is stopped by the
 * role check and never reaches the ownership check. Only a trainer gets far enough
 * for ensureClientAccess to be the thing standing between them and another client's
 * record.
 *
 * Both POSTs call the guard BEFORE reading req.body, so a 403 here cannot be a
 * validation rejection wearing a denial's clothes — which is why these assertions
 * are meaningful without valid payloads.
 */
const WRITES = [
  { label: 'POST photo', router: () => photoRoutes, mount: '/api/photos', method: 'post', path: (id) => `/api/photos/${id}` },
  { label: 'DELETE photo', router: () => photoRoutes, mount: '/api/photos', method: 'delete', path: (id) => `/api/photos/${id}/55` },
  { label: 'POST note', router: () => noteRoutes, mount: '/api/notes', method: 'post', path: (id) => `/api/notes/${id}` },
  { label: 'PUT note', router: () => noteRoutes, mount: '/api/notes', method: 'put', path: (id) => `/api/notes/${id}/55` },
  { label: 'DELETE note', router: () => noteRoutes, mount: '/api/notes', method: 'delete', path: (id) => `/api/notes/${id}/55` },
  { label: 'POST nutrition', router: () => nutritionRoutes, mount: '/api/nutrition', method: 'post', path: (id) => `/api/nutrition/${id}` },
];

describe('client-resource WRITES deny cross-user mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedUsers();
    mocks.assignment.findOne.mockResolvedValue(null);
    mocks.photo.findAll.mockResolvedValue([]);
    mocks.note.findAll.mockResolvedValue([]);
    mocks.nutrition.findOne.mockResolvedValue(null);
  });

  it.each(WRITES)('$label — an UNASSIGNED trainer cannot write to client B', async ({ router, mount, method, path }) => {
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue(null);
    const res = await request(app(router(), mount))[method](path(CLIENT_B_ID)).send({ content: 'x', planName: 'x' });
    expect(res.status).toBe(403);
  });

  it.each(WRITES)('$label — client A cannot write to client B', async ({ router, mount, method, path }) => {
    currentUser = CLIENT_A;
    const res = await request(app(router(), mount))[method](path(CLIENT_B_ID)).send({ content: 'x', planName: 'x' });
    expect(res.status).toBe(403);
  });

  it('POST note — an ASSIGNED trainer CAN write (control: the denials above are not blanket)', async () => {
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue({ id: 5, clientId: CLIENT_B_ID, trainerId: TRAINER.id, status: 'active' });
    mocks.note.create = vi.fn(async (payload) => ({ id: 9, ...payload }));
    const res = await request(app(noteRoutes, '/api/notes'))
      .post(`/api/notes/${CLIENT_B_ID}`)
      .send({ content: 'legitimate coaching note' });
    expect(res.status).toBeLessThan(400);
  });
});

describe('crafted ids cannot smuggle another user past the guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = CLIENT_A;
    seedUsers();
    mocks.assignment.findOne.mockResolvedValue(null);
    mocks.photo.findAll.mockResolvedValue([]);
    mocks.photo.count.mockResolvedValue(0);
  });

  // Each of these normalises to 902 under a loose parser (parseInt, Number, or a
  // DB-side cast). The guard compares STRICTLY parsed ids, so each must be refused
  // — and must never come back 2xx.
  const CRAFTED = ['0902', ' 902', '902 ', '+902', '902abc', '902.0', '9e2', '902%00', '0x386'];

  it.each(CRAFTED)('photos — id %j is never served to client A', async (raw) => {
    const res = await request(app(photoRoutes, '/api/photos')).get(`/api/photos/${encodeURIComponent(raw)}`);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
