import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { formatDateOnlyInTimeZone } from '../services/clientTrainingDateService.mjs';

const mockEnsureClientAccess = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();
const mockWorkoutPlanFindAll = vi.fn();
const mockWorkoutSessionFindAll = vi.fn();
const mockDailyWorkoutFormFindOne = vi.fn();
const mockDailyWorkoutFormFindAll = vi.fn();
const mockPdfDerivativeQuery = vi.fn();

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
      WorkoutPlan: {
        findOne: mockWorkoutPlanFindOne,
        findAll: mockWorkoutPlanFindAll,
        sequelize: { query: mockPdfDerivativeQuery },
      },
      WorkoutSession: { findAll: mockWorkoutSessionFindAll },
      DailyWorkoutForm: { findOne: mockDailyWorkoutFormFindOne },
      // These existing models are intentionally present. The current route
      // must not eager-load them because production has no declared association.
      WorkoutPlanDay: {},
      WorkoutPlanDayExercise: {},
      Exercise: {},
    },
  });
  mockWorkoutSessionFindAll.mockResolvedValue([]);
  mockWorkoutPlanFindAll.mockResolvedValue([]);
  mockDailyWorkoutFormFindOne.mockResolvedValue(null);
  mockDailyWorkoutFormFindAll.mockResolvedValue([]);
  mockPdfDerivativeQuery.mockResolvedValue([[]]);
  delete process.env.TRAINING_PLAN_PDF_DERIVATIVES;
});

