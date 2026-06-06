import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockEnsureClientAccess = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();
const mockWorkoutPlanFindAll = vi.fn();
const mockWorkoutSessionFindAll = vi.fn();

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

const { default: clientWorkoutRoutes } = await import('../routes/clientWorkoutRoutes.mjs');
// L1 REV 2 (2026-05-02): planDataToWorkoutDays now lives in the shared
// shape service (Codex follow-up — receipt §8 file-touch list lock).
const { planDataToWorkoutDays } = await import('../services/workoutPlanShapeService.mjs');

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
      WorkoutPlan: { findOne: mockWorkoutPlanFindOne, findAll: mockWorkoutPlanFindAll },
      WorkoutSession: { findAll: mockWorkoutSessionFindAll },
      // These existing models are intentionally present. The current route
      // must not eager-load them because production has no declared association.
      WorkoutPlanDay: {},
      WorkoutPlanDayExercise: {},
      Exercise: {},
    },
  });
  mockWorkoutSessionFindAll.mockResolvedValue([]);
  mockWorkoutPlanFindAll.mockResolvedValue([]);
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

  it('returns todayAssignment and seven training-plan horizon slots from the current plan endpoint', async () => {
    const activePlan = {
      id: 'plan-6m',
      title: 'Six Month Foundation',
      description: 'Main coaching arc',
      durationWeeks: 26,
      status: 'active',
      currentWeek: 3,
      currentDay: 2,
      metadata: { planHorizon: 'six_month' },
      planData: {
        weeks: [
          { days: [{ dayNumber: 1, name: 'Week 1 Foundation', exercises: [] }] },
          { days: [{ dayNumber: 1, name: 'Week 2 Foundation', exercises: [] }] },
          {
            days: [
              { dayNumber: 1, name: 'Upper Body', exercises: [] },
              {
                dayNumber: 2,
                name: 'Coach Homework Lower Body',
                assignmentType: 'homework',
                exercises: [
                  { exerciseId: 'ex-1', exerciseName: 'Goblet Squat', sets: 3, targetReps: '8-10' },
                  { exerciseId: 'ex-2', exerciseName: 'Split Squat', sets: 3, targetReps: '8' },
                ],
              },
            ],
          },
        ],
      },
    };
    mockWorkoutPlanFindOne.mockResolvedValue(activePlan);
    mockWorkoutPlanFindAll.mockResolvedValue([
      { id: 'plan-1m', title: 'One Month Reset', status: 'paused', durationWeeks: 4, metadata: {} },
      activePlan,
    ]);

    const res = await request(buildApp())
      .get('/api/workouts/42/current')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(200);
    expect(res.body.todayAssignment).toMatchObject({
      assignmentKey: 'plan-6m:w3:d2:homework',
      assignmentType: 'homework',
      sessionType: 'solo',
      isLoggable: true,
      isBillable: false,
      shouldDeductSession: false,
      exerciseCount: 2,
      firstExerciseName: 'Goblet Squat',
    });
    expect(res.body.trainingPlanCatalog).toMatchObject({
      defaultHorizonKey: 'six_month',
      primaryPlanId: 'plan-6m',
    });
    expect(res.body.trainingPlanCatalog.slots).toHaveLength(7);
    expect(res.body.trainingPlanCatalog.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      isFilled: true,
      isPrimary: true,
      plan: { id: 'plan-6m', title: 'Six Month Foundation' },
    });
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

  it('does not disclose internal errors from the current workout lookup', async () => {
    mockWorkoutPlanFindOne.mockRejectedValue(new Error('database password leaked in stack'));

    const res = await request(buildApp())
      .get('/api/workouts/42/current')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Server error fetching workout plan',
      code: 'INTERNAL_ERROR',
    });
    expect(JSON.stringify(res.body)).not.toContain('database password leaked in stack');
  });
});

describe('clientWorkoutRoutes GET /:userId/history', () => {
  it('rejects malformed history limits before querying workout history', async () => {
    const res = await request(buildApp())
      .get('/api/workouts/42/history?limit=7junk')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Invalid limit',
    });
    expect(mockWorkoutSessionFindAll).not.toHaveBeenCalled();
  });

  it('does not disclose internal errors from the workout history lookup', async () => {
    mockWorkoutSessionFindAll.mockRejectedValue(new Error('sql detail: private table name'));

    const res = await request(buildApp())
      .get('/api/workouts/42/history')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Server error fetching workout history',
      code: 'INTERNAL_ERROR',
    });
    expect(JSON.stringify(res.body)).not.toContain('sql detail: private table name');
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
