/**
 * Phase 1 Slice 1.1 — WorkoutSession transition + totalSets persistence
 * =====================================================================
 *
 * Locks the trainer-logging → client-dashboard data path correctness
 * fixes from the canonical surface receipt audit:
 *
 *   Bug 1: Writer must persist `totalSets` on the WorkoutSession row
 *          so the client-dashboard reader (which selects `totalSets`)
 *          surfaces the right number instead of the model default 0.
 *
 *   Bug 2: When a `WorkoutSession` row already exists for this
 *          userId+date (e.g. created by the V3a planner with
 *          status='planned'), the trainer-logging writer must
 *          transition it to 'completed' with completedAt + totalSets
 *          + duration + intensity + notes. Otherwise the
 *          client-dashboard reader's `WHERE status='completed'`
 *          filter silently drops these from history.
 *
 * Cases covered:
 *   1. CREATE path (no pre-existing session): totalSets passes
 *      through into the row from the start.
 *   2. UPDATE path (pre-existing 'planned' session): findOrCreate
 *      returns existing row, branch then runs `update()` with full
 *      completionFields — verified via the mock.
 *   3. UPDATE path with 'in_progress' status: transitions to
 *      'completed' (any non-completed status triggers the update).
 *   4. NO-OP path (already 'completed'): does NOT call update.
 *      Idempotency guard.
 *   5. createdAt field never overwritten — the update only touches
 *      completionFields keys.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// ─── Mocks (declared before imports of the route module) ────────────

const mockProtect = vi.fn((req, _res, next) => {
  if (req.headers['x-test-user-id']) {
    req.user = {
      id: parseInt(req.headers['x-test-user-id'], 10),
      role: req.headers['x-test-user-role'] || 'admin',
    };
  } else {
    req.user = { id: 99, role: 'admin' };
  }
  next();
});

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: mockProtect,
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
const mockUserDecrement = vi.fn().mockResolvedValue(undefined);

const mockDailyWorkoutFormFindOne = vi.fn();
const mockDailyWorkoutFormCreate = vi.fn();
const mockDailyWorkoutFormUpdate = vi.fn().mockResolvedValue(undefined);

const mockWorkoutSessionFindOrCreate = vi.fn();
const mockWorkoutPlanFindOne = vi.fn();
const mockWorkoutLogDestroy = vi.fn();
const mockWorkoutLogBulkCreate = vi.fn();

const mockClientTrainerAssignmentFindOne = vi.fn();
const mockTrainerPermissionsFindOne = vi.fn();
const mockSessionFindByPk = vi.fn();

vi.mock('../models/index.mjs', () => ({
  getUser: () => ({ findByPk: mockUserFindByPk, findOne: mockUserFindOne }),
  getDailyWorkoutForm: () => ({
    findOne: mockDailyWorkoutFormFindOne,
    create: mockDailyWorkoutFormCreate,
  }),
  getWorkoutSession: () => ({ findOrCreate: mockWorkoutSessionFindOrCreate }),
  getWorkoutLog: () => ({ destroy: mockWorkoutLogDestroy, bulkCreate: mockWorkoutLogBulkCreate }),
  getWorkoutPlan: () => ({ findOne: mockWorkoutPlanFindOne }),
  getSession: () => ({ findByPk: mockSessionFindByPk }),
  getClientTrainerAssignment: () => ({ findOne: mockClientTrainerAssignmentFindOne }),
  getTrainerPermissions: () => ({ findOne: mockTrainerPermissionsFindOne }),
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

vi.mock('../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/gamification/challengeWorkoutCompletionBridge.mjs', () => ({
  applyDailyWorkoutFormChallengeProgress: vi.fn().mockResolvedValue({ updated: [], xpAwarded: 0 }),
}));

// Import the route AFTER mocks are registered.
const dailyWorkoutFormRoutes = (await import('../routes/dailyWorkoutFormRoutes.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/workout-forms', dailyWorkoutFormRoutes);

// ─── Common fixture builders ────────────────────────────────────────

const VALID_PAYLOAD = {
  clientId: 11,
  date: '2026-05-03',
  exercises: [
    { exerciseName: 'Squat',  sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }] },
    { exerciseName: 'Bench',  sets: [{ weight: 80,  reps: 8 }, { weight: 80,  reps: 8 }, { weight: 80, reps: 6 }] },
  ],
  sessionNotes: 'Solid session',
};

// totalSets for VALID_PAYLOAD = 2 + 3 = 5 sets

function bootstrapHappyPath({
  existingSession = null,
  createdFlag = true,
  clientAvailableSessions = 10,
  clientSource = 'swanstudios',
} = {}) {
  // No existing form for the date (no 409).
  mockDailyWorkoutFormFindOne.mockResolvedValueOnce(null);
  // Client exists with sessions.
  mockUserFindByPk.mockResolvedValueOnce({
    id: 11,
    availableSessions: clientAvailableSessions,
    clientSource,
    decrement: mockUserDecrement,
  });
  // findOrCreate result.
  if (existingSession) {
    mockWorkoutSessionFindOrCreate.mockResolvedValueOnce([existingSession, createdFlag]);
  } else {
    const newRow = {
      id: 'new-session-uuid',
      userId: 11,
      date: '2026-05-03',
      status: 'completed',
      totalSets: 5,
      duration: 15,
      update: vi.fn().mockResolvedValue(undefined),
    };
    mockWorkoutSessionFindOrCreate.mockResolvedValueOnce([newRow, createdFlag]);
  }
  // DailyWorkoutForm.create returns a row with update().
  mockDailyWorkoutFormCreate.mockResolvedValueOnce({
    id: 'new-form-uuid',
    sessionDeducted: false,
    update: mockDailyWorkoutFormUpdate,
  });
}

function mockActiveHomeworkPlan() {
  mockWorkoutPlanFindOne.mockResolvedValueOnce({
    id: 'plan-6m',
    userId: 11,
    status: 'active',
    currentWeek: 4,
    currentDay: 2,
    durationWeeks: 26,
    planData: {
      days: [
        { dayLabel: 'Primer', assignmentType: 'rest', exercises: [] },
        {
          dayLabel: 'Coach Homework Lower Body',
          assignmentType: 'homework',
          exercises: [{ exerciseName: 'Goblet Squat' }],
        },
      ],
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserDecrement.mockResolvedValue(undefined);
  mockDailyWorkoutFormUpdate.mockResolvedValue(undefined);
  mockSessionFindByPk.mockReset();
  mockWorkoutPlanFindOne.mockReset();
  mockWorkoutLogDestroy.mockReset();
  mockWorkoutLogBulkCreate.mockReset();
  mockWorkoutLogDestroy.mockResolvedValue(undefined);
  mockWorkoutLogBulkCreate.mockResolvedValue([]);
});

// ─── Bug 1 — totalSets propagates into defaults ────────────────────

describe('Phase 1 Slice 1.1 — Bug 1: totalSets persisted on WorkoutSession (CREATE path)', () => {
  it('forwards totalSets into the findOrCreate defaults block on CREATE', async () => {
    bootstrapHappyPath({ existingSession: null, createdFlag: true });

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(mockWorkoutSessionFindOrCreate).toHaveBeenCalledTimes(1);
    const args = mockWorkoutSessionFindOrCreate.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 11, date: '2026-05-03' });
    // totalSets MUST be in defaults — was missing pre-Slice-1.1.
    expect(args.defaults.totalSets).toBe(5);
    expect(args.defaults.status).toBe('completed');
    expect(args.defaults.duration).toBe(15); // 5 sets * 3 = 15min
    expect(args.defaults.notes).toBe('Solid session');
  });

  it('totalSets reflects the actual exercise+set arithmetic, not a hardcoded value', async () => {
    bootstrapHappyPath({ existingSession: null, createdFlag: true });

    const wider = {
      ...VALID_PAYLOAD,
      exercises: Array.from({ length: 6 }, (_, i) => ({
        exerciseName: `Ex ${i}`,
        sets: [{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }, { weight: 50, reps: 10 }, { weight: 50, reps: 10 }],
      })),
    };
    await request(app).post('/api/workout-forms').send(wider);
    const args = mockWorkoutSessionFindOrCreate.mock.calls[0][0];
    expect(args.defaults.totalSets).toBe(24); // 6 exercises × 4 sets
  });
});

// ─── Bug 2 — Pre-existing session transitions to completed ──────────

describe('Phase 1 Slice 1.1 — Bug 2: pre-existing planned session transitions to completed', () => {
  it('updates an existing planned WorkoutSession to completed with all completionFields', async () => {
    const plannedRow = {
      id: 'planner-pre-created-uuid',
      userId: 11,
      date: '2026-05-03',
      status: 'planned',                  // ← from V3a planner
      totalSets: 0,                        // ← model default
      duration: null,
      completedAt: null,
      title: 'Phase 1 Stabilization Day 3',  // ← planner-generated, more descriptive
      update: vi.fn().mockResolvedValue(undefined),
    };
    bootstrapHappyPath({ existingSession: plannedRow, createdFlag: false /* found, not created */ });

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    // Bug 2 fix: update() MUST run with the completionFields when
    // the row was pre-existing AND not already 'completed'.
    expect(plannedRow.update).toHaveBeenCalledTimes(1);
    const updateArgs = plannedRow.update.mock.calls[0][0];
    expect(updateArgs.status).toBe('completed');
    expect(updateArgs.totalSets).toBe(5);
    expect(updateArgs.duration).toBe(15);
    expect(updateArgs.notes).toBe('Solid session');
    expect(updateArgs.completedAt).toBeInstanceOf(Date);
  });

  it('transitions an in_progress session to completed', async () => {
    const inProgressRow = {
      id: 'in-progress-uuid',
      status: 'in_progress',
      update: vi.fn().mockResolvedValue(undefined),
    };
    bootstrapHappyPath({ existingSession: inProgressRow, createdFlag: false });

    await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(inProgressRow.update).toHaveBeenCalledTimes(1);
    expect(inProgressRow.update.mock.calls[0][0].status).toBe('completed');
  });

  it('reconciles a "completed-but-stale" row when the matching DailyWorkoutForm is missing (Codex R1 MEDIUM fix)', async () => {
    // This is the edge case Codex Round 1 flagged: WorkoutSession
    // already has status='completed' but the matching
    // DailyWorkoutForm was deleted. The route's existingForm 409
    // guard passes (no form for this client+date), the new form gets
    // created — but if the WorkoutSession isn't reconciled, the
    // dashboard reads stale totalSets/duration/notes/completedAt.
    //
    // Stronger invariant: if !created, ALWAYS update completion
    // fields. Status-only guard was insufficient.
    const staleCompletedRow = {
      id: 'stale-completed-uuid',
      status: 'completed',
      totalSets: 0,             // ← stale
      duration: null,           // ← stale
      notes: '',                // ← stale
      completedAt: new Date('2025-01-01T00:00:00Z'), // ← stale
      update: vi.fn().mockResolvedValue(undefined),
    };
    bootstrapHappyPath({ existingSession: staleCompletedRow, createdFlag: false });

    await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    // Update MUST run with the fresh completionFields, even though
    // the row was already 'completed'.
    expect(staleCompletedRow.update).toHaveBeenCalledTimes(1);
    const updateArgs = staleCompletedRow.update.mock.calls[0][0];
    expect(updateArgs.totalSets).toBe(5);
    expect(updateArgs.duration).toBe(15);
    expect(updateArgs.notes).toBe('Solid session');
    // completedAt is refreshed to "now" — the new form is the
    // canonical log for this client+date.
    expect(updateArgs.completedAt).toBeInstanceOf(Date);
    expect(updateArgs.completedAt.getTime()).toBeGreaterThan(staleCompletedRow.completedAt.getTime());
  });

  it('CREATE path does not call update() — defaults block already set everything', async () => {
    const createdRow = {
      id: 'created-uuid',
      status: 'completed', // matches what defaults would set
      update: vi.fn().mockResolvedValue(undefined),
    };
    bootstrapHappyPath({ existingSession: createdRow, createdFlag: true /* CREATE */ });

    await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    // findOrCreate created the row from defaults — no need to update.
    expect(createdRow.update).not.toHaveBeenCalled();
  });
});