afterEach(() => {
  delete process.env.TRAINING_PLAN_PDF_DERIVATIVES;
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
    const today = formatDateOnlyInTimeZone(new Date(), 'America/Los_Angeles');
    expect(res.body.todayAssignment).toMatchObject({
      assignmentKey: 'plan-6m:w3:d2:' + today + ':o1:r1',
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

  it('batch-enriches plan catalog PDF status without exposing private derivative storage', async () => {
    process.env.TRAINING_PLAN_PDF_DERIVATIVES = 'true';
    const activePlan = {
      id: 'plan-6m',
      title: 'Six Month Foundation',
      durationWeeks: 26,
      status: 'active',
      contentRevision: 3,
      currentWeek: 1,
      currentDay: 1,
      metadata: { planHorizon: 'six_month' },
      planData: { weeks: [{ days: [{ dayNumber: 1, name: 'Foundation', exercises: [] }] }] },
    };
    mockWorkoutPlanFindOne.mockResolvedValue(activePlan);
    mockWorkoutPlanFindAll.mockResolvedValue([activePlan]);
    mockPdfDerivativeQuery.mockResolvedValue([[
      {
        plan_id: 'plan-6m',
        id: 'derivative-1',
        state: 'ready',
        source_type: 'generated',
        source_revision: 3,
        source_hash: 'safe-source-hash',
        render_hash: 'safe-render-hash',
        renderer_version: 'v1',
        needs_review: false,
        attempt_count: 1,
        safe_error_code: null,
        ready_at: '2026-07-15T12:00:00.000Z',
        storage_key: 'workout-plans/42/private-generated.pdf',
        created_at: '2026-07-15T12:00:00.000Z',
      },
    ]]);

    const res = await request(buildApp())
      .get('/api/workouts/42/current')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(200);
    expect(mockPdfDerivativeQuery).toHaveBeenCalledOnce();
    expect(res.body.trainingPlanCatalog.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      plan: {
        contentRevision: 3,
        pdfDerivative: {
          enabled: true,
          state: 'ready',
          latestGenerated: { sourceRevision: 3, state: 'ready' },
        },
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('private-generated.pdf');
  });
  it('keeps current training available when PDF derivative status storage is unavailable', async () => {
    process.env.TRAINING_PLAN_PDF_DERIVATIVES = 'true';
    const activePlan = {
      id: 'plan-6m',
      title: 'Six Month Foundation',
      durationWeeks: 26,
      status: 'active',
      contentRevision: 3,
      currentWeek: 1,
      currentDay: 1,
      metadata: { planHorizon: 'six_month' },
      planData: { weeks: [{ days: [{ dayNumber: 1, name: 'Foundation', exercises: [] }] }] },
    };
    mockWorkoutPlanFindOne.mockResolvedValue(activePlan);
    mockWorkoutPlanFindAll.mockResolvedValue([activePlan]);
    mockPdfDerivativeQuery.mockRejectedValue(new Error('private derivative storage outage'));

    const res = await request(buildApp())
      .get('/api/workouts/42/current')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(200);
    expect(res.body.todayAssignment).toBeTruthy();
    expect(res.body.trainingPlanCatalog.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      plan: { pdfDerivative: { enabled: true, state: 'unavailable' } },
    });
    expect(JSON.stringify(res.body)).not.toContain('private derivative storage outage');
  });
  it('marks current homework completed when today has a matching planned-assignment log', async () => {
    const activePlan = {
      id: 'plan-6m',
      title: 'Six Month Foundation',
      durationWeeks: 26,
      status: 'active',
      currentWeek: 3,
      currentDay: 2,
      metadata: { planHorizon: 'six_month' },
      planData: {
        weeks: [
          { days: [] },
          { days: [] },
          {
            days: [
              { dayNumber: 1, name: 'Upper Body', exercises: [] },
              {
                dayNumber: 2,
                name: 'Coach Homework Lower Body',
                assignmentType: 'homework',
                exercises: [{ exerciseId: 'ex-1', exerciseName: 'Goblet Squat' }],
              },
            ],
          },
        ],
      },
    };
    const today = formatDateOnlyInTimeZone(new Date(), 'America/Los_Angeles');
    mockWorkoutPlanFindOne.mockResolvedValue(activePlan);
    mockWorkoutPlanFindAll.mockResolvedValue([activePlan]);
    mockDailyWorkoutFormFindOne.mockResolvedValue({
      id: 'daily-form-1',
      submittedAt: '2026-06-06T12:00:00.000Z',
      updatedAt: '2026-06-06T12:01:00.000Z',
      formData: {
        plannedAssignment: {
          assignmentKey: 'plan-6m:w3:d2:homework',
          planId: 'plan-6m',
          assignmentType: 'homework',
        },
      },
    });

    const res = await request(buildApp())
      .get('/api/workouts/42/current')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(200);
    expect(mockDailyWorkoutFormFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { clientId: 42, date: today },
      attributes: ['id', 'formData', 'submittedAt', 'updatedAt'],
    }));
    expect(res.body.todayAssignment).toMatchObject({
      assignmentKey: 'plan-6m:w3:d2:' + today + ':o1:r1',
      status: 'completed',
      isLoggable: false,
      ctaLabel: 'Review Workout',
      completion: {
        source: 'daily_workout_form',
        formId: 'daily-form-1',
      },
    });
  });

  it('returns off-day homework summary with recent planned-assignment completions', async () => {
    const activePlan = {
      id: 'plan-6m',
      title: 'Six Month Foundation',
      durationWeeks: 26,
      status: 'active',
      currentWeek: 3,
      currentDay: 2,
      metadata: { planHorizon: 'six_month' },
      planData: {
        weeks: [
          { days: [] },
          { days: [] },
          {
            days: [
              { dayNumber: 1, name: 'Upper Body', exercises: [] },
              {
                dayNumber: 2,
                name: 'ClientNameMustNotLeak Homework',
                assignmentType: 'homework',
                exercises: [{ exerciseId: 'ex-1', exerciseName: 'Goblet Squat' }],
              },
            ],
          },
        ],
      },
    };
    mockEnsureClientAccess.mockResolvedValueOnce({
      allowed: true,
      clientId: 42,
      models: {
        WorkoutPlan: {
        findOne: mockWorkoutPlanFindOne,
        findAll: mockWorkoutPlanFindAll,
        sequelize: { query: mockPdfDerivativeQuery },
      },
        WorkoutSession: { findAll: mockWorkoutSessionFindAll },
        DailyWorkoutForm: {
          findOne: mockDailyWorkoutFormFindOne,
          findAll: mockDailyWorkoutFormFindAll,
        },
      },
    });
    mockWorkoutPlanFindOne.mockResolvedValue(activePlan);
    mockWorkoutPlanFindAll.mockResolvedValue([activePlan]);
    mockDailyWorkoutFormFindAll.mockImplementation(async (query) => {
      if (query?.where?.date) {
        return [{
          id: 'daily-form-today',
          submittedAt: '2026-06-06T12:00:00.000Z',
          updatedAt: '2026-06-06T12:01:00.000Z',
          formData: {
            plannedAssignment: {
              assignmentKey: 'plan-6m:w3:d2:homework',
              assignmentType: 'homework',
              title: 'ClientNameMustNotLeak Homework',
              weekNumber: 3,
              dayNumber: 2,
              exerciseCount: 1,
              firstExerciseName: 'Goblet Squat',
            },
          },
        }];
      }
      return [
        {
          id: 'daily-form-today',
          submittedAt: '2026-06-06T12:00:00.000Z',
          updatedAt: '2026-06-06T12:01:00.000Z',
          formData: {
            plannedAssignment: {
              assignmentKey: 'plan-6m:w3:d2:homework',
              assignmentType: 'homework',
              title: 'ClientNameMustNotLeak Homework',
              weekNumber: 3,
              dayNumber: 2,
              exerciseCount: 1,
              firstExerciseName: 'Goblet Squat',
            },
          },
        },
        {
          id: 'daily-form-prior',
          submittedAt: '2026-06-03T12:00:00.000Z',
          updatedAt: '2026-06-03T12:01:00.000Z',
          formData: {
            plannedAssignment: {
              assignmentKey: 'plan-6m:w2:d3:homework',
              assignmentType: 'homework',
              title: 'ClientNameMustNotLeak Prior Homework',
              weekNumber: 2,
              dayNumber: 3,
              exerciseCount: 2,
              firstExerciseName: 'Split Squat',
            },
          },
        },
      ];
    });

    const res = await request(buildApp())
      .get('/api/workouts/42/current')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');

    expect(res.status).toBe(200);
    expect(res.body.homeworkSummary).toMatchObject({
      assignmentType: 'homework',
      todayStatus: 'completed',
      todayIsCompleted: true,
      todayIsLoggable: false,
      recentCompletedCount: 2,
      lastCompletedAt: '2026-06-06T12:00:00.000Z',
      recentCompletions: [
        expect.objectContaining({ firstExerciseName: 'Goblet Squat' }),
        expect.objectContaining({ firstExerciseName: 'Split Squat' }),
      ],
    });
    expect(res.body.data.homeworkSummary).toEqual(res.body.homeworkSummary);
    expect(JSON.stringify(res.body.homeworkSummary)).not.toContain('ClientNameMustNotLeak');
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

describe('S0 (Plan Surfacing): GET /:userId/current?forDate=', () => {
  const planFixture = () => ({
    id: 'plan-9',
    title: 'Anchored Plan',
    durationWeeks: 2,
    status: 'active',
    currentWeek: 1,
    currentDay: 1,
    startDate: '2026-08-03',
    createdAt: '2026-08-01T00:00:00.000Z',
    planData: {
      weeks: [1, 2].map((weekNumber) => ({
        weekNumber,
        days: [1, 2].map((dayNumber) => ({
          dayNumber,
          name: `W${weekNumber}D${dayNumber}`,
          exercises: [{ exerciseId: `e${weekNumber}${dayNumber}`, exerciseName: `Move W${weekNumber}D${dayNumber}`, sets: 3, targetReps: '10' }],
        })),
      })),
    },
  });

  it('answers the calendar question via the basis chain (additive field)', async () => {
    mockWorkoutPlanFindOne.mockResolvedValue(planFixture());
    // startDate 2026-08-03 → W2D2 = start + 7 + 1 = 2026-08-11
    const res = await request(buildApp()).get('/api/workouts/42/current?forDate=2026-08-11');
    expect(res.status).toBe(200);
    expect(res.body.dayForDate).toMatchObject({
      basis: 'plan_start',
      weekNumber: 2,
      dayNumber: 2,
      scheduledDate: '2026-08-11',
    });
    // The cursor answer is untouched — /current remains the next-workout truth.
    expect(res.body.currentSession).toBeTruthy();
  });

  it('a date outside the plan answers basis none — never a guess', async () => {
    mockWorkoutPlanFindOne.mockResolvedValue(planFixture());
    const res = await request(buildApp()).get('/api/workouts/42/current?forDate=2027-01-01');
    expect(res.status).toBe(200);
    expect(res.body.dayForDate.basis).toBe('none');
  });

  it('without forDate the field is absent (zero behavior change)', async () => {
    mockWorkoutPlanFindOne.mockResolvedValue(planFixture());
    const res = await request(buildApp()).get('/api/workouts/42/current');
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('dayForDate');
  });
});
