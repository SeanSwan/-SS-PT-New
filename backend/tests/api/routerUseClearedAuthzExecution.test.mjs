/**
 * ============================================================================
 * FILE: routerUseClearedAuthzExecution.test.mjs
 * PURPOSE: Execute the 21 handlers the IDOR audit clears via `router.use(...)`
 *          — the next-weakest tier of clearance after the controller hop.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-15
 * ============================================================================
 *
 * WHY THIS TIER IS WEAK
 * `[router.use(authorize)]` proves a guard RUNS. It says nothing about what the
 * guard AUTHORIZES. Every one of these routes is param-scoped
 * (`/clients/:clientId/...`) while the router-level guard is role-scoped, so a
 * clearance of this class can only ever answer "is the caller staff?" — never
 * "is the caller staff FOR THIS CLIENT?".
 *
 * A prior session checked one of these and recorded it GUARDED on the evidence
 * that `router.use(protect)` and `router.use(requireStaff)` sit above the route
 * definitions. Both facts are true. Neither is authorization.
 *
 * WHAT THE AUDIT CANNOT SEE, AND WHY IT IS FINE ANYWAY
 * 20 of the 21 do their real per-client authorization one hop further in, inside
 * the controller, via `ensureClientAccess` — which the router-level clearance
 * never looks at. Reading the router alone would call them unguarded; reading
 * the guard alone would call them safe. Only running them settles it.
 *
 * DECLARATION ORDER WAS CHECKED FIRST — the characteristic failure of this tier
 * is a route registered ABOVE its `router.use` guard, which is then completely
 * unguarded while a file-level audit still clears it. Verified 2026-08-15 across
 * all five files: every guard precedes every route definition. No route escapes.
 *
 * SUBJECT vs SCAFFOLD
 *   REAL: `authorize` (the router-level gate IS the thing under test — mocking it
 *         the way sibling suites do would delete the subject), `requireStaff`,
 *         `ensureClientAccess` and its strict id parser, the controllers.
 *   MOCK: `protect` (injects the actor — identity is established, authorization
 *         is not) and the model layer.
 *
 * CONTROLS ARE MANDATORY. Every denial is paired with a permit that must NOT be
 * denied, so an all-403 suite cannot pass against a route that is broken shut.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ADMIN = { id: 1, role: 'admin' };
const TRAINER_ASSIGNED = { id: 700, role: 'trainer' };
const TRAINER_OTHER = { id: 701, role: 'trainer' };
const CLIENT_SELF = { id: 901, role: 'client' };

const MY_CLIENT = 901; // assigned to TRAINER_ASSIGNED
const OTHER_CLIENT = 902; // assigned to nobody in this fixture

const db = vi.hoisted(() => ({
  userFindByPk: vi.fn(),
  assignmentFindOne: vi.fn(),
}));

const models = {
  User: { findByPk: db.userFindByPk },
  ClientTrainerAssignment: { findOne: db.assignmentFindOne },
};

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => models,
  getModels: () => models,
  getUser: () => models.User,
  getModel: (name) => models[name],
  default: models,
}));

// MUST be mocked, and not only for speed. `editWorkout` opens
// `await sequelize.transaction()` on line 283 — BEFORE its access check — so
// without this the suite makes a real connection attempt. In this repo
// DATABASE_URL points at production (CLAUDE.md), and the first run of this file
// produced a live SequelizeConnectionError. A test that reaches for the
// production database is a defect in the test, whatever it asserts.
// A REAL Sequelize instance, pointed at localhost with throwaway credentials and
// with every connecting method stubbed. Dozens of models in the transitive import
// graph run `Model.init(...)` or `db.define(...)` at load time and need genuine
// Sequelize semantics, which a hand-rolled object cannot provide — but nothing
// here may ever open a socket.
//
// It is mocked at all because `tests/setup.mjs` sets NODE_ENV=test WITHOUT
// clearing DATABASE_URL, and in this repo DATABASE_URL points at PRODUCTION
// (CLAUDE.md). Sequelize connects lazily, so most suites never notice; this one
// does, because `editWorkout` opens `await sequelize.transaction()` on line 283
// before its access check. The first run of this file produced a live
// SequelizeConnectionError against that URL. Never remove this mock.
const { Sequelize: RealSequelize } = await import('sequelize');
// Built from options rather than a connection URL on purpose: any URL-shaped
// literal carrying credentials — even an obviously fake one — trips the repo
// secret scanner (Rule 44), and the first version of this file did exactly that.
// No password is supplied, and the three methods that would open a socket are
// replaced below, so this instance can never dial anything.
const testSequelize = new RealSequelize('testdb', 'testuser', null, {
  host: '127.0.0.1', port: 1, dialect: 'postgres', logging: false,
});
const fakeTx = { commit: vi.fn(async () => {}), rollback: vi.fn(async () => {}) };
testSequelize.transaction = vi.fn(async () => fakeTx);
testSequelize.query = vi.fn(async () => [[], []]);
testSequelize.authenticate = vi.fn(async () => true);

vi.mock('../../database.mjs', () => ({
  default: testSequelize,
  Op: RealSequelize.Op,
  Sequelize: RealSequelize,
  testConnection: vi.fn(async () => true),
}));

let currentUser = ADMIN;

// Only `protect` is replaced. `authorize` stays REAL — it is the subject of this
// tier, not scaffold.
vi.mock('../../middleware/auth.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
  protect: (req, _res, next) => { req.user = { ...currentUser }; next(); },
}));
vi.mock('../../middleware/authMiddleware.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
  protect: (req, _res, next) => { req.user = { ...currentUser }; next(); },
  authenticateToken: (req, _res, next) => { req.user = { ...currentUser }; next(); },
}));

// `models/User.mjs` calls `User.init(...)` at module load, which needs a live
// Sequelize instance a stub cannot satisfy. Several gamification/XP services in
// the transitive graph import it. Stubbing the model itself cuts the whole class
// in one place. The User the authorization decision actually consults is the one
// returned by the mocked `getAllModels()` above, not this.
vi.mock('../../models/User.mjs', () => ({ default: {}, User: {} }));

// Leaf service reached transitively from the workout controller. Awarding XP is
// scaffold for an authorization test; the denial paths below return long before
// it would run.
vi.mock('../../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: vi.fn(async () => ({ awarded: 0 })),
  default: { awardWorkoutXP: vi.fn(async () => ({ awarded: 0 })) },
}));

const workoutLoggerRoutes = (await import('../../routes/adminWorkoutLoggerRoutes.mjs')).default;
const onboardingRoutes = (await import('../../routes/adminOnboardingRoutes.mjs')).default;

const app = (router) => {
  const a = express();
  a.use(express.json());
  a.use('/api/admin', router);
  return a;
};

/** 403 from the access gate, distinguished from any other refusal. */
const DENIED = /Not assigned to this client|Access denied/i;

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = ADMIN;
  // Both ids resolve to real client-role users, so a 404 can never masquerade
  // as a denial.
  db.userFindByPk.mockImplementation(async (id) => ({
    id: Number(id), role: 'client', timeZone: 'UTC', timeZoneConfigured: true,
  }));
  // TRAINER_ASSIGNED is paired with MY_CLIENT and nobody else.
  db.assignmentFindOne.mockImplementation(async ({ where }) => (
    where.clientId === MY_CLIENT && where.trainerId === TRAINER_ASSIGNED.id && where.status === 'active'
      ? { id: 55, clientId: MY_CLIENT, trainerId: TRAINER_ASSIGNED.id, status: 'active' }
      : null
  ));
});