describe('Phase 1 Slice 1.1 — completionFields contract is consistent between CREATE and UPDATE paths', () => {
  it('CREATE defaults and UPDATE call use the same completionFields shape', async () => {
    // CREATE path
    const newRow = {
      id: 'create-uuid',
      status: 'completed',
      update: vi.fn().mockResolvedValue(undefined),
    };
    bootstrapHappyPath({ existingSession: newRow, createdFlag: true });
    await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);
    const createDefaults = mockWorkoutSessionFindOrCreate.mock.calls[0][0].defaults;

    vi.clearAllMocks();
    mockUserDecrement.mockResolvedValue(undefined);
    mockDailyWorkoutFormUpdate.mockResolvedValue(undefined);

    // UPDATE path — same input.
    const plannedRow = {
      id: 'plan-uuid',
      status: 'planned',
      update: vi.fn().mockResolvedValue(undefined),
    };
    bootstrapHappyPath({ existingSession: plannedRow, createdFlag: false });
    await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);
    const updateArgs = plannedRow.update.mock.calls[0][0];

    // The UPDATE call's keys must be a subset of CREATE defaults
    // (the create path adds a few row-only fields like id/userId/title).
    for (const key of Object.keys(updateArgs)) {
      expect(createDefaults).toHaveProperty(key);
      // Same VALUE for the deterministic fields. completedAt is a
      // Date instance — assert type rather than equality.
      if (key === 'completedAt') {
        expect(createDefaults[key]).toBeInstanceOf(Date);
        expect(updateArgs[key]).toBeInstanceOf(Date);
      } else {
        expect(updateArgs[key]).toEqual(createDefaults[key]);
      }
    }
  });
});

