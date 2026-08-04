/**
 * workoutSessionRoutesLegacyIsolation — trainer-tenant isolation lock for the
 * LEGACY workout-session router (pre-launch security review 2026-07-16)
 * ==========================================================================
 * The auth sweep (2026-07-15) closed the trainer-isolation break in the
 * canonical workoutController.mjs, but the sibling legacy router
 * routes/workoutSessionRoutes.mjs was MISSED — it still used a blanket
 * `!isPrivileged(role)` short-circuit that let ANY trainer (assigned to nobody)
 * read/tamper another user's session on the three endpoints that are NOT
 * shadowed by workoutController: GET /statistics/:userId, POST /start,
 * POST /:id/end. This locks the router to assertAssignmentOrAdmin (fail-closed).
 */
import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mocks = vi.hoisted(() => ({
  findByPk: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  findAndCountAll: vi.fn(),
  assertAssignmentOrAdmin: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.headers['x-test-user-id'] || 42),
      role: req.headers['x-test-user-role'] || 'client',
    };
    next();
  },
}));

vi.mock('../../middleware/validationMiddleware.mjs', () => ({
  validationMiddleware: () => (_req, _res, next) => next(),
}));

vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  assertAssignmentOrAdmin: mocks.assertAssignmentOrAdmin,
}));

vi.mock('../../models/WorkoutSession.mjs', () => ({
  default: {
    findByPk: mocks.findByPk,
    findAll: mocks.findAll,
    create: mocks.create,
    findAndCountAll: mocks.findAndCountAll,
  },
}));

vi.mock('../../models/WorkoutLog.mjs', () => ({ default: {} }));
vi.mock('../../models/User.mjs', () => ({ default: { findByPk: vi.fn() } }));

const { default: workoutSessionRoutes } = await import('../../routes/workoutSessionRoutes.mjs');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/workout/sessions', workoutSessionRoutes);
  return app;
};

// A session that belongs to user 999 — NOT the requesting trainer (42).
const OTHER_USERS_SESSION = { id: 5, userId: 999, exercises: [], save: vi.fn(), reload: vi.fn() };

describe('legacy workoutSessionRoutes enforces trainer assignment (no role bypass)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByPk.mockResolvedValue(OTHER_USERS_SESSION);
    mocks.findAll.mockResolvedValue([]);
    mocks.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    mocks.create.mockResolvedValue({ id: 'session-new' });
  });

  // REMOVED 2026-07-30 (SWA-75): two blocks here covered GET /:id on this router.
  // That route was UNREACHABLE (/api/workout is mounted ahead of
  // /api/workout/sessions) and has now been deleted. They passed only because this
  // suite mounts the router DIRECTLY, bypassing the real mount order.
  //
  // WORTH KNOWING, and filed on SWA-75 rather than silently changed: the deleted
  // route answered an unauthorized read with 404 BY DESIGN, so a non-owner could
  // not distinguish 'exists-not-yours' from 'doesn't-exist'. The live endpoint
  // (workoutController.getWorkoutSessionById) answers 403 — which IS an existence
  // oracle. Denial is enforced in both; only the live one reveals that the session
  // exists. Changing a live security response is Sean's call, not a cleanup.
  // The surviving /:id/handoff route on this router still uses the 404 posture.

  it('denies an UNASSIGNED trainer reading another user\'s statistics (403)', async () => {
    mocks.assertAssignmentOrAdmin.mockResolvedValue(false);
    const res = await request(buildApp())
      .get('/api/workout/sessions/statistics/999')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'trainer');
    expect(res.status).toBe(403);
    expect(mocks.assertAssignmentOrAdmin).toHaveBeenCalledWith(42, 'trainer', 999);
    expect(mocks.findAll).not.toHaveBeenCalled();
  });

  it('denies an UNASSIGNED trainer ending another user\'s session (403)', async () => {
    mocks.assertAssignmentOrAdmin.mockResolvedValue(false);
    const res = await request(buildApp())
      .post('/api/workout/sessions/5/end')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'trainer')
      .send({ duration: 30 });
    expect(res.status).toBe(403);
    expect(OTHER_USERS_SESSION.save).not.toHaveBeenCalled();
  });

  it('denies an UNASSIGNED trainer starting a session for another user (403)', async () => {
    mocks.assertAssignmentOrAdmin.mockResolvedValue(false);
    const res = await request(buildApp())
      .post('/api/workout/sessions/start')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'trainer')
      .send({ title: 'x', userId: 999 });
    expect(res.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('source: imports the shared assignment gate and drops the role-only bypass', () => {
    const src = readFileSync(resolve(__dirname, '../../routes/workoutSessionRoutes.mjs'), 'utf8');
    expect(src).toMatch(/import \{ assertAssignmentOrAdmin \} from '\.\.\/middleware\/verifyClientAccess\.mjs'/);
    // The vulnerable pattern `!sameId(...) && !isPrivileged(req.user.role)` must be gone.
    const bypass = src.match(/&& !isPrivileged\(req\.user\.role\)/g) || [];
    expect(bypass.length).toBe(0);
  });
});
