import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock auth middleware to bypass token check + inject a fake user.
// Defaults to admin (preserves all 24 existing field-validation tests' assumptions).
// Tests that need a trainer/client role can set `x-test-user-id` and
// `x-test-user-role` headers - hostile-review M2 fix 2026-04-30.
vi.mock('../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    if (req.headers['x-test-user-id']) {
      req.user = {
        id: parseInt(req.headers['x-test-user-id'], 10),
        role: req.headers['x-test-user-role'] || 'admin',
      };
    } else {
      req.user = { id: 99, role: 'admin' };
    }
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

// Mock the service so we capture what the route hands it.
vi.mock('../services/workoutBuilderService.mjs', () => ({
  generateWorkout: vi.fn(),
  generatePlan: vi.fn(),
}));

// Mock the rate limiter so it never blocks.
vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

// Mock the ClientTrainerAssignment model contract for trainer-path tests
// (M2 hostile-review fix). Default to no assignment; individual tests override.
const mockAssignmentFindOne = vi.fn();
vi.mock('../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'ClientTrainerAssignment') {
      return { findOne: mockAssignmentFindOne };
    }
    return null;
  },
}));

const { generateWorkout, generatePlan } = await import('../services/workoutBuilderService.mjs');
const workoutBuilderRoutes = (await import('../routes/workoutBuilderRoutes.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/workout-builder', workoutBuilderRoutes);

beforeEach(() => {
  vi.clearAllMocks();
  generateWorkout.mockResolvedValue({ ok: true });
  generatePlan.mockResolvedValue({ ok: true });
});

describe('POST /api/workout-builder/generate - field validation', () => {
  it('passes valid training style fields through to single-workout generation', async () => {
    await request(app).post('/api/workout-builder/generate').send({
      clientId: 1,
      category: 'full_body',
      trainingIntensityMode: 'hardcore',
      hardcoreMethod: 'density',
    });

    const args = generateWorkout.mock.calls[0][0];
    expect(args.trainingIntensityMode).toBe('hardcore');
    expect(args.hardcoreMethod).toBe('density');
  });

  it('passes valid primaryGoal + nasmPhase through to the service', async () => {
    await request(app).post('/api/workout-builder/generate').send({
      clientId: 1, category: 'full_body',
      primaryGoal: 'hypertrophy', nasmPhase: 3,
    });
    expect(generateWorkout).toHaveBeenCalledTimes(1);
    const args = generateWorkout.mock.calls[0][0];
    expect(args.primaryGoal).toBe('hypertrophy');
    expect(args.nasmPhase).toBe(3);
  });

  it('drops invalid primaryGoal silently (service falls back to general_fitness)', async () => {
    await request(app).post('/api/workout-builder/generate').send({
      clientId: 1, category: 'full_body',
      primaryGoal: 'powerlifting',
    });
    const args = generateWorkout.mock.calls[0][0];
    expect(args.primaryGoal).toBeUndefined();
  });

  it('drops out-of-range nasmPhase silently', async () => {
    await request(app).post('/api/workout-builder/generate').send({
      clientId: 1, category: 'full_body', nasmPhase: 99,
    });
    const args = generateWorkout.mock.calls[0][0];
    expect(args.nasmPhase).toBeUndefined();
  });

  it('drops non-integer nasmPhase silently', async () => {
    await request(app).post('/api/workout-builder/generate').send({
      clientId: 1, category: 'full_body', nasmPhase: 'three',
    });
    const args = generateWorkout.mock.calls[0][0];
    expect(args.nasmPhase).toBeUndefined();
  });

  it('drops partially numeric nasmPhase strings instead of parseInt coercing them', async () => {
    await request(app).post('/api/workout-builder/generate').send({
      clientId: 1, category: 'full_body', nasmPhase: '3abc',
    });
    const args = generateWorkout.mock.calls[0][0];
    expect(args.nasmPhase).toBeUndefined();
  });

  it('still requires valid clientId', async () => {
    const res = await request(app).post('/api/workout-builder/generate').send({
      category: 'full_body', primaryGoal: 'strength',
    });
    expect(res.status).toBe(400);
    expect(generateWorkout).not.toHaveBeenCalled();
  });

  it('legacy callers without goal/phase fields still work', async () => {
    await request(app).post('/api/workout-builder/generate').send({
      clientId: 1, category: 'full_body',
    });
    expect(generateWorkout).toHaveBeenCalledTimes(1);
    const args = generateWorkout.mock.calls[0][0];
    expect(args.primaryGoal).toBeUndefined();
    expect(args.nasmPhase).toBeUndefined();
  });

  it.each([1, 2, 3, 4, 5])('accepts valid nasmPhase %i', async (phase) => {
    await request(app).post('/api/workout-builder/generate').send({
      clientId: 1, category: 'full_body', nasmPhase: phase,
    });
    const args = generateWorkout.mock.calls[0][0];
    expect(args.nasmPhase).toBe(phase);
  });
});

describe('POST /api/workout-builder/plan - field validation', () => {
  it('normalizes invalid training style fields before long-plan generation', async () => {
    await request(app).post('/api/workout-builder/plan').send({
      clientId: 1,
      durationWeeks: 12,
      primaryGoal: 'hypertrophy',
      trainingIntensityMode: 'extreme',
      hardcoreMethod: 'reckless',
    });

    const args = generatePlan.mock.calls[0][0];
    expect(args.trainingIntensityMode).toBe('base');
    expect(args.hardcoreMethod).toBe('standard');
  });

  it('passes valid startingPhaseOverride through to the service', async () => {
    await request(app).post('/api/workout-builder/plan').send({
      clientId: 1, durationWeeks: 12, primaryGoal: 'hypertrophy',
      startingPhaseOverride: 2,
    });
    expect(generatePlan).toHaveBeenCalledTimes(1);
    const args = generatePlan.mock.calls[0][0];
    expect(args.startingPhaseOverride).toBe(2);
  });

  it('drops out-of-range startingPhaseOverride silently', async () => {
    await request(app).post('/api/workout-builder/plan').send({
      clientId: 1, durationWeeks: 12, primaryGoal: 'hypertrophy',
      startingPhaseOverride: 99,
    });
    const args = generatePlan.mock.calls[0][0];
    expect(args.startingPhaseOverride).toBeUndefined();
  });

  it('drops zero/negative startingPhaseOverride silently', async () => {
    await request(app).post('/api/workout-builder/plan').send({
      clientId: 1, durationWeeks: 12, primaryGoal: 'hypertrophy',
      startingPhaseOverride: 0,
    });
    const args = generatePlan.mock.calls[0][0];
    expect(args.startingPhaseOverride).toBeUndefined();
  });

  it('drops partially numeric startingPhaseOverride strings instead of parseInt coercing them', async () => {
    await request(app).post('/api/workout-builder/plan').send({
      clientId: 1, durationWeeks: 12, primaryGoal: 'hypertrophy',
      startingPhaseOverride: '2phase',
    });
    const args = generatePlan.mock.calls[0][0];
    expect(args.startingPhaseOverride).toBeUndefined();
  });

  it('legacy plan callers without startingPhaseOverride still work', async () => {
    await request(app).post('/api/workout-builder/plan').send({
      clientId: 1, durationWeeks: 12, primaryGoal: 'hypertrophy',
    });
    expect(generatePlan).toHaveBeenCalledTimes(1);
    const args = generatePlan.mock.calls[0][0];
    expect(args.startingPhaseOverride).toBeUndefined();
  });

  it('still validates primaryGoal allowlist (existing behavior)', async () => {
    await request(app).post('/api/workout-builder/plan').send({
      clientId: 1, durationWeeks: 12, primaryGoal: 'powerlifting',
    });
    const args = generatePlan.mock.calls[0][0];
    expect(args.primaryGoal).toBe('general_fitness'); // safe fallback per existing route logic
  });

  it.each(['general_fitness', 'hypertrophy', 'strength', 'fat_loss', 'athletic_performance', 'golf_performance'])(
    'accepts valid primaryGoal: %s',
    async (goal) => {
      await request(app).post('/api/workout-builder/plan').send({
        clientId: 1, durationWeeks: 12, primaryGoal: goal,
      });
      const args = generatePlan.mock.calls[0][0];
      expect(args.primaryGoal).toBe(goal);
    }
  );
});

// ─────────────────────────────────────────────────────────────
// M2 hostile-review fix 2026-04-30: trainer-path coverage.
// The pre-fix validation file ran every test as admin, masking trainer-path
// bugs. The schema-mismatch BLOCKER shipped in f34f1199c because nothing in
// this file exercised the trainer code path through verifyClientAccess.
// These tests close the structural gap.
// ─────────────────────────────────────────────────────────────

describe('workoutBuilderRoutes - trainer-path verifyClientAccess', () => {
  beforeEach(() => {
    mockAssignmentFindOne.mockReset();
  });

  it('trainer WITH active assignment passes verifyClientAccess - reaches handler', async () => {
    mockAssignmentFindOne.mockResolvedValue({ id: 'asgn-42', status: 'active' });
    const res = await request(app)
      .post('/api/workout-builder/generate')
      .send({ clientId: 99, category: 'full_body' })
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer');
    expect(res.status).not.toBe(403);
    // Service was reached
    expect(generateWorkout).toHaveBeenCalled();
  });

  it('trainer WITHOUT assignment gets 403 (matches existing route handler behavior)', async () => {
    mockAssignmentFindOne.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/workout-builder/generate')
      .send({ clientId: 999, category: 'full_body' })
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer');
    expect(res.status).toBe(403);
    expect(generateWorkout).not.toHaveBeenCalled();
  });

  it('trainer assignment query uses status=active contract (NOT isActive bool) - schema regression', async () => {
    mockAssignmentFindOne.mockResolvedValue({ id: 'a-1' });
    await request(app)
      .post('/api/workout-builder/plan')
      .send({ clientId: 42, durationWeeks: 12, primaryGoal: 'hypertrophy' })
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer');
    const where = mockAssignmentFindOne.mock.calls[0][0].where;
    expect(where).toEqual({ trainerId: 7, clientId: 42, status: 'active' });
    expect(where).not.toHaveProperty('isActive');
  });

  it('trainer assignment query failing throws (model unavailable / DB down) -> fails closed -> 403', async () => {
    mockAssignmentFindOne.mockRejectedValue(new Error("Model 'ClientTrainerAssignment' not found in cache"));
    const res = await request(app)
      .post('/api/workout-builder/plan')
      .send({ clientId: 42, durationWeeks: 12, primaryGoal: 'hypertrophy' })
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer');
    expect(res.status).toBe(403);
  });
});