describe('Phase 1 Slice 1.4 — canonical form logs create detailed WorkoutLog rows', () => {
  it('mirrors accepted WorkoutLogger exercises into WorkoutLog rows and aggregate totals', async () => {
    bootstrapHappyPath({ existingSession: null, createdFlag: true });

    const res = await request(app).post('/api/workout-forms').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(mockWorkoutLogDestroy).toHaveBeenCalledWith({
      where: { sessionId: 'new-session-uuid' },
      transaction: expect.any(Object),
    });
    expect(mockWorkoutLogBulkCreate).toHaveBeenCalledTimes(1);
    expect(mockWorkoutLogBulkCreate.mock.calls[0][0]).toEqual([
      expect.objectContaining({ sessionId: 'new-session-uuid', exerciseName: 'Squat', setNumber: 1, reps: 5, weight: 100 }),
      expect.objectContaining({ sessionId: 'new-session-uuid', exerciseName: 'Squat', setNumber: 2, reps: 5, weight: 100 }),
      expect.objectContaining({ sessionId: 'new-session-uuid', exerciseName: 'Bench', setNumber: 1, reps: 8, weight: 80 }),
      expect.objectContaining({ sessionId: 'new-session-uuid', exerciseName: 'Bench', setNumber: 2, reps: 8, weight: 80 }),
      expect.objectContaining({ sessionId: 'new-session-uuid', exerciseName: 'Bench', setNumber: 3, reps: 6, weight: 80 }),
    ]);
    expect(mockWorkoutLogBulkCreate.mock.calls[0][1]).toMatchObject({
      transaction: expect.any(Object),
      validate: true,
    });

    const defaults = mockWorkoutSessionFindOrCreate.mock.calls[0][0].defaults;
    expect(defaults.totalReps).toBe(32);
    expect(defaults.totalWeight).toBe(2760);
  });

  it('normalizes WorkoutLog text fields to the real schema before bulk insert', async () => {
    bootstrapHappyPath({ existingSession: null, createdFlag: true });

    const res = await request(app).post('/api/workout-forms').send({
      ...VALID_PAYLOAD,
      exercises: [{
        exerciseName: 'A'.repeat(300),
        exerciseNote: { invalid: true },
        sets: [{
          reps: 12,
          weight: 30,
          tempo: '3-1-1-0 controlled eccentric tempo cue',
          notes: { invalid: true },
        }],
      }],
    });

    expect(res.status).toBe(201);
    expect(mockWorkoutLogBulkCreate.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        exerciseName: 'A'.repeat(255),
        tempo: '3-1-1-0 controlled eccentric tempo cue'.slice(0, 20),
        notes: null,
        exerciseNote: null,
      }),
    ]);
  });
});

