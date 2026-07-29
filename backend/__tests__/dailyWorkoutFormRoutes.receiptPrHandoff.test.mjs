/**
 * Golden-master gap-fill (Workout-OS C3, blueprint §13 HR-13).
 * The scheduleBillingPolicy/plannedAssignment suites lock billing + cursor at
 * route level but stub receipt/PR/XP/handoff without asserting them. This
 * suite closes those exact gaps on POST /api/workout-forms:
 *   1. completion-receipt persistence actually fires for a plan-advancing save
 *   2. prEvents from PR detection reach the 201 body untouched
 *   3. the post-save handoff rides the 201 body, and degrades to null fail-closed
 *   4. awardWorkoutXP is invoked post-commit for the saved form
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
  { id: 'receipt-gap-fill', ...defaults },
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
  getSession: () => ({ findByPk: mockSessionFindByPk }),
  getSessionType: () => ({ findByPk: mockSessionTypeFindByPk }),
  getClientTrainerAssignment: () => ({ findOne: vi.fn() }),
  getTrainerPermissions: () => ({ findOne: vi.fn() }),
  getBodyMeasurement: () => ({ findOne: vi.fn() }),
  getAllModels: vi.fn(() => ({})),
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

const XP_RESULT_FIXTURE = {
  pointsAwarded: 50,
  newBalance: 1200,
  streakDays: 7,
  totalWorkouts: 12,
  awardedMilestones: [],
};
const mockAwardWorkoutXP = vi.fn().mockResolvedValue(XP_RESULT_FIXTURE);
vi.mock('../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: (...args) => mockAwardWorkoutXP(...args),
}));
const mockFireWorkoutBadgeChecks = vi.fn().mockResolvedValue([]);
vi.mock('../services/badgeGamificationBridge.mjs', () => ({
  fireWorkoutBadgeChecks: (...args) => mockFireWorkoutBadgeChecks(...args),
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

const PR_EVENTS_FIXTURE = [
  { exerciseName: 'Goblet Squat', kind: 'weight', value: 60, previousBest: 55 },
];
const mockDetectPrs = vi.fn().mockResolvedValue({ prEvents: PR_EVENTS_FIXTURE });
vi.mock('../services/workout/workoutPrDetectionService.mjs', () => ({
  detectAndRecordPersonalRecords: (...args) => mockDetectPrs(...args),
}));

const HANDOFF_FIXTURE = {
  proof: { totalSets: 3, totalVolume: 180 },
  streak: { current: 4 },
  nextBestAction: { kind: 'rest' },
};
const mockSafeAssemble = vi.fn().mockResolvedValue(HANDOFF_FIXTURE);
vi.mock('../services/postSaveHandoffAssembler.mjs', () => ({
  safeAssemble: (...args) => mockSafeAssemble(...args),
}));

const dailyWorkoutFormRoutes = (await import('../routes/dailyWorkoutFormRoutes.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/workout-forms', dailyWorkoutFormRoutes);

const PLAN_ID = '6ea7806d-36c8-4307-bd5d-6b04b68be849';

const VALID_PAYLOAD = {
  clientId: 11,
  date: '2026-05-03',
  scheduledSessionId: 777,
  exercises: [
    {
      exerciseName: 'Goblet Squat',
      sets: [{ weight: 60, reps: 10 }],
    },
  ],
  sessionNotes: 'Gap-fill contract log',
};

function primeSave({ availableSessions = 8 } = {}) {
  mockDailyWorkoutFormFindOne.mockResolvedValueOnce(null);
  mockUserFindByPk.mockResolvedValueOnce({
    id: 11,
    availableSessions,
    clientSource: 'swanstudios',
    decrement: mockUserDecrement,
  });
  mockSessionFindByPk.mockResolvedValueOnce({
    id: 777,
    userId: 11,
    trainerId: 99,
    sessionDate: '2026-05-03T15:00:00.000Z',
    status: 'scheduled',
    attendanceStatus: null,
    sessionDeducted: false,
    update: vi.fn().mockResolvedValue(undefined),
  });
  mockWorkoutSessionFindOrCreate.mockResolvedValueOnce([
    { id: 'workout-session-1', userId: 11, update: vi.fn().mockResolvedValue(undefined) },
    true,
  ]);
  mockDailyWorkoutFormCreate.mockResolvedValueOnce({
    id: 'daily-form-1',
    submittedAt: '2026-05-03T16:00:00.000Z',
    update: mockDailyWorkoutFormUpdate,
  });
}

function primeActivePlan() {
  const plan = {
    id: PLAN_ID,
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
  mockWorkoutPlanFindOne.mockResolvedValue(plan);
  mockWorkoutPlanFindByPk.mockResolvedValue(plan);
  return plan;
}

/** The setImmediate post-commit block must run before we assert on it. */
const flushPostCommit = () => new Promise((resolve) => setImmediate(() => setImmediate(resolve)));

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
  mockDetectPrs.mockResolvedValue({ prEvents: PR_EVENTS_FIXTURE });
  mockSafeAssemble.mockResolvedValue(HANDOFF_FIXTURE);
});

describe('POST /api/workout-forms — receipt, PR, handoff, XP route contracts', () => {
  it('persists a completion receipt when the save advances an active plan', async () => {
    primeSave();
    primeActivePlan();

    const res = await request(app).post('/api/workout-forms').send({
      ...VALID_PAYLOAD,
      plannedAssignment: {
        assignmentKey: `${PLAN_ID}:w4:d2:trainer_session`,
        planId: PLAN_ID,
        assignmentType: 'trainer_session',
        source: 'workout_plan',
        isBillable: true,
        shouldDeductSession: true,
        weekNumber: 4,
        dayNumber: 2,
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.form.planProgress?.advanced).toBe(true);
    expect(mockCompletionReceiptFindOrCreate).toHaveBeenCalledTimes(1);
    const receiptArgs = mockCompletionReceiptFindOrCreate.mock.calls[0][0];
    expect(receiptArgs.where.idempotencyKey).toBeTruthy();
    expect(receiptArgs.defaults).toMatchObject({
      dailyWorkoutFormId: 'daily-form-1',
      workoutSessionId: 'workout-session-1',
      idempotencyKey: receiptArgs.where.idempotencyKey,
    });
  });

  it('carries prEvents from PR detection into the 201 body untouched', async () => {
    primeSave();

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(mockDetectPrs).toHaveBeenCalledTimes(1);
    expect(res.body.form.prEvents).toEqual(PR_EVENTS_FIXTURE);
  });

  it('serves the post-save handoff on the 201 body when the assembler returns one', async () => {
    primeSave();

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(mockSafeAssemble).toHaveBeenCalledTimes(1);
    expect(res.body.handoff).toEqual(HANDOFF_FIXTURE);
  });

  it('degrades handoff to null fail-closed without failing the save', async () => {
    primeSave();
    mockSafeAssemble.mockRejectedValueOnce(new Error('assembler exploded'));

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.handoff).toBeNull();
  });

  it('invokes awardWorkoutXP post-commit for the saved form', async () => {
    primeSave();

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);
    await flushPostCommit();

    expect(res.status).toBe(201);
    expect(mockAwardWorkoutXP).toHaveBeenCalledTimes(1);
  });

  it('fires the badge sweep post-commit with the XP result', async () => {
    primeSave();

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);
    await flushPostCommit();

    expect(res.status).toBe(201);
    expect(mockFireWorkoutBadgeChecks).toHaveBeenCalledTimes(1);
    expect(mockFireWorkoutBadgeChecks).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 11,
        xpResult: XP_RESULT_FIXTURE,
        exerciseCount: 1,
      }),
    );
  });
});
