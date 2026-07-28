import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createPlan: vi.fn(),
  assertAccess: vi.fn(),
}));

const sourcePlan = {
  id: 'source-plan-1',
  userId: 101,
  title: 'Runner Strength Block',
  description: 'Build durable legs.',
  nasmPhase: 2,
  durationWeeks: 4,
  planData: {
    weeks: [
      { week: 1, days: [{ day: 1, title: 'Lower' }] },
      { week: 2, days: [{ day: 1, title: 'Pull' }] },
      { week: 3, days: [{ day: 1, title: 'Power' }] },
    ],
  },
  metadata: { planPdf: { url: '/private/source.pdf' } },
};

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 777, role: 'trainer' };
    next();
  },
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));

vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  verifyClientAccessByPlanId: () => (req, _res, next) => {
    req.workoutPlan = sourcePlan;
    next();
  },
  verifyClientAccessByUserId: () => (_req, _res, next) => next(),
  filterPlansByTrainerAssignment: async (_req, plans) => plans,
  assertAssignmentOrAdmin: (...args) => mocks.assertAccess(...args),
}));

vi.mock('../../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'WorkoutPlan') return { create: mocks.createPlan };
    return {};
  },
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: vi.fn() },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { default: workoutPlanRoutes } = await import('../../routes/workoutPlanRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/workout-plans', workoutPlanRoutes);

describe('POST /api/workout-plans/:id/duplicate', () => {
  beforeEach(() => {
    mocks.createPlan.mockReset();
    mocks.assertAccess.mockReset();
    mocks.assertAccess.mockResolvedValue(true);
    mocks.createPlan.mockImplementation(async (payload) => ({ id: 'copy-plan-1', ...payload }));
  });

  it('copies a source plan into an authorized target client draft', async () => {
    const response = await request(app)
      .post('/api/workout-plans/source-plan-1/duplicate')
      .send({ targetClientId: 202, durationWeeks: 2, title: 'Bot Copy' });

    expect(response.status).toBe(201);
    expect(mocks.assertAccess).toHaveBeenCalledWith(777, 'trainer', 202);
    expect(mocks.createPlan).toHaveBeenCalledWith(expect.objectContaining({
      userId: 202,
      trainerId: 777,
      title: 'Bot Copy',
      status: 'draft',
      durationWeeks: 2,
      currentWeek: 1,
      currentDay: 1,
    }));
    expect(mocks.createPlan.mock.calls[0][0].planData.weeks).toHaveLength(2);
    expect(response.body.plan.userId).toBe(202);
  });

  it('rejects requested copy horizons above one year', async () => {
    const response = await request(app)
      .post('/api/workout-plans/source-plan-1/duplicate')
      .send({ targetClientId: 202, durationWeeks: 53 });

    expect(response.status).toBe(400);
    expect(mocks.createPlan).not.toHaveBeenCalled();
  });

  it('does not copy into an inaccessible target client', async () => {
    mocks.assertAccess.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/workout-plans/source-plan-1/duplicate')
      .send({ targetClientId: 303, durationWeeks: 2 });

    expect(response.status).toBe(404);
    expect(mocks.assertAccess).toHaveBeenCalledWith(777, 'trainer', 303);
    expect(mocks.createPlan).not.toHaveBeenCalled();
  });
});