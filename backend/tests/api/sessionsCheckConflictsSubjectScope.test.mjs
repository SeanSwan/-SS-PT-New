/**
 * sessionsCheckConflictsSubjectScope.test.mjs
 * ===========================================
 * Regression cover for the cross-trainer enumeration hole on
 * `POST /api/sessions/check-conflicts` (SWA-192, finding P0-3).
 *
 * BEFORE the fix, `sessions.mjs` destructured `trainerId`, `clientId` and
 * `excludeSessionId` straight from `req.body` and handed them to
 * ConflictService with no clamp to the caller and no assignment check. Any
 * authenticated trainer could therefore probe any other trainer's calendar by
 * supplying their id — and `conflictService.mjs` builds
 * `clientName = firstName + ' ' + lastName` and embeds it in the returned
 * conflict message, so the probe also disclosed the other trainer's clients by
 * name. The router carries no rate limiting, so the probe is unbounded.
 *
 * These tests assert BEHAVIOUR, not source strings: the route is mounted into a
 * bare Express app with a stub ConflictService, so what is being verified is
 * what the handler actually passes downstream and what it actually returns.
 *
 * The clamp deliberately mirrors `resolveBlockedTimeSubject()`
 * (backend/services/sessions/session.service.mjs) — the pattern already shipped
 * for the sibling `POST /api/sessions/block` route. Rule 20: one clamp shape for
 * this class of route, not a third competing one.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Stubs. The handler under test is the only real code in this file.
// ---------------------------------------------------------------------------
const checkConflicts = vi.fn();
const findAlternatives = vi.fn();

vi.mock('../../services/conflictService.mjs', () => ({
  default: {
    checkConflicts: (...args) => checkConflicts(...args),
    findAlternatives: (...args) => findAlternatives(...args),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const TRAINER_A = { id: 101, role: 'trainer' };
const TRAINER_B_ID = 202;
const ADMIN = { id: 1, role: 'admin' };
const ASSIGNED_CLIENT = 5001;
const FOREIGN_CLIENT = 9999;

// Assignment truth for the test: trainer A is assigned to ASSIGNED_CLIENT only.
const assertAssignmentOrAdmin = vi.fn(async (actorId, actorRole, subjectId) => {
  if (actorRole === 'admin') return true;
  return actorId === TRAINER_A.id && Number(subjectId) === ASSIGNED_CLIENT;
});

vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  assertAssignmentOrAdmin: (...args) => assertAssignmentOrAdmin(...args),
}));

let currentUser = TRAINER_A;

const roleGate = (...roles) => (req, res, next) => (
  roles.includes(req.user?.role) ? next() : res.status(403).json({ success: false })
);

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = currentUser; next(); },
  adminOnly: roleGate('admin'),
  trainerOrAdminOnly: roleGate('trainer', 'admin'),
  requireTrainer: roleGate('trainer', 'admin'),
  optionalAuth: (req, _res, next) => { req.user = currentUser; next(); },
  authorize: (...roles) => roleGate(...roles.flat()),
}));

async function buildApp() {
  const app = express();
  app.use(express.json());
  const { default: sessionsRouter } = await import('../../routes/sessions.mjs');
  app.use('/api/sessions', sessionsRouter);
  return app;
}

const VALID_WINDOW = {
  startTime: '2026-09-01T17:00:00.000Z',
  endTime: '2026-09-01T18:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = TRAINER_A;
  checkConflicts.mockResolvedValue([]);
  findAlternatives.mockResolvedValue([]);
});

describe('POST /api/sessions/check-conflicts — subject scoping', () => {
  it('ignores a body trainerId and clamps the query to the calling trainer', async () => {
    const app = await buildApp();

    await request(app)
      .post('/api/sessions/check-conflicts')
      .send({ ...VALID_WINDOW, trainerId: TRAINER_B_ID })
      .expect(200);

    expect(checkConflicts).toHaveBeenCalledTimes(1);
    const [args] = checkConflicts.mock.calls[0];

    // The whole point: trainer B's calendar must never be queried.
    expect(Number(args.trainerId)).toBe(TRAINER_A.id);
    expect(Number(args.trainerId)).not.toBe(TRAINER_B_ID);
  });

  it('rejects a clientId the calling trainer is not assigned to', async () => {
    const app = await buildApp();

    const res = await request(app)
      .post('/api/sessions/check-conflicts')
      .send({ ...VALID_WINDOW, clientId: FOREIGN_CLIENT });

    expect(res.status).toBe(403);
    // Nothing may be queried on a denied request.
    expect(checkConflicts).not.toHaveBeenCalled();
  });

  it('allows a clientId the calling trainer IS assigned to', async () => {
    const app = await buildApp();

    await request(app)
      .post('/api/sessions/check-conflicts')
      .send({ ...VALID_WINDOW, clientId: ASSIGNED_CLIENT })
      .expect(200);

    expect(checkConflicts).toHaveBeenCalledTimes(1);
    expect(Number(checkConflicts.mock.calls[0][0].clientId)).toBe(ASSIGNED_CLIENT);
  });

  it('lets an admin keep global scope over any trainer', async () => {
    currentUser = ADMIN;
    const app = await buildApp();

    await request(app)
      .post('/api/sessions/check-conflicts')
      .send({ ...VALID_WINDOW, trainerId: TRAINER_B_ID })
      .expect(200);

    expect(Number(checkConflicts.mock.calls[0][0].trainerId)).toBe(TRAINER_B_ID);
  });
});

describe('POST /api/sessions/check-conflicts — identity reaches only its owner', () => {
  // The defect was SCOPE, not the presence of a name. Once the query is clamped
  // to the caller, `conflictingSession.clientName` is the caller's OWN client and
  // is exactly the information that makes the conflict actionable. These tests pin
  // that: the name survives for the owner, and the foreign calendar is never asked.
  //
  // The mock mirrors the REAL shape from conflictService.normalizeSession —
  // a nested `conflictingSession`, not a flat clientName. An earlier version of
  // this file asserted against a flat shape that the service never produces, so it
  // proved nothing about production behaviour.
  const realShapeConflict = {
    type: 'hard',
    reason: 'trainer_double_booked',
    message: 'Trainer already has a session at this time with Jordan Rivera',
    conflictingSession: {
      id: 4242,
      sessionDate: '2026-09-01T17:00:00.000Z',
      duration: 60,
      bufferBefore: 0,
      bufferAfter: 0,
      status: 'confirmed',
      clientName: 'Jordan Rivera',
    },
  };

  it('keeps the actionable client name for the trainer who owns the calendar', async () => {
    checkConflicts.mockResolvedValue([realShapeConflict]);

    const app = await buildApp();
    const res = await request(app)
      .post('/api/sessions/check-conflicts')
      .send(VALID_WINDOW)
      .expect(200);

    // Own calendar, own client — the trainer needs this to resolve the clash,
    // and ConflictPanel.logic.ts:41 de-duplicates on it.
    expect(res.body.conflicts[0].conflictingSession.clientName).toBe('Jordan Rivera');
    expect(res.body.hasHardConflicts).toBe(true);
  });

  it('never reaches a foreign calendar, so no foreign identity can be returned', async () => {
    checkConflicts.mockResolvedValue([realShapeConflict]);

    const app = await buildApp();
    await request(app)
      .post('/api/sessions/check-conflicts')
      .send({ ...VALID_WINDOW, trainerId: TRAINER_B_ID })
      .expect(200);

    // The only defence that matters: trainer B's calendar was never queried.
    expect(Number(checkConflicts.mock.calls[0][0].trainerId)).toBe(TRAINER_A.id);
    expect(Number(findAlternatives.mock.calls[0]?.[0]?.trainerId ?? TRAINER_A.id)).toBe(TRAINER_A.id);
  });
});
