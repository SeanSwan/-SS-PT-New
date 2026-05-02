import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// ─────────────────────────────────────────────────────────────
// W1A-3 (2026-05-01) regression test for safeWorkoutBuilderDetails.
//
// Production incident chain led to commit cf08ee98a adding
// `details: err.message` to the 500 response body so the frontend's
// inline error display could surface the real cause. Codex / Village
// flagged that as info-leak risk in the 2026-05-01 review.
//
// REV 3 fix: route err.message through a safe-message dictionary
// before surfacing. This test locks the dictionary contract so a
// regression to bare err.message fails the build.
// ─────────────────────────────────────────────────────────────

const mockGenerateWorkout = vi.fn();
const mockGeneratePlan = vi.fn();
const mockAssertAccess = vi.fn();

vi.mock('../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: '98', role: 'trainer' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../services/workoutBuilderService.mjs', () => ({
  generateWorkout: (...args) => mockGenerateWorkout(...args),
  generatePlan: (...args) => mockGeneratePlan(...args),
}));

vi.mock('../services/workoutBuilderGoalConfig.mjs', () => ({
  ALLOWED_GOALS: ['general_fitness', 'hypertrophy', 'strength', 'fat_loss', 'athletic_performance', 'golf_performance'],
}));

vi.mock('../middleware/verifyClientAccess.mjs', () => ({
  assertAssignmentOrAdmin: (...args) => mockAssertAccess(...args),
}));

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

let app;
beforeEach(async () => {
  vi.clearAllMocks();
  mockAssertAccess.mockResolvedValue(true);

  const { default: workoutBuilderRoutes } = await import('../routes/workoutBuilderRoutes.mjs');
  app = express();
  app.use(express.json());
  app.use('/api/workout-builder', workoutBuilderRoutes);
});

describe('safeWorkoutBuilderDetails — known error class mapping', () => {
  it('maps "client context unavailable" to a friendly trainer message (no leak)', async () => {
    mockGenerateWorkout.mockRejectedValue(
      new Error('Unable to generate workout: client context unavailable'),
    );
    const res = await request(app)
      .post('/api/workout-builder/generate')
      .send({ clientId: 99, category: 'full_body', exerciseCount: 4 });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Failed to generate workout');
    expect(res.body.details).toBe(
      "Unable to load client data. Verify the client has an active profile, pain entries, and an equipment profile.",
    );
    // Lock the contract: NEVER pass through the raw internal phrase
    expect(res.body.details).not.toContain('client context unavailable');
  });

  it('maps "not have an active assignment" to a trainer-friendly message', async () => {
    mockGenerateWorkout.mockRejectedValue(
      new Error('Trainer does not have an active assignment with this client'),
    );
    const res = await request(app)
      .post('/api/workout-builder/generate')
      .send({ clientId: 99, category: 'full_body', exerciseCount: 4 });

    expect(res.status).toBe(500);
    expect(res.body.details).toBe(
      'You are not assigned to this client. Ask an admin to create the assignment.',
    );
    expect(res.body.details).not.toContain('does not have');
  });

  it('maps Sequelize-shaped DB errors to a generic message (no SQL leak)', async () => {
    // Simulate a Sequelize validation error message that would otherwise
    // leak column names + table names + raw SQL fragments.
    mockGenerateWorkout.mockRejectedValue(
      new Error('SequelizeDatabaseError: column "isActive" does not exist; SELECT * FROM "trainer_permissions"'),
    );
    const res = await request(app)
      .post('/api/workout-builder/generate')
      .send({ clientId: 99, category: 'full_body', exerciseCount: 4 });

    expect(res.status).toBe(500);
    // MUST fall through to generic message — no SQL fragments leak
    expect(res.body.details).toBe(
      'Generation failed. Please try again or contact support if it persists.',
    );
    expect(res.body.details).not.toContain('SequelizeDatabaseError');
    expect(res.body.details).not.toContain('column');
    expect(res.body.details).not.toContain('SELECT');
    expect(res.body.details).not.toContain('trainer_permissions');
  });

  it('maps unknown error class to generic message', async () => {
    mockGenerateWorkout.mockRejectedValue(new Error('Some weird internal thing happened with stack trace blah'));
    const res = await request(app)
      .post('/api/workout-builder/generate')
      .send({ clientId: 99, category: 'full_body', exerciseCount: 4 });

    expect(res.status).toBe(500);
    expect(res.body.details).toBe(
      'Generation failed. Please try again or contact support if it persists.',
    );
  });

  it('handles errors with no message gracefully', async () => {
    mockGenerateWorkout.mockRejectedValue({ no: 'message' });
    const res = await request(app)
      .post('/api/workout-builder/generate')
      .send({ clientId: 99, category: 'full_body', exerciseCount: 4 });

    expect(res.status).toBe(500);
    expect(res.body.details).toBe(
      'Generation failed. Please try again or contact support if it persists.',
    );
  });

  it('plan endpoint also routes through the safe-message dictionary', async () => {
    mockGeneratePlan.mockRejectedValue(
      new Error('Unable to generate workout: client context unavailable'),
    );
    const res = await request(app)
      .post('/api/workout-builder/plan')
      .send({ clientId: 99, durationWeeks: 4, sessionsPerWeek: 3, primaryGoal: 'general_fitness' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to generate plan');
    // Plan endpoint shares the same dictionary
    expect(res.body.details).toBe(
      "Unable to load client data. Verify the client has an active profile, pain entries, and an equipment profile.",
    );
  });
});
