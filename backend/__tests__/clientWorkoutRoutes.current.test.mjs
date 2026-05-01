import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockEnsureClientAccess = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.headers['x-test-user-id'] || 42),
      role: req.headers['x-test-user-role'] || 'client',
    };
    next();
  },
}));

vi.mock('../utils/clientAccess.mjs', () => ({
  ensureClientAccess: (...args) => mockEnsureClientAccess(...args),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const {
  default: clientWorkoutRoutes,
  planDataToWorkoutDays,
} = await import('../routes/clientWorkoutRoutes.mjs');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/workouts', clientWorkoutRoutes);
  return app;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockEnsureClientAccess.mockResolvedValue({
    allowed: true,
    clientId: 42,
    models: {
      WorkoutPlan: { findOne: mockWorkoutPlanFindOne },
      // These existing models are intentionally present. The current route
      // must not eager-load them because production has no declared association.
      WorkoutPlanDay: {},
      WorkoutPlanDayExercise: {},
      Exercise: {},
    },
  });
});

describe('clientWorkoutRoutes GET /:userId/current', () => {
  it('reads active WorkoutPlan without the invalid WorkoutPlanDay include and returns legacy-compatible plan shape', async () => {
    mockWorkoutPlanFindOne.mockImplementation(async (query) => {
      if (query.include?.length) {
        throw new Error('WorkoutPlanDay is not associated to WorkoutPlan!');
      }

      return {
        id: 'plan-1',
        title: 'Current Phase 2 Plan',
        description: 'Strength endurance block',
        durationWeeks: 12,
        status: 'active',
        currentWeek: 1,
        currentDay: 1,
        tags: ['hypertrophy'],
        createdAt: '2026-05-01T00:00:00.000Z',
        planData: {
          weeks: [{
            days: [{
              dayNumber: 1,
              dayName: 'Monday',
              focus: 'full body',
              exercises: [{
                exerciseId: 'ex-1',
                exerciseName: 'Goblet Squat',
                sets: 3,
                targetReps: '8-12',
                restTime: 60,
              }],
            }],
          }],
        },
      };
    });

    const res = await request(buildApp())
      .get('/api/workouts/42/current')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(200);
    expect(mockWorkoutPlanFindOne).toHaveBeenCalledOnce();
    expect(mockWorkoutPlanFindOne.mock.calls[0][0]).not.toHaveProperty('include');
    expect(res.body.success).toBe(true);
    expect(res.body.data.days[0].dayName).toBe('Monday');
    expect(res.body.data.days[0].exercises[0].exerciseName).toBe('Goblet Squat');
    expect(res.body.plan).toEqual(res.body.data);
  });

  it('keeps the no-plan empty state as 200 with data and plan set to null', async () => {
    mockWorkoutPlanFindOne.mockResolvedValue(null);

    const res = await request(buildApp())
      .get('/api/workouts/42/current')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
    expect(res.body.plan).toBeNull();
  });
});

describe('planDataToWorkoutDays', () => {
  it('uses the current week JSONB days/sessions instead of normalized child tables', () => {
    const days = planDataToWorkoutDays({
      weeks: [
        { days: [{ dayNumber: 1, dayName: 'Week 1 Day', exercises: [] }] },
        { sessions: [{ dayNumber: 2, name: 'Week 2 Pull', exercises: [{ name: 'Row', reps: '10' }] }] },
      ],
    }, 2);

    expect(days).toHaveLength(1);
    expect(days[0].name).toBe('Week 2 Pull');
    expect(days[0].exercises[0].exerciseName).toBe('Row');
  });
});
