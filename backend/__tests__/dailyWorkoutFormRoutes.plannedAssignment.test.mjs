/**
 * Planned workout assignment logging route tests.
 *
 * Locks the off-day homework path: a client can log a verified workout-plan
 * assignment without paid-session deduction, but only after the backend
 * confirms the assignment matches the active plan cursor.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { hashWorkoutPlanContent } from '../services/workoutPlanRevisionService.mjs';

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 99, role: 'admin' };
    next();
  },
  trainerOrAdminOnly: (_req, _res, next) => next(),
  adminOnly: (_req, _res, next) => next(),
  checkTrainerClientRelationship: (_req, _res, next) => next(),
}));

const mockUserDecrement = vi.fn();
const mockUserFindByPk = vi.fn();
const mockDailyWorkoutFormFindOne = vi.fn();
const mockDailyWorkoutFormCreate = vi.fn();
const mockWorkoutSessionFindOrCreate = vi.fn();
const mockWorkoutLogDestroy = vi.fn();
const mockWorkoutLogBulkCreate = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();
const mockWorkoutPlanFindByPk = vi.fn();
const mockWorkoutPlanUpdate = vi.fn();
const mockCompletionReceiptFindOrCreate = vi.fn(async ({ defaults }) => [
  { id: 'receipt-route', ...defaults },
  true,
]);

vi.mock('../models/index.mjs', () => ({
  getUser: () => ({ findByPk: mockUserFindByPk, findOne: vi.fn() }),
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
  getSession: () => ({ findByPk: vi.fn() }),
  getClientTrainerAssignment: () => ({ findOne: vi.fn() }),
  getTrainerPermissions: () => ({ findOne: vi.fn() }),
  getBodyMeasurement: () => ({ findOne: vi.fn() }),
}));

vi.mock('../models/TrainerPermissions.mjs', () => ({
  PERMISSION_TYPES: { EDIT_WORKOUTS: 'edit_workouts' },
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

const todayIso = () => new Date().toISOString().split('T')[0];

const payload = {
  clientId: 11,
  date: todayIso(),
  exercises: [
    { exerciseName: 'Goblet Squat', sets: [{ weight: 40, reps: 10 }] },
  ],
  sessionNotes: 'Logged from homework assignment',
  plannedAssignment: {
    assignmentKey: '6ea7806d-36c8-4307-bd5d-6b04b68be849:w4:d2:homework',
    planId: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
    assignmentType: 'homework',
    source: 'workout_plan',
    isBillable: false,
    shouldDeductSession: false,
    weekNumber: 4,
    dayNumber: 2,
  },
};

const buildActivePlan = () => {
  const plan = {
  id: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
  userId: 11,
  title: 'Six Month Foundation',
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
          { dayLabel: 'Recovery Day', assignmentType: 'rest', exercises: [] },
          {
            dayLabel: 'Coach Homework Lower Body',
            assignmentType: 'homework',
            exercises: [{ exerciseName: 'Goblet Squat' }],
          },
        ],
      },
      { days: [{ dayLabel: 'Next Week Start', assignmentType: 'homework', exercises: [] }] },
    ],
  },
  update: mockWorkoutPlanUpdate,
  };
  plan.contentRevision = 4;
  plan.contentHash = hashWorkoutPlanContent(plan.planData);
  return plan;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUserDecrement.mockResolvedValue(undefined);
  mockUserFindByPk.mockResolvedValue({
    id: 11,
    timeZone: 'UTC',
    timeZoneConfigured: true,
    clientSource: 'swanstudios',
    availableSessions: 0,
    decrement: mockUserDecrement,
  });
  mockDailyWorkoutFormFindOne.mockResolvedValue(null);
  mockWorkoutLogDestroy.mockResolvedValue(undefined);
  mockWorkoutLogBulkCreate.mockResolvedValue([]);
  mockWorkoutSessionFindOrCreate.mockResolvedValue([
    { id: 'workout-session-1', update: vi.fn().mockResolvedValue(undefined) },
    true,
  ]);
  mockDailyWorkoutFormCreate.mockResolvedValue({
    id: 'daily-form-1',
    submittedAt: '2026-06-06T12:00:00.000Z',
    update: vi.fn().mockResolvedValue(undefined),
  });
  mockWorkoutPlanUpdate.mockResolvedValue(undefined);
  const activePlan = buildActivePlan();
  mockWorkoutPlanFindOne.mockResolvedValue(activePlan);
  mockWorkoutPlanFindByPk.mockResolvedValue(activePlan);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/workout-forms planned assignment logging', () => {
  it('stores verified homework assignment metadata and does not deduct a paid session', async () => {
    const res = await request(app).post('/api/workout-forms').send(payload);

    expect(res.status).toBe(201);
    expect(mockUserDecrement).not.toHaveBeenCalled();
    expect(mockWorkoutPlanFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '6ea7806d-36c8-4307-bd5d-6b04b68be849', userId: 11, status: 'active' },
    }));
    const formCreate = mockDailyWorkoutFormCreate.mock.calls[0][0];
    expect(mockWorkoutLogDestroy).toHaveBeenCalledWith({
      where: { sessionId: 'workout-session-1' },
      transaction: expect.any(Object),
    });
    expect(mockWorkoutLogBulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        sessionId: 'workout-session-1',
        exerciseName: 'Goblet Squat',
        setNumber: 1,
        reps: 10,
        weight: 40,
      }),
    ], expect.objectContaining({
      transaction: expect.any(Object),
      validate: true,
    }));
    expect(formCreate.sessionDeducted).toBe(false);
    expect(formCreate.formData.plannedAssignment).toMatchObject({
      assignmentKey: `6ea7806d-36c8-4307-bd5d-6b04b68be849:w4:d2:${payload.date}:o1:r4`,
      planId: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
      scheduledDate: payload.date,
      occurrenceIndex: 1,
      prescribedRevision: 4,
      assignmentType: 'homework',
      source: 'workout_plan',
      isBillable: false,
      shouldDeductSession: false,
      title: 'Coach Homework Lower Body',
      weekNumber: 4,
      dayNumber: 2,
      exerciseCount: 1,
      firstExerciseName: 'Goblet Squat',
    });
    expect(res.body.form.plannedAssignment.shouldDeductSession).toBe(false);
    expect(res.body.form.billing).toMatchObject({
      status: 'not_deducted',
      creditsDeducted: 0,
      creditsRequired: 0,
    });
    expect(mockWorkoutPlanUpdate).toHaveBeenCalledWith(expect.objectContaining({
      currentWeek: 5,
      currentDay: 1,
      status: 'active',
    }), { transaction: expect.any(Object) });
    const planUpdate = mockWorkoutPlanUpdate.mock.calls[0][0];
    expect(planUpdate.planData.weeks[3].days[1]).toMatchObject({
      completed: true,
      dailyWorkoutFormId: 'daily-form-1',
      workoutSessionId: 'workout-session-1',
    });
    expect(res.body.form.planProgress).toMatchObject({
      advanced: true,
      previous: { week: 4, day: 2 },
      next: { week: 5, day: 1 },
    });
    expect(res.body.message).toMatch(/without session deduction/i);
  });

  it('accepts the client local day when it is still the previous UTC date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T16:30:00.000Z'));
    mockUserFindByPk.mockResolvedValue({
      id: 11,
      timeZone: 'Asia/Tokyo',
      timeZoneConfigured: true,
      clientSource: 'swanstudios',
      availableSessions: 0,
      decrement: mockUserDecrement,
    });

    const res = await request(app).post('/api/workout-forms').send({
      ...payload,
      date: '2026-03-08',
    });

    expect(res.status).toBe(201);
    expect(mockDailyWorkoutFormCreate.mock.calls[0][0]).toMatchObject({
      clientId: 11,
      date: '2026-03-08',
    });
  });
  it('returns normalized persisted ids in the save receipt when clientId arrives as a string', async () => {
    const res = await request(app)
      .post('/api/workout-forms')
      .send({ ...payload, clientId: '11' });

    expect(res.status).toBe(201);
    expect(mockDailyWorkoutFormCreate.mock.calls[0][0]).toMatchObject({
      clientId: 11,
      trainerId: 99,
    });
    expect(res.body.form).toMatchObject({
      clientId: 11,
      trainerId: 99,
    });
  });

  it('stores selected training-location equipment profile metadata in the daily form JSON', async () => {
    const res = await request(app)
      .post('/api/workout-forms')
      .send({ ...payload, equipmentProfileId: 77 });

    expect(res.status).toBe(201);
    const formCreate = mockDailyWorkoutFormCreate.mock.calls[0][0];
    expect(formCreate.formData.equipmentProfileId).toBe(77);
  });

  it('rejects invalid equipment profile ids before writing workout data', async () => {
    const res = await request(app)
      .post('/api/workout-forms')
      .send({ ...payload, equipmentProfileId: 'not-a-profile-id' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/equipment profile/i);
    expect(mockWorkoutSessionFindOrCreate).not.toHaveBeenCalled();
    expect(mockDailyWorkoutFormCreate).not.toHaveBeenCalled();
    expect(mockUserDecrement).not.toHaveBeenCalled();
  });

  it('rejects stale or forged assignment keys before writing workout data', async () => {
    const res = await request(app).post('/api/workout-forms').send({
      ...payload,
      plannedAssignment: {
        ...payload.plannedAssignment,
        assignmentKey: '6ea7806d-36c8-4307-bd5d-6b04b68be849:w9:d9:homework',
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not match/i);
    expect(mockWorkoutSessionFindOrCreate).not.toHaveBeenCalled();
    expect(mockDailyWorkoutFormCreate).not.toHaveBeenCalled();
    expect(mockUserDecrement).not.toHaveBeenCalled();
  });

  it('rejects completed active-plan assignments before writing workout data', async () => {
    const completedPlan = buildActivePlan();
    completedPlan.planData.weeks[3].days[1].completed = true;
    mockWorkoutPlanFindOne.mockResolvedValue(completedPlan);

    const res = await request(app).post('/api/workout-forms').send(payload);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not loggable/i);
    expect(mockWorkoutSessionFindOrCreate).not.toHaveBeenCalled();
    expect(mockDailyWorkoutFormCreate).not.toHaveBeenCalled();
    expect(mockUserDecrement).not.toHaveBeenCalled();
  });
});
