import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: { id: 42, role: 'user' },
  generatePlan: vi.fn(async () => ({ id: 'generated-plan' })),
  generateWorkout: vi.fn(async () => ({ id: 'generated-workout' })),
  assertAssignmentOrAdmin: vi.fn(async () => true),
  loadFreshCanGenerateFlag: vi.fn(async () => false),
  getCorrectiveExercisesForCompensations: vi.fn(async () => ({ tags: [], matchedCount: 0 })),
  getExercise: vi.fn(() => ({ name: 'Exercise' })),
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

async function buildApp(user = { id: 42, role: 'user' }) {
  vi.resetModules();
  mocks.currentUser = user;

  vi.doMock('../../middleware/auth.mjs', () => ({
    protect: (req, res, next) => {
      req.user = mocks.currentUser;
      next();
    },
    authorize: (roles = []) => (req, res, next) => {
      if (req.user?.role === 'admin' || roles.includes(req.user?.role)) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: `Access denied: Must have one of these roles: ${roles.join(', ')}`,
      });
    },
  }));

  vi.doMock('../../services/workoutBuilderService.mjs', () => ({
    generatePlan: mocks.generatePlan,
    generateWorkout: mocks.generateWorkout,
  }));
  vi.doMock('../../middleware/verifyClientAccess.mjs', () => ({
    assertAssignmentOrAdmin: mocks.assertAssignmentOrAdmin,
    loadFreshCanGenerateFlag: mocks.loadFreshCanGenerateFlag,
  }));
  vi.doMock('../../routes/workoutBuilderCandidateRouteHandler.mjs', () => ({
    createWorkoutCandidatesHandler: () => (req, res) => res.json({ success: true, candidates: [] }),
  }));
  vi.doMock('../../services/ai/correctiveExerciseService.mjs', () => ({
    getCorrectiveExercisesForCompensations: mocks.getCorrectiveExercisesForCompensations,
  }));
  vi.doMock('../../models/index.mjs', () => ({
    getExercise: mocks.getExercise,
  }));
  vi.doMock('../../utils/logger.mjs', () => ({
    default: mocks.logger,
  }));

  const { default: workoutBuilderRoutes } = await import('../../routes/workoutBuilderRoutes.mjs');
  const app = express();
  app.use(express.json());
  app.use('/api/workout-builder', workoutBuilderRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ENABLE_CLIENT_PLAN_SELFGEN = 'true';
  mocks.currentUser = { id: 42, role: 'user' };
  mocks.loadFreshCanGenerateFlag.mockResolvedValue(false);
  mocks.assertAssignmentOrAdmin.mockResolvedValue(true);
  mocks.generatePlan.mockResolvedValue({ id: 'generated-plan' });
});

afterEach(() => {
  delete process.env.ENABLE_CLIENT_PLAN_SELFGEN;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('workout builder client-equivalent access', () => {
  it('routes raw user self-generation through the fresh client flag gate', async () => {
    const app = await buildApp();

    const response = await request(app)
      .post('/api/workout-builder/plan')
      .send({ clientId: 42, durationWeeks: 8, sessionsPerWeek: 3, primaryGoal: 'strength' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: 'Workout plan generation is not enabled for your account',
    });
    expect(mocks.loadFreshCanGenerateFlag).toHaveBeenCalledWith(42);
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.generatePlan).not.toHaveBeenCalled();
  });

  it('keeps the raw user self-generation kill switch fail-closed before the fresh flag read', async () => {
    delete process.env.ENABLE_CLIENT_PLAN_SELFGEN;
    const app = await buildApp();

    const response = await request(app)
      .post('/api/workout-builder/plan')
      .send({ clientId: 42, durationWeeks: 8, sessionsPerWeek: 3, primaryGoal: 'strength' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ success: false, error: 'Client workout generation is not enabled' });
    expect(mocks.loadFreshCanGenerateFlag).not.toHaveBeenCalled();
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.generatePlan).not.toHaveBeenCalled();
  });

  it('lets raw user generate their own plan only after the kill switch and fresh flag pass', async () => {
    mocks.loadFreshCanGenerateFlag.mockResolvedValue(true);
    const app = await buildApp();

    const response = await request(app)
      .post('/api/workout-builder/plan')
      .send({ clientId: 42, durationWeeks: 8, sessionsPerWeek: 3, primaryGoal: 'strength' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, plan: { id: 'generated-plan' } });
    expect(mocks.loadFreshCanGenerateFlag).toHaveBeenCalledWith(42);
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.generatePlan).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 42,
      trainerId: 42,
      durationWeeks: 8,
      sessionsPerWeek: 3,
      primaryGoal: 'strength',
    }));
  });

  it('still denies raw user generation for another client before the fresh flag read', async () => {
    const app = await buildApp();

    const response = await request(app)
      .post('/api/workout-builder/plan')
      .send({ clientId: 43, durationWeeks: 8, sessionsPerWeek: 3, primaryGoal: 'strength' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ success: false, error: 'Not authorized for this client' });
    expect(mocks.loadFreshCanGenerateFlag).not.toHaveBeenCalled();
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.generatePlan).not.toHaveBeenCalled();
  });
});
