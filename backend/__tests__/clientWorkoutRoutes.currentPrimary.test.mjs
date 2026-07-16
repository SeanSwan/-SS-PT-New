import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { formatDateOnlyInTimeZone } from '../services/clientTrainingDateService.mjs';

const mockEnsureClientAccess = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();
const mockWorkoutPlanFindAll = vi.fn();
const mockDailyWorkoutFormFindOne = vi.fn();

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 42, role: 'client' };
    next();
  },
}));

vi.mock('../utils/clientAccess.mjs', () => ({
  ensureClientAccess: (...args) => mockEnsureClientAccess(...args),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { default: clientWorkoutRoutes } = await import('../routes/clientWorkoutRoutes.mjs');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/workouts', clientWorkoutRoutes);
  return app;
};

const planFor = ({ id, title, primary }) => ({
  id,
  title,
  durationWeeks: primary ? 39 : 26,
  status: 'active',
  currentWeek: 1,
  currentDay: 1,
  metadata: { planHorizon: primary ? 'nine_month' : 'six_month', isPrimaryPlan: primary },
  planData: {
    weeks: [{
      days: [{
        dayNumber: 1,
        name: title,
        assignmentType: 'homework',
        exercises: [{ exerciseName: primary ? 'Cossack Squat' : 'Goblet Squat' }],
      }],
    }],
  },
});

describe('clientWorkoutRoutes current primary plan selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureClientAccess.mockResolvedValue({
      allowed: true,
      clientId: 42,
      models: {
        WorkoutPlan: { findOne: mockWorkoutPlanFindOne, findAll: mockWorkoutPlanFindAll },
        DailyWorkoutForm: { findOne: mockDailyWorkoutFormFindOne },
      },
    });
    mockDailyWorkoutFormFindOne.mockResolvedValue(null);
  });

  it('drives today assignment from the first ordered active plan when legacy primary metadata overlaps', async () => {
    const olderActive = planFor({ id: 'plan-6m', title: 'Six Month Foundation', primary: false });
    const primaryActive = planFor({ id: 'plan-9m', title: 'Six Month Foundation', primary: true });
    mockWorkoutPlanFindOne.mockResolvedValue(olderActive);
    mockWorkoutPlanFindAll.mockResolvedValue([olderActive, primaryActive]);

    const res = await request(buildApp()).get('/api/workouts/42/current');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('plan-6m');
    const today = formatDateOnlyInTimeZone(new Date(), 'America/Los_Angeles');
    expect(res.body.todayAssignment).toMatchObject({
      assignmentKey: 'plan-6m:w1:d1:' + today + ':o1:r1',
      title: 'Six Month Foundation',
      firstExerciseName: 'Goblet Squat',
      isBillable: false,
      shouldDeductSession: false,
    });
    expect(res.body.trainingPlanCatalog).toMatchObject({
      primaryPlanId: 'plan-6m',
      primaryHorizonKey: 'six_month',
    });
  });
});
