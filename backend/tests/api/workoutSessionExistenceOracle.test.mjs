/**
 * ============================================================================
 * FILE: workoutSessionExistenceOracle.test.mjs
 * PURPOSE: An unauthorized READ must be indistinguishable from a miss.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-31 (SWA-75)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * `GET /api/workout/sessions/:id` answered an unauthorized read with 403
 * "You are not authorized to view this session". Denial was enforced — but the
 * status told a non-owner that the id they guessed is REAL. Session ids are
 * sequential integers, so the whole space is enumerable: walk the ids, and 403 vs
 * 404 maps out which sessions exist across the platform.
 *
 * The retired /api/workout/sessions router answered 404 here BY DESIGN, with a
 * comment saying exactly that, and the surviving /:id/handoff route on it still
 * does. Deleting the dead routes is what surfaced the inconsistency: the codebase
 * disagreed with itself on the same resource.
 *
 * SCOPE IS READS. update/delete keep 403 on purpose — the retired router did the
 * same, the write cannot succeed either way, and a trainer who has just lost an
 * assignment needs to know WHY their save failed rather than being told the
 * client's session vanished. Pinned below so nobody "fixes" it for symmetry.
 *
 * The assertion that matters is not "404" on its own — it is that the two
 * responses are IDENTICAL. A distinct message at the same status leaks just as
 * effectively as a distinct status.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getWorkoutSessionById: vi.fn(),
  updateWorkoutSession: vi.fn(),
  deleteWorkoutSession: vi.fn(),
  assertAssignmentOrAdmin: vi.fn(),
}));

vi.mock('../../services/workoutService.mjs', () => ({
  default: {
    getWorkoutSessionById: mocks.getWorkoutSessionById,
    updateWorkoutSession: mocks.updateWorkoutSession,
    deleteWorkoutSession: mocks.deleteWorkoutSession,
    getWorkoutSessions: vi.fn(async () => []),
    getClientProgress: vi.fn(),
    getWorkoutStatistics: vi.fn(),
    getExerciseRecommendations: vi.fn(),
  },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 901, role: 'trainer' }; next(); },
  authorize: () => (_req, _res, next) => next(),
  rateLimiter: () => (_req, _res, next) => next(),
  authorizeResourceAccess: () => (_req, _res, next) => next(),
}));

vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  assertAssignmentOrAdmin: mocks.assertAssignmentOrAdmin,
}));

const workoutRoutes = (await import('../../routes/workoutRoutes.mjs')).default;

const app = () => {
  const a = express();
  a.use(express.json());
  a.use('/api/workout', workoutRoutes);
  return a;
};

const SOMEONE_ELSES_SESSION = { id: 555, userId: 902, title: 'private' };

describe('GET session by id — unauthorized is indistinguishable from missing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a session that does not exist and one you may not see look IDENTICAL', async () => {
    // Miss: the service finds nothing.
    mocks.getWorkoutSessionById.mockResolvedValueOnce(null);
    const miss = await request(app()).get('/api/workout/sessions/555');

    // Exists, but the caller is not authorized.
    mocks.getWorkoutSessionById.mockResolvedValueOnce(SOMEONE_ELSES_SESSION);
    mocks.assertAssignmentOrAdmin.mockResolvedValueOnce(false);
    const denied = await request(app()).get('/api/workout/sessions/555');

    expect(denied.status).toBe(miss.status);
    expect(denied.status).toBe(404);
    // Same status but a different message would leak just as effectively.
    expect(denied.body).toEqual(miss.body);
  });

  it('leaks nothing about the session it refused to show', async () => {
    mocks.getWorkoutSessionById.mockResolvedValue(SOMEONE_ELSES_SESSION);
    mocks.assertAssignmentOrAdmin.mockResolvedValue(false);

    const res = await request(app()).get('/api/workout/sessions/555');
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('private');
    expect(body).not.toContain('902');
    expect(body).not.toMatch(/not authorized/i);
  });

  it('still ENFORCES the denial — the gate is consulted, the session is withheld', async () => {
    // The point is a quieter refusal, not a weaker one.
    mocks.getWorkoutSessionById.mockResolvedValue(SOMEONE_ELSES_SESSION);
    mocks.assertAssignmentOrAdmin.mockResolvedValue(false);

    const res = await request(app()).get('/api/workout/sessions/555');
    expect(mocks.assertAssignmentOrAdmin).toHaveBeenCalledWith(901, 'trainer', 902);
    expect(res.body.session).toBeUndefined();
  });

  it('an AUTHORIZED reader still gets the session (control)', async () => {
    // Without this, "always 404" would pass every assertion above.
    mocks.getWorkoutSessionById.mockResolvedValue(SOMEONE_ELSES_SESSION);
    mocks.assertAssignmentOrAdmin.mockResolvedValue(true);

    const res = await request(app()).get('/api/workout/sessions/555');
    expect(res.status).toBe(200);
    expect(res.body.data.session.id).toBe(555);
  });
});

describe('WRITES deliberately keep 403 — do not "fix" this for symmetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getWorkoutSessionById.mockResolvedValue(SOMEONE_ELSES_SESSION);
    mocks.assertAssignmentOrAdmin.mockResolvedValue(false);
  });

  it('PUT keeps 403 so a trainer who lost an assignment learns WHY the save failed', async () => {
    const res = await request(app()).put('/api/workout/sessions/555').send({ title: 'x' });
    expect(res.status).toBe(403);
  });

  it('DELETE keeps 403 for the same reason', async () => {
    const res = await request(app()).delete('/api/workout/sessions/555');
    expect(res.status).toBe(403);
  });
});
