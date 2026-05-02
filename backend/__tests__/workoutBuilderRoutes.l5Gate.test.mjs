/**
 * L5 (2026-05-02) — workoutBuilderRoutes 4-step access gate auth matrix
 * =====================================================================
 *
 * Codex 2026-05-02 round-2 (L5 pre-impl review) prescribed a 12-case
 * auth-matrix test for the new client-self-service path. Each case below
 * encodes one row of that matrix:
 *
 *   1. Unauth → 401                                  ← protect middleware
 *   2. Client blocked when env flag OFF              ← env kill switch
 *   3. Client + wrong clientId → 403                 ← cross-user attempt
 *   4. Client + own clientId + flag=false → 403      ← per-client opt-in
 *   5. Client + own clientId + flag=true → 200       ← happy path
 *   6. Client spoofing other user even with flag → 403  ← self-only enforced
 *   7. Trainer + active assignment → 200             ← unchanged path
 *   8. Trainer + no assignment → 403                 ← unchanged path
 *   9. Admin → 200                                   ← bypass
 *  10. Invalid clientId → 400                        ← input validation
 *  11. Revoked-flag honored after token issue        ← fresh DB read
 *  12. Rate limiter still applies (structural)       ← post-allowlist
 *
 * The gate is the SAME for /generate and /plan; we exercise both endpoints
 * across the matrix so a future divergence is caught.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// ─────────────────────────────────────────────────────────────
// Mocks (must precede SUT import)
// ─────────────────────────────────────────────────────────────

const mockAssignmentFindOne = vi.fn();
const mockUserFindByPk = vi.fn();

// Toggle: when true, protect() rejects with 401 (case 1). Otherwise it
// injects req.user from headers like the other workoutBuilder tests.
let unauthMode = false;

// Rate-limit mock state - shared object so the `default` factory and the
// per-test `beforeEach` can both reach it. Hoisted so it's defined before
// any vi.mock factory runs.
const { rateLimitState } = vi.hoisted(() => ({
  rateLimitState: { count: 0 },
}));

vi.mock('../middleware/auth.mjs', () => ({
  protect: (req, res, next) => {
    if (unauthMode) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (req.headers['x-test-user-id']) {
      req.user = {
        id: parseInt(req.headers['x-test-user-id'], 10),
        role: req.headers['x-test-user-role'] || 'trainer',
      };
    } else {
      // Only happens for admin test (no role header).
      req.user = { id: 99, role: 'admin' };
    }
    next();
  },
  // Authorize the role allowlist that the route declares — but for tests
  // we still let the gate logic make the final call.
  authorize: (allowed) => (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  },
}));

vi.mock('../services/workoutBuilderService.mjs', () => ({
  generateWorkout: vi.fn().mockResolvedValue({ ok: true, scope: 'generate' }),
  generatePlan: vi.fn().mockResolvedValue({ ok: true, scope: 'plan' }),
}));

vi.mock('express-rate-limit', () => ({
  default: (opts) => {
    const max = opts?.max ?? 1000;
    return (_req, res, next) => {
      rateLimitState.count += 1;
      if (rateLimitState.count > max) {
        return res.status(429).json(opts?.message ?? { error: 'rate-limited' });
      }
      next();
    };
  },
}));

vi.mock('../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'ClientTrainerAssignment') return { findOne: mockAssignmentFindOne };
    if (name === 'User') return { findByPk: mockUserFindByPk };
    return null;
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const workoutBuilderRoutes = (await import('../routes/workoutBuilderRoutes.mjs')).default;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/workout-builder', workoutBuilderRoutes);
  return app;
};

// ─────────────────────────────────────────────────────────────
// Setup / teardown
// ─────────────────────────────────────────────────────────────

const ENV_KEY = 'ENABLE_CLIENT_PLAN_SELFGEN';
let originalEnv;

beforeEach(() => {
  vi.clearAllMocks();
  unauthMode = false;
  originalEnv = process.env[ENV_KEY];
  // Reset the rate-limit count between tests so case 12 starts from zero
  // without earlier-test traffic exhausting the budget.
  rateLimitState.count = 0;
});

afterEach(() => {
  if (originalEnv === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = originalEnv;
});

const post = (path, body, headers = {}) => {
  let req = request(buildApp()).post(path).send(body);
  for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
  return req;
};

// ─────────────────────────────────────────────────────────────
// Case 1 — Unauthenticated request returns 401
// ─────────────────────────────────────────────────────────────

describe('L5 gate / Case 1 - unauthenticated', () => {
  it('returns 401 when protect rejects', async () => {
    unauthMode = true;
    const res = await post('/api/workout-builder/plan', {
      clientId: 42, durationWeeks: 4, primaryGoal: 'general_fitness',
    });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// Cases 2-6 — Client paths with the new gate
// ─────────────────────────────────────────────────────────────

describe('L5 gate / Cases 2-6 - client self-service', () => {
  it('Case 2: client blocked when ENABLE_CLIENT_PLAN_SELFGEN is not "true"', async () => {
    delete process.env[ENV_KEY]; // explicitly OFF
    mockUserFindByPk.mockResolvedValue({ id: 42, canGenerateWorkoutPlans: true });
    const res = await post('/api/workout-builder/plan',
      { clientId: 42, durationWeeks: 4, primaryGoal: 'general_fitness' },
      { 'x-test-user-id': '42', 'x-test-user-role': 'client' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not enabled/i);
  });

  it('Case 3: client requesting OTHER user\'s clientId is denied even with flag on + DB flag true', async () => {
    process.env[ENV_KEY] = 'true';
    mockUserFindByPk.mockResolvedValue({ id: 42, canGenerateWorkoutPlans: true });
    const res = await post('/api/workout-builder/plan',
      { clientId: 99, durationWeeks: 4, primaryGoal: 'general_fitness' },
      { 'x-test-user-id': '42', 'x-test-user-role': 'client' });
    expect(res.status).toBe(403);
    // Self-only check fires BEFORE the flag check, so the User model
    // should never have been queried for case 3.
    expect(mockUserFindByPk).not.toHaveBeenCalled();
  });

  it('Case 4: client with own clientId but canGenerateWorkoutPlans=false → 403', async () => {
    process.env[ENV_KEY] = 'true';
    mockUserFindByPk.mockResolvedValue({ id: 42, canGenerateWorkoutPlans: false });
    const res = await post('/api/workout-builder/plan',
      { clientId: 42, durationWeeks: 4, primaryGoal: 'general_fitness' },
      { 'x-test-user-id': '42', 'x-test-user-role': 'client' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not enabled for your account/i);
    expect(mockUserFindByPk).toHaveBeenCalledOnce();
  });

  it('Case 5: client with own clientId AND canGenerateWorkoutPlans=true → 200', async () => {
    process.env[ENV_KEY] = 'true';
    mockUserFindByPk.mockResolvedValue({ id: 42, canGenerateWorkoutPlans: true });
    const res = await post('/api/workout-builder/plan',
      { clientId: 42, durationWeeks: 4, primaryGoal: 'general_fitness' },
      { 'x-test-user-id': '42', 'x-test-user-role': 'client' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Case 6: client cannot spoof another user even if env flag and DB flag are true', async () => {
    process.env[ENV_KEY] = 'true';
    // Simulate the spoofed target also having flag=true — the self-only
    // check must STILL deny since req.user.id (42) !== clientId (7).
    mockUserFindByPk.mockResolvedValue({ id: 7, canGenerateWorkoutPlans: true });
    const res = await post('/api/workout-builder/generate',
      { clientId: 7, category: 'full_body' },
      { 'x-test-user-id': '42', 'x-test-user-role': 'client' });
    expect(res.status).toBe(403);
    // Self-only check fires BEFORE the flag read.
    expect(mockUserFindByPk).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// Cases 7-9 — Trainer and admin paths (unchanged behavior)
// ─────────────────────────────────────────────────────────────

describe('L5 gate / Cases 7-9 - trainer + admin', () => {
  it('Case 7: trainer with active assignment → 200', async () => {
    mockAssignmentFindOne.mockResolvedValue({ id: 'a-1', status: 'active' });
    const res = await post('/api/workout-builder/generate',
      { clientId: 42, category: 'full_body' },
      { 'x-test-user-id': '7', 'x-test-user-role': 'trainer' });
    expect(res.status).toBe(200);
    // The fresh-flag DB read is for clients only — trainers don't trip it.
    expect(mockUserFindByPk).not.toHaveBeenCalled();
  });

  it('Case 8: trainer without assignment → 403', async () => {
    mockAssignmentFindOne.mockResolvedValue(null);
    const res = await post('/api/workout-builder/plan',
      { clientId: 42, durationWeeks: 4, primaryGoal: 'general_fitness' },
      { 'x-test-user-id': '7', 'x-test-user-role': 'trainer' });
    expect(res.status).toBe(403);
  });

  it('Case 9: admin bypass - no assignment lookup, no flag check', async () => {
    const res = await post('/api/workout-builder/generate',
      { clientId: 42, category: 'full_body' },
      { 'x-test-user-id': '99', 'x-test-user-role': 'admin' });
    expect(res.status).toBe(200);
    expect(mockAssignmentFindOne).not.toHaveBeenCalled();
    expect(mockUserFindByPk).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// Case 10 — Input validation
// ─────────────────────────────────────────────────────────────

describe('L5 gate / Case 10 - invalid clientId', () => {
  it('returns 400 BEFORE running any auth gate when clientId is non-integer', async () => {
    process.env[ENV_KEY] = 'true';
    const res = await post('/api/workout-builder/plan',
      { clientId: 'banana', durationWeeks: 4, primaryGoal: 'general_fitness' },
      { 'x-test-user-id': '42', 'x-test-user-role': 'client' });
    expect(res.status).toBe(400);
    expect(mockUserFindByPk).not.toHaveBeenCalled();
    expect(mockAssignmentFindOne).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// Case 11 — Fresh DB read (revoked-flag honored)
// ─────────────────────────────────────────────────────────────

describe('L5 gate / Case 11 - revoked-flag honored on next request', () => {
  it('two sequential requests with the SAME JWT see the new flag value (fresh DB read)', async () => {
    process.env[ENV_KEY] = 'true';
    // 1st call: flag=true, request succeeds.
    mockUserFindByPk.mockResolvedValueOnce({ id: 42, canGenerateWorkoutPlans: true });
    const ok = await post('/api/workout-builder/plan',
      { clientId: 42, durationWeeks: 4, primaryGoal: 'general_fitness' },
      { 'x-test-user-id': '42', 'x-test-user-role': 'client' });
    expect(ok.status).toBe(200);

    // 2nd call: admin revoked the flag in the DB; next request is denied.
    mockUserFindByPk.mockResolvedValueOnce({ id: 42, canGenerateWorkoutPlans: false });
    const denied = await post('/api/workout-builder/plan',
      { clientId: 42, durationWeeks: 4, primaryGoal: 'general_fitness' },
      { 'x-test-user-id': '42', 'x-test-user-role': 'client' });
    expect(denied.status).toBe(403);
    expect(denied.body.error).toMatch(/not enabled for your account/i);

    // Both calls hit findByPk - no JWT shortcut.
    expect(mockUserFindByPk).toHaveBeenCalledTimes(2);
  });

  it('fresh-flag read fails closed when the User model query throws', async () => {
    process.env[ENV_KEY] = 'true';
    mockUserFindByPk.mockRejectedValue(new Error('connection lost'));
    const res = await post('/api/workout-builder/plan',
      { clientId: 42, durationWeeks: 4, primaryGoal: 'general_fitness' },
      { 'x-test-user-id': '42', 'x-test-user-role': 'client' });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────
// Case 12 — Rate limiter still applies after allowlist expansion
// ─────────────────────────────────────────────────────────────

describe('L5 gate / Case 12 - rate limiter still applies to clients', () => {
  it('11th rapid request from a client returns 429', async () => {
    process.env[ENV_KEY] = 'true';
    mockUserFindByPk.mockResolvedValue({ id: 42, canGenerateWorkoutPlans: true });

    // Allow 10 — the 11th should hit the limiter (matches the route's
    // `max: 10` declaration; mock honors the same number).
    const responses = [];
    for (let i = 0; i < 11; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await post('/api/workout-builder/plan',
        { clientId: 42, durationWeeks: 4, primaryGoal: 'general_fitness' },
        { 'x-test-user-id': '42', 'x-test-user-role': 'client' });
      responses.push(res.status);
    }
    expect(responses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(responses[10]).toBe(429);
  });
});
