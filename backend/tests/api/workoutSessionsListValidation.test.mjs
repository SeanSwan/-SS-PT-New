/**
 * ============================================================================
 * FILE: workoutSessionsListValidation.test.mjs
 * PURPOSE: Prove the ported validation is WIRED to the live list endpoint.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-30 (SWA-75)
 * ============================================================================
 *
 * tests/unit/workoutSessionQuery.test.mjs proves the parser. This proves the
 * CONTROLLER actually calls it and honours the result — the gap that let a
 * carefully-validated `GET /` sit unreachable while the live endpoint had none.
 * A parser nobody calls is exactly the defect this whole slice came from.
 *
 * Drives the real /api/workout router and asserts what reaches the service layer.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getWorkoutSessions: vi.fn(),
}));

vi.mock('../../services/workoutService.mjs', () => ({
  default: {
    getWorkoutSessions: mocks.getWorkoutSessions,
    getClientProgress: vi.fn(),
    getWorkoutStatistics: vi.fn(),
    getExerciseRecommendations: vi.fn(),
  },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 901, role: 'client' }; next(); },
  authorize: () => (_req, _res, next) => next(),
  rateLimiter: () => (_req, _res, next) => next(),
  // workoutRoutes imports this from authMiddleware, not verifyClientAccess.
  authorizeResourceAccess: () => (_req, _res, next) => next(),
}));

vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  assertAssignmentOrAdmin: vi.fn(async () => true),
}));

const workoutRoutes = (await import('../../routes/workoutRoutes.mjs')).default;

const app = () => {
  const a = express();
  a.use(express.json());
  a.use('/api/workout', workoutRoutes);
  return a;
};

/** Options the controller handed to the service on the most recent call. */
const serviceOptions = () => mocks.getWorkoutSessions.mock.calls.at(-1)?.[1];

describe('GET /api/workout/sessions — ported validation is wired', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getWorkoutSessions.mockResolvedValue([]);
  });

  it('clamps an absurd limit before it reaches the query', async () => {
    // The whole point of the port: this used to pass 1000000 straight through.
    const res = await request(app()).get('/api/workout/sessions?limit=1000000');
    expect(res.status).toBe(200);
    expect(serviceOptions().limit).toBe(100);
  });

  it('rejects a non-numeric limit with 400 instead of a silent NaN', async () => {
    const res = await request(app()).get('/api/workout/sessions?limit=abc');
    expect(res.status).toBe(400);
    expect(mocks.getWorkoutSessions).not.toHaveBeenCalled();
  });

  it('rejects an unknown sort column with 400', async () => {
    const res = await request(app()).get('/api/workout/sessions?sort=evilColumn');
    expect(res.status).toBe(400);
    expect(mocks.getWorkoutSessions).not.toHaveBeenCalled();
  });

  it('rejects an unparseable date with 400', async () => {
    const res = await request(app()).get('/api/workout/sessions?startDate=notadate');
    expect(res.status).toBe(400);
    expect(mocks.getWorkoutSessions).not.toHaveBeenCalled();
  });

  it('still translates page -> offset for the live dashboard consumer', async () => {
    const res = await request(app()).get('/api/workout/sessions?page=3&limit=10');
    expect(res.status).toBe(200);
    expect(serviceOptions().offset).toBe(20);
    expect(serviceOptions().limit).toBe(10);
  });

  it('honours the retired router sortBy/sortDirection spelling', async () => {
    const res = await request(app()).get('/api/workout/sessions?sortBy=duration&sortDirection=asc');
    expect(res.status).toBe(200);
    expect(serviceOptions().sort).toBe('duration');
    expect(serviceOptions().order).toBe('ASC');
  });

  it('a plain request still works and leaves defaults to the service', async () => {
    // Pre-existing contract: with no limit/page/offset the controller passes
    // undefined so workoutService owns the defaults. Hardcoding 10/0 here would
    // quietly move that ownership — pinned by workoutControllerGetSessions.test.mjs.
    const res = await request(app()).get('/api/workout/sessions');
    expect(res.status).toBe(200);
    expect(serviceOptions().limit).toBeUndefined();
    expect(serviceOptions().offset).toBeUndefined();
  });
});
