/**
 * DailyWorkoutForm scheduled-session billing policy contract.
 *
 * Locks Sean's trainer workflow rules:
 * - SwanStudios package clients deduct one paid session when a scheduled
 *   trainer-led workout is logged.
 * - A scheduled session already deducted upstream is not double-charged.
 * - Move Fitness clients are free-tracking clients: their workouts are saved
 *   and attendance is completed, but paid sessions are never deducted.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { hashWorkoutPlanContent } from '../services/workoutPlanRevisionService.mjs';

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 99, role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
  trainerOrAdminOnly: (_req, _res, next) => next(),
  adminOnly: (_req, _res, next) => next(),
  checkTrainerClientRelationship: (_req, _res, next) => next(),
}));

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

const mockUserFindByPk = vi.fn();
const mockUserFindOne = vi.fn();
const mockUserDecrement = vi.fn();
const mockDailyWorkoutFormFindOne = vi.fn();
const mockDailyWorkoutFormCreate = vi.fn();
const mockDailyWorkoutFormUpdate = vi.fn();
const mockWorkoutSessionFindOrCreate = vi.fn();
const mockWorkoutLogDestroy = vi.fn();
const mockWorkoutLogBulkCreate = vi.fn();
const mockSessionFindByPk = vi.fn();
const mockSessionTypeFindByPk = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();
const mockWorkoutPlanFindByPk = vi.fn();
const mockWorkoutPlanUpdate = vi.fn();
const mockCompletionReceiptFindOrCreate = vi.fn(async ({ defaults }) => [
  { id: 'receipt-scheduled-route', ...defaults },
  true,
]);

vi.mock('../models/index.mjs', () => ({
  getUser: () => ({ findByPk: mockUserFindByPk, findOne: mockUserFindOne }),
  getDailyWorkoutForm: () => ({
    findOne: mockDailyWorkoutFormFindOne,
    create: mockDailyWorkoutFormCreate,
  }),
  getWorkoutSession: () => ({ findOrCreate: mockWorkoutSessionFindOrCreate }),
  getWorkoutLog: () => ({ destroy: mockWorkoutLogDestroy, bulkCreate: mockWorkoutLogBulkCreate }),
  getWorkoutPlan: () => ({
    findOne: mockWorkoutPlanFindOne,
    findByPk: mockWorkoutPlanFindByPk,
  }),
  getWorkoutPlanCompletionReceipt: () => ({ findOrCreate: mockCompletionReceiptFindOrCreate }),
  getSession: () => ({ findByPk: mockSessionFindByPk }),
  getSessionType: () => ({ findByPk: mockSessionTypeFindByPk }),
  getClientTrainerAssignment: () => ({ findOne: vi.fn() }),
  getTrainerPermissions: () => ({ findOne: vi.fn() }),
  getBodyMeasurement: () => ({ findOne: vi.fn() }),
  getModel: vi.fn(),
}));

vi.mock('../models/TrainerPermissions.mjs', () => ({
  PERMISSION_TYPES: {
    EDIT_WORKOUTS: 'edit_workouts',
    LOG_WORKOUTS: 'log_workouts',
  },
}));

vi.mock('../database.mjs', () => ({
  default: {
    transaction: vi.fn(async () => ({
      LOCK: { UPDATE: 'UPDATE' },
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../services/badgeGamificationBridge.mjs', () => ({
  fireWorkoutBadgeChecks: vi.fn().mockResolvedValue([]),
}));
vi.mock('../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/gamification/challengeWorkoutCompletionBridge.mjs', () => ({
  applyDailyWorkoutFormChallengeProgress: vi.fn().mockResolvedValue(null),
}));

vi.mock('../services/gamification/challengeProgressImpactReceipt.mjs', () => ({
  buildChallengeProgressImpactReceipt: vi.fn(() => ({
    status: 'processed',
    updatedCount: 0,
    skippedCount: 0,
    headline: null,
    updates: [],
  })),
}));

const dailyWorkoutFormRoutes = (await import('../routes/dailyWorkoutFormRoutes.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/workout-forms', dailyWorkoutFormRoutes);

const VALID_PAYLOAD = {
  clientId: 11,
  date: '2026-05-03',
  scheduledSessionId: 777,
  exercises: [
    {
      exerciseName: 'Goblet Squat',
      sets: [{ weight: 40, reps: 10 }],
    },
  ],
  sessionNotes: 'Scheduled training log',
};

const TRAINER_SESSION_ASSIGNMENT = {
  assignmentKey: '6ea7806d-36c8-4307-bd5d-6b04b68be849:w4:d2:trainer_session',
  planId: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
  assignmentType: 'trainer_session',
  source: 'workout_plan',
  isBillable: true,
  shouldDeductSession: true,
  weekNumber: 4,
  dayNumber: 2,
};

function mockScheduledSession(overrides = {}) {
  const session = {
    id: 777,
    userId: 11,
    trainerId: 99,
    sessionDate: '2026-05-03T15:00:00.000Z',
    status: 'scheduled',
    attendanceStatus: null,
    checkInTime: null,
    markedPresentBy: null,
    attendanceRecordedAt: null,
    sessionDeducted: false,
    deductionDate: null,
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  mockSessionFindByPk.mockResolvedValueOnce(session);
  return session;
}

function primeScheduledWorkoutLog({
  availableSessions = 8,
  clientSource = 'swanstudios',
  scheduledSessionOverrides = {},
} = {}) {
  mockDailyWorkoutFormFindOne.mockResolvedValueOnce(null);
  mockUserFindByPk.mockResolvedValueOnce({
    id: 11,
    availableSessions,
    clientSource,
    decrement: mockUserDecrement,
  });
  const scheduledSession = mockScheduledSession(scheduledSessionOverrides);
  mockWorkoutSessionFindOrCreate.mockResolvedValueOnce([
    {
      id: 'workout-session-1',
      update: vi.fn().mockResolvedValue(undefined),
    },
    true,
  ]);
  mockDailyWorkoutFormCreate.mockResolvedValueOnce({
    id: 'daily-form-1',
    submittedAt: '2026-05-03T16:00:00.000Z',
    update: mockDailyWorkoutFormUpdate,
  });
  return scheduledSession;
}

function buildActiveTrainerSessionPlan() {
  const plan = {
    id: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
    userId: 11,
    title: 'Six Month Trainer Arc',
    status: 'active',
    currentWeek: 4,
    currentDay: 2,
    durationWeeks: 26,
    metadata: { planHorizon: 'six_month' },
    planData: {
      weeks: [
        { days: [] },
        { days: [] },
        { days: [] },
        {
          days: [
            { dayLabel: 'Warmup Day', assignmentType: 'homework', exercises: [] },
            {
              dayLabel: 'Trainer Floor Session',
              assignmentType: 'trainer_session',
              shouldDeductSession: true,
              exercises: [{ exerciseName: 'Goblet Squat' }],
            },
            { dayLabel: 'Next Session', assignmentType: 'trainer_session', exercises: [] },
          ],
        },
      ],
    },
    update: mockWorkoutPlanUpdate,
  };
  plan.contentRevision = 4;
  plan.contentHash = hashWorkoutPlanContent(plan.planData);
  return plan;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserDecrement.mockResolvedValue(undefined);
  mockDailyWorkoutFormUpdate.mockResolvedValue(undefined);
  mockWorkoutLogDestroy.mockResolvedValue(undefined);
  mockWorkoutLogBulkCreate.mockResolvedValue([]);
  mockWorkoutPlanFindOne.mockResolvedValue(null);
  mockWorkoutPlanFindByPk.mockResolvedValue(null);
  mockWorkoutPlanUpdate.mockResolvedValue(undefined);
  mockSessionTypeFindByPk.mockResolvedValue(null);
});

describe('POST /api/workout-forms scheduled-session billing policy', () => {
  it('deducts exactly one SwanStudios paid session and stamps the linked schedule completed', async () => {
    const scheduledSession = primeScheduledWorkoutLog();

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(mockUserDecrement).toHaveBeenCalledTimes(1);
    expect(mockUserDecrement).toHaveBeenCalledWith('availableSessions', {
      by: 1,
      transaction: expect.any(Object),
    });
    expect(mockDailyWorkoutFormUpdate).toHaveBeenCalledWith(
      { sessionDeducted: true },
      { transaction: expect.any(Object) },
    );
    expect(scheduledSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        attendanceStatus: 'present',
        markedPresentBy: 99,
        sessionDeducted: true,
      }),
      { transaction: expect.any(Object) },
    );
    expect(scheduledSession.update.mock.calls[0][0].deductionDate).toBeInstanceOf(Date);
    expect(res.body.form.sessionDeducted).toBe(true);
    const formCreate = mockDailyWorkoutFormCreate.mock.calls[0][0];
    expect(formCreate.formData.scheduledSessionId).toBe(777);
    expect(res.body.form.scheduledSessionId).toBe(777);
    expect(res.body.message).toMatch(/session deducted/i);
  });

  it('deducts the scheduled session type credit count for extended SwanStudios sessions', async () => {
    const scheduledSession = primeScheduledWorkoutLog({
      availableSessions: 3,
      scheduledSessionOverrides: { sessionTypeId: 22 },
    });
    mockSessionTypeFindByPk.mockResolvedValueOnce({ id: 22, creditsRequired: 2 });

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(mockSessionTypeFindByPk).toHaveBeenCalledWith(22, {
      attributes: ['id', 'creditsRequired'],
      transaction: expect.any(Object),
    });
    expect(mockUserDecrement).toHaveBeenCalledWith('availableSessions', {
      by: 2,
      transaction: expect.any(Object),
    });
    expect(scheduledSession.update.mock.calls[0][0]).toMatchObject({
      status: 'completed',
      attendanceStatus: 'present',
      sessionDeducted: true,
    });
    expect(res.body.form.sessionDeducted).toBe(true);
  });

  it('rejects extended SwanStudios scheduled logs when the client lacks required credits', async () => {
    const scheduledSession = primeScheduledWorkoutLog({
      availableSessions: 1,
      scheduledSessionOverrides: { sessionTypeId: 22 },
    });
    mockSessionTypeFindByPk.mockResolvedValueOnce({ id: 22, creditsRequired: 2 });

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/needs 2 available session credits/i);
    expect(mockUserDecrement).not.toHaveBeenCalled();
    expect(mockWorkoutSessionFindOrCreate).not.toHaveBeenCalled();
    expect(mockDailyWorkoutFormCreate).not.toHaveBeenCalled();
    expect(scheduledSession.update).not.toHaveBeenCalled();
  });

  it('logs zero-credit assessment sessions without deducting paid credits', async () => {
    const scheduledSession = primeScheduledWorkoutLog({
      availableSessions: 0,
      scheduledSessionOverrides: { sessionTypeId: 23 },
    });
    mockSessionTypeFindByPk.mockResolvedValueOnce({ id: 23, creditsRequired: 0 });

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(mockUserDecrement).not.toHaveBeenCalled();
    expect(mockDailyWorkoutFormUpdate).not.toHaveBeenCalled();
    expect(scheduledSession.update.mock.calls[0][0]).toMatchObject({
      status: 'completed',
      attendanceStatus: 'present',
      sessionDeducted: false,
      deductionDate: null,
    });
    expect(res.body.form.sessionDeducted).toBe(false);
    expect(res.body.form.billing).toMatchObject({
      status: 'not_deducted',
      creditsDeducted: 0,
      creditsRequired: 0,
    });
    expect(res.body.message).toMatch(/without session deduction/i);
  });

  it('does not double-deduct a SwanStudios scheduled session that was already deducted', async () => {
    const existingDeductionDate = new Date('2026-05-03T14:00:00.000Z');
    const scheduledSession = primeScheduledWorkoutLog({
      scheduledSessionOverrides: {
        sessionDeducted: true,
        deductionDate: existingDeductionDate,
      },
    });

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(mockUserDecrement).not.toHaveBeenCalled();
    expect(mockDailyWorkoutFormUpdate).toHaveBeenCalledWith(
      { sessionDeducted: true },
      { transaction: expect.any(Object) },
    );
    expect(scheduledSession.update.mock.calls[0][0]).toMatchObject({
      status: 'completed',
      attendanceStatus: 'present',
      sessionDeducted: true,
      deductionDate: existingDeductionDate,
    });
    expect(res.body.form.sessionDeducted).toBe(true);
    expect(res.body.form.billing).toMatchObject({
      status: 'previously_deducted',
      creditsDeducted: 0,
      creditsRequired: 1,
    });
    expect(res.body.message).toMatch(/previously deducted/i);
  });

  it('completes Move Fitness scheduled sessions without paid-session deduction', async () => {
    const scheduledSession = primeScheduledWorkoutLog({
      availableSessions: 0,
      clientSource: 'move_fitness',
    });

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(mockUserDecrement).not.toHaveBeenCalled();
    expect(mockDailyWorkoutFormUpdate).not.toHaveBeenCalled();
    expect(scheduledSession.update.mock.calls[0][0]).toMatchObject({
      status: 'completed',
      attendanceStatus: 'present',
      sessionDeducted: false,
      deductionDate: null,
    });
    expect(res.body.form.sessionDeducted).toBe(false);
    expect(res.body.form.billing).toMatchObject({
      status: 'not_deducted',
      creditsDeducted: 0,
      creditsRequired: 0,
    });
    expect(res.body.message).toMatch(/without session deduction/i);
  });

  it('advances the active trainer-session plan cursor without changing scheduled billing rules', async () => {
    const scheduledSession = primeScheduledWorkoutLog();
    const activePlan = buildActiveTrainerSessionPlan();
    mockWorkoutPlanFindOne.mockResolvedValue(activePlan);
    mockWorkoutPlanFindByPk.mockResolvedValue(activePlan);

    const res = await request(app).post('/api/workout-forms').send({
      ...VALID_PAYLOAD,
      plannedAssignment: TRAINER_SESSION_ASSIGNMENT,
    });

    expect(res.status).toBe(201);
    expect(mockUserDecrement).toHaveBeenCalledTimes(1);
    expect(scheduledSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        attendanceStatus: 'present',
        sessionDeducted: true,
      }),
      { transaction: expect.any(Object) },
    );
    expect(mockWorkoutPlanUpdate).toHaveBeenCalledWith(expect.objectContaining({
      currentWeek: 4,
      currentDay: 3,
      status: 'active',
    }), { transaction: expect.any(Object) });
    const planUpdate = mockWorkoutPlanUpdate.mock.calls[0][0];
    expect(planUpdate.planData.weeks[3].days[1]).toMatchObject({
      completed: true,
      dailyWorkoutFormId: 'daily-form-1',
      workoutSessionId: 'workout-session-1',
      completionSource: 'daily_workout_form',
    });
    const formCreate = mockDailyWorkoutFormCreate.mock.calls[0][0];
    expect(formCreate.formData.plannedAssignment).toMatchObject({
      assignmentKey: '6ea7806d-36c8-4307-bd5d-6b04b68be849:w4:d2:2026-05-03:o1:r4',
      scheduledDate: '2026-05-03',
      occurrenceIndex: 1,
      prescribedRevision: 4,
      assignmentType: 'trainer_session',
      isBillable: true,
      shouldDeductSession: true,
    });
    expect(res.body.form.planProgress).toMatchObject({
      advanced: true,
      previous: { week: 4, day: 2 },
      next: { week: 4, day: 3 },
    });
  });
});