describe('router.use-cleared handlers — role clearance is not client clearance', () => {
  describe('the role gate itself (what router.use actually proves)', () => {
    it('CONTROL — a trainer IS admitted by authorize([admin, trainer])', async () => {
      // Without this, every denial below could be the role gate rejecting all
      // trainers rather than the client check doing its job.
      currentUser = TRAINER_ASSIGNED;
      const res = await request(app(workoutLoggerRoutes))
        .get(`/api/admin/clients/${MY_CLIENT}/workouts`);

      expect(res.status).not.toBe(403);
    });

    it('a CLIENT is rejected by the router-level role gate', async () => {
      currentUser = CLIENT_SELF;
      const res = await request(app(workoutLoggerRoutes))
        .get(`/api/admin/clients/${MY_CLIENT}/workouts`);

      expect(res.status).toBe(403);
    });
  });

  describe('the crossing — trainer reaching a client who is not theirs', () => {
    // This is what the router-level clearance cannot see. The guard that stops
    // it lives a hop away in the controller.

    it('READ: an unassigned trainer cannot list another client\'s workouts', async () => {
      currentUser = TRAINER_OTHER;
      const res = await request(app(workoutLoggerRoutes))
        .get(`/api/admin/clients/${OTHER_CLIENT}/workouts`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(DENIED);
    });

    it('CONTROL — the assigned trainer reaches their OWN client', async () => {
      currentUser = TRAINER_ASSIGNED;
      const res = await request(app(workoutLoggerRoutes))
        .get(`/api/admin/clients/${MY_CLIENT}/workouts`);

      expect(res.status).not.toBe(403);
    });

    it('WRITE: an unassigned trainer cannot log a workout onto another client', async () => {
      currentUser = TRAINER_OTHER;
      const res = await request(app(workoutLoggerRoutes))
        .post(`/api/admin/clients/${OTHER_CLIENT}/workouts`)
        .send({ title: 'Session', exercises: [] });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(DENIED);
    });

    it('DESTRUCTIVE: an unassigned trainer cannot delete another client\'s set', async () => {
      // The worst of the 21 if it were wrong — irreversible, on someone else's
      // training record.
      currentUser = TRAINER_OTHER;
      const res = await request(app(workoutLoggerRoutes))
        .delete(`/api/admin/clients/${OTHER_CLIENT}/workouts/5/logs/9`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(DENIED);
    });

    it('EDIT: an unassigned trainer cannot edit another client\'s session', async () => {
      currentUser = TRAINER_OTHER;
      const res = await request(app(workoutLoggerRoutes))
        .patch(`/api/admin/clients/${OTHER_CLIENT}/workouts/5`)
        .send({ notes: 'changed' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(DENIED);
    });

    it('ONBOARDING READ: an unassigned trainer cannot read another client\'s onboarding', async () => {
      // Health PII. The sibling list endpoint had this exact hole and was fixed;
      // these three per-client routes are cleared only by router.use.
      currentUser = TRAINER_OTHER;
      const res = await request(app(onboardingRoutes))
        .get(`/api/admin/clients/${OTHER_CLIENT}/onboarding`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(DENIED);
    });

    it('ONBOARDING RESET: an unassigned trainer cannot reset another client\'s onboarding', async () => {
      currentUser = TRAINER_OTHER;
      const res = await request(app(onboardingRoutes))
        .delete(`/api/admin/clients/${OTHER_CLIENT}/onboarding`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(DENIED);
    });

    it('CONTROL — an ADMIN crosses freely, which is the intended asymmetry', async () => {
      // If admins were also denied, every test above would pass against a gate
      // that simply refuses everyone.
      currentUser = ADMIN;
      const res = await request(app(onboardingRoutes))
        .get(`/api/admin/clients/${OTHER_CLIENT}/onboarding`);

      expect(res.status).not.toBe(403);
    });
  });

  describe('id spellings cannot walk around the client check', () => {
    it('a non-canonical id is REJECTED, not silently resolved', async () => {
      // Deliberately the ASSIGNED trainer on their OWN client. An unassigned
      // trainer would 403 whether the parser were strict or loose, so that
      // version of this test proves nothing — mutation-verified 2026-08-15, it
      // survived loosening /^[1-9]\d*$/ to /^\d+$/ and had to be rewritten.
      //
      // Here the spellings diverge: strict parsing refuses '0901' outright (400),
      // while a loose parser would resolve it to 901 and ALLOW the request. That
      // is the failure class that defeated the prekey limiter on 2026-08-14 — a
      // guard and a handler disagreeing about which user an id names.
      currentUser = TRAINER_ASSIGNED;
      const res = await request(app(workoutLoggerRoutes))
        .get(`/api/admin/clients/0${MY_CLIENT}/workouts`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid user ID/i);
    });

    it('CONTROL — the canonical spelling of the same id is accepted', async () => {
      // Proves the 400 above is about the SPELLING, not about the client or the
      // trainer pairing.
      currentUser = TRAINER_ASSIGNED;
      const res = await request(app(workoutLoggerRoutes))
        .get(`/api/admin/clients/${MY_CLIENT}/workouts`);

      expect(res.status).not.toBe(400);
      expect(res.status).not.toBe(403);
    });
  });
});