describe('Phase 1 Slice 1.2 — linked schedule attendance gate', () => {
  it('refuses to convert a no-show scheduled session into a logged workout', async () => {
    mockDailyWorkoutFormFindOne.mockResolvedValueOnce(null);
    mockUserFindByPk.mockResolvedValueOnce({
      id: 11,
      clientSource: 'swanstudios',
      availableSessions: 10,
      decrement: mockUserDecrement,
    });
    mockSessionFindByPk.mockResolvedValueOnce({
      id: 777,
      userId: 11,
      trainerId: null,
      status: 'scheduled',
      attendanceStatus: 'no_show',
      sessionDeducted: false,
      update: vi.fn().mockResolvedValue(undefined),
    });
    mockWorkoutSessionFindOrCreate.mockResolvedValueOnce([
      { id: 'should-not-write', update: vi.fn().mockResolvedValue(undefined) },
      true,
    ]);
    mockDailyWorkoutFormCreate.mockResolvedValueOnce({
      id: 'should-not-create',
      update: mockDailyWorkoutFormUpdate,
    });

    const res = await request(app)
      .post('/api/workout-forms')
      .send({ ...VALID_PAYLOAD, scheduledSessionId: 777 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no-show/i);
    expect(mockWorkoutSessionFindOrCreate).not.toHaveBeenCalled();
    expect(mockDailyWorkoutFormCreate).not.toHaveBeenCalled();
    expect(mockUserDecrement).not.toHaveBeenCalled();
  });
});

describe('Phase 1 Slice 1.3 - planned assignment billing guard', () => {
  it('rejects non-billable planned assignment metadata when the log date is not today', async () => {
    bootstrapHappyPath({ clientAvailableSessions: 0 });
    mockActiveHomeworkPlan();

    const currentIso = new Date().toISOString().split('T')[0];
    const staleDate = currentIso === '2026-05-03' ? '2026-05-04' : '2026-05-03';
    const res = await request(app)
      .post('/api/workout-forms')
      .send({
        ...VALID_PAYLOAD,
        date: staleDate,
        plannedAssignment: {
          assignmentKey: 'plan-6m:w4:d2:homework',
          planId: 'plan-6m',
          assignmentType: 'homework',
          source: 'workout_plan',
          weekNumber: 4,
          dayNumber: 2,
          isBillable: false,
          shouldDeductSession: false,
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/date does not match/i);
    expect(mockWorkoutSessionFindOrCreate).not.toHaveBeenCalled();
    expect(mockDailyWorkoutFormCreate).not.toHaveBeenCalled();
    expect(mockUserDecrement).not.toHaveBeenCalled();
  });
});
