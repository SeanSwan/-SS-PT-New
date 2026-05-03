/**
 * V3b.3 MEDIUM 3 — exerciseKeyPrefix filter on /api/exercises
 * =============================================================
 *
 * Locks the namespace-scoped filter the V3b.3 Playwright smoke
 * relies on. Before this filter, the smoke fetched ?limit=500 and
 * trusted alphabetic ordering to keep the 32 ces-* rows on the
 * first page. If the registry grew past 500 rows AND ces-* sorted
 * past the limit, the smoke would false-fail.
 *
 * Tests cover:
 *   - prefix is forwarded into the Sequelize where clause via Op.startsWith
 *   - empty / whitespace prefix is dropped (no clause added)
 *   - oversize prefix (>64 chars) is truncated to 64
 *   - non-string prefix is silently ignored
 *   - the existing search/type/muscleGroup filters still compose with the new prefix
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Op } from 'sequelize';

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 99, role: 'admin' }; next(); },
  authorize: () => (_req, _res, next) => next(),
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));

vi.mock('../middleware/rateLimiter.mjs', () => ({
  apiLimiter: (_req, _res, next) => next(),
}));

vi.mock('../database.mjs', async () => {
  const sequelize = await import('sequelize');
  return {
    default: { /* sequelize instance — unused in this test */ },
    Op: sequelize.Op,
    sequelize: { where: vi.fn(), cast: vi.fn(), col: vi.fn() },
  };
});

const mockFindAll = vi.fn();
vi.mock('../models/index.mjs', () => ({
  getExercise: () => ({ findAll: mockFindAll }),
  getModel: vi.fn(),
}));

vi.mock('../controllers/workoutController.mjs', () => ({
  default: {
    getExerciseRecommendations: (_req, res) => res.json({ stubbed: true }),
  },
}));

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

const exerciseRoutes = (await import('../routes/exerciseRoutes.mjs')).default;
const app = express();
app.use(express.json());
app.use('/api/exercises', exerciseRoutes);

beforeEach(() => {
  vi.clearAllMocks();
  mockFindAll.mockResolvedValue([]);
});

describe('V3b.3 MEDIUM 3 — exerciseKeyPrefix server-side filter', () => {
  it('forwards a valid prefix into the Sequelize where clause as Op.startsWith', async () => {
    await request(app).get('/api/exercises?limit=500&exerciseKeyPrefix=ces-');
    expect(mockFindAll).toHaveBeenCalled();
    const call = mockFindAll.mock.calls[0][0];
    expect(call.where.exercise_key).toBeDefined();
    // The Op.startsWith key is a Symbol; check the value is the prefix.
    const startsWithSymbol = Object.getOwnPropertySymbols(call.where.exercise_key)[0];
    expect(call.where.exercise_key[startsWithSymbol]).toBe('ces-');
  });

  it('drops an empty prefix (no exercise_key clause added)', async () => {
    await request(app).get('/api/exercises?limit=500&exerciseKeyPrefix=');
    expect(mockFindAll).toHaveBeenCalled();
    const call = mockFindAll.mock.calls[0][0];
    expect(call.where.exercise_key).toBeUndefined();
  });

  it('drops a whitespace-only prefix', async () => {
    await request(app).get('/api/exercises?limit=500&exerciseKeyPrefix=%20%20%20');
    const call = mockFindAll.mock.calls[0][0];
    expect(call.where.exercise_key).toBeUndefined();
  });

  it('truncates oversize prefix (>64 chars) to 64', async () => {
    const longPrefix = 'a'.repeat(120);
    await request(app).get(`/api/exercises?limit=500&exerciseKeyPrefix=${longPrefix}`);
    const call = mockFindAll.mock.calls[0][0];
    const startsWithSymbol = Object.getOwnPropertySymbols(call.where.exercise_key)[0];
    expect(call.where.exercise_key[startsWithSymbol].length).toBe(64);
  });

  it('omits exerciseKeyPrefix when not provided', async () => {
    await request(app).get('/api/exercises?limit=500');
    const call = mockFindAll.mock.calls[0][0];
    expect(call.where.exercise_key).toBeUndefined();
  });

  it('composes with existing type filter without overwriting it', async () => {
    await request(app).get('/api/exercises?limit=500&exerciseKeyPrefix=ces-&type=flexibility');
    const call = mockFindAll.mock.calls[0][0];
    expect(call.where.exercise_key).toBeDefined();
    expect(call.where.exerciseType).toBe('flexibility');
  });
});
