import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock auth middleware to bypass token check + inject a fake trainer user.
vi.mock('../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 99, role: 'admin' }; // admin bypasses verifyClientAccess
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

// Mock sequelize so verifyClientAccess admin shortcut path is fine.
vi.mock('../database.mjs', () => ({
  default: { query: vi.fn(), QueryTypes: { SELECT: 'SELECT' } },
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
