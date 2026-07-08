/**
 * historyBackfillPairingGuard.test.mjs — coach↔client pairing locks (AD-2)
 * ===========================================================================
 * The history-backfill tool lets a coach fill in a client's past workouts.
 * These locks make sure it only ever works within the coach's OWN pairings,
 * exactly like the sibling log/edit routes (via the shared ensureClientAccess
 * helper): (1) preview and (2) commit check the pairing BEFORE the service
 * runs; (3) undo checks the pairing of the run's OWN client (run ids are
 * sequential, so an unpaired coach guessing an id must get a polite 403
 * before anything is deleted). Paired coaches and admins keep working.
 * Real router + real service; only infrastructure is mocked.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ensureClientAccess: vi.fn(),
  getExerciseHistoryFromLogs: vi.fn(),
  submitAiWorkoutLogAsDailyForm: vi.fn(),
  formFindAll: vi.fn(),
  sessionFindAll: vi.fn(),
  prDestroy: vi.fn(),
  runFindByPk: vi.fn(),
  runCreate: vi.fn(),
  runUpdate: vi.fn(),
  dbQuery: vi.fn(),
  dbTransaction: vi.fn(),
}));

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.headers['x-test-user-id'] || 9),
      role: req.headers['x-test-user-role'] || 'trainer',
    };
    next();
  },
  authorize: (roles) => (req, res, next) => (
    roles.includes(req.user.role)
      ? next()
      : res.status(403).json({ success: false, message: 'Forbidden' })
  ),
}));

vi.mock('../../utils/clientAccess.mjs', () => ({
  ensureClientAccess: (...args) => mocks.ensureClientAccess(...args),
}));

vi.mock('../../database.mjs', () => ({
  default: {
    query: (...args) => mocks.dbQuery(...args),
    transaction: (...args) => mocks.dbTransaction(...args),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getDailyWorkoutForm: () => ({ findAll: mocks.formFindAll }),
  getWorkoutSession: () => ({ findAll: mocks.sessionFindAll }),
  getPersonalRecord: () => ({ destroy: mocks.prDestroy }),
  getHistoryBackfillRun: () => ({ findByPk: mocks.runFindByPk, create: mocks.runCreate }),
}));

vi.mock('../../services/analyticsExerciseHistoryService.mjs', () => ({
  getExerciseHistoryFromLogs: (...args) => mocks.getExerciseHistoryFromLogs(...args),
}));

vi.mock('../../services/workout/workoutLogService.mjs', () => ({
  parseWorkoutLogDate: (value) => value,
  WorkoutLogError: class WorkoutLogError extends Error {},
}));

vi.mock('../../services/workout/aiWorkoutDailyFormService.mjs', () => ({
  submitAiWorkoutLogAsDailyForm: (...args) => mocks.submitAiWorkoutLogAsDailyForm(...args),
  AiWorkoutDailyFormError: class AiWorkoutDailyFormError extends Error {},
}));

const { default: adminWorkoutLoggerRoutes } = await import('../../routes/adminWorkoutLoggerRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin', adminWorkoutLoggerRoutes);

const PAIRED = { allowed: true, status: 200, clientId: 55 };
const UNPAIRED = { allowed: false, status: 403, message: 'Not assigned to this client' };

const exercisePool = {
  exercises: [
    { exerciseName: 'Barbell Squat', timesPerformed: 20, maxWeight: 225, maxReps: 8 },
    { exerciseName: 'Bench Press', timesPerformed: 15, maxWeight: 185, maxReps: 8 },
    { exerciseName: 'Deadlift', timesPerformed: 10, maxWeight: 275, maxReps: 5 },
    { exerciseName: 'Lat Pulldown', timesPerformed: 8, maxWeight: 120, maxReps: 12 },
  ],
};

const commitBody = {
  days: [{
    date: '2026-04-06',
    exercises: [{
      exerciseName: 'Barbell Squat',
      sets: [{ setNumber: 1, weight: 185, reps: 8, restTime: 90 }],
    }],
  }],
  attestation: 'This reflects training that actually occurred.',
};

const makeRun = () => ({
  id: 3,
  userId: 99,
  undoneAt: null,
  created: [
    { date: '2026-04-06', sessionId: 11, formId: 21 },
    { date: '2026-04-08', sessionId: 12, formId: 22 },
  ],
  update: vi.fn().mockResolvedValue(undefined),
});

describe('history backfill coach↔client pairing guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getExerciseHistoryFromLogs.mockResolvedValue(exercisePool);
    mocks.formFindAll.mockResolvedValue([]);
    mocks.sessionFindAll.mockResolvedValue([]);
    mocks.prDestroy.mockResolvedValue(0);
    mocks.submitAiWorkoutLogAsDailyForm.mockResolvedValue({ formId: 21, sessionId: 11 });
    mocks.runCreate.mockResolvedValue({ id: 7, update: mocks.runUpdate });
    mocks.runUpdate.mockResolvedValue(undefined);
    mocks.dbQuery.mockResolvedValue([]);
    mocks.dbTransaction.mockImplementation(async (cb) => cb('txn'));
  });

  it('preview: an unpaired coach gets a 403 before the client history is even read', async () => {
    mocks.ensureClientAccess.mockResolvedValue(UNPAIRED);
    const res = await request(app)
      .post('/api/admin/clients/55/workouts/backfill/preview')
      .send({ startDate: '2026-04-01', endDate: '2026-04-28' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, message: UNPAIRED.message });
    expect(mocks.ensureClientAccess.mock.calls[0][1]).toBe('55');
    expect(mocks.getExerciseHistoryFromLogs).not.toHaveBeenCalled();
  });

  it('commit: an unpaired coach gets a 403 and nothing is written', async () => {
    mocks.ensureClientAccess.mockResolvedValue(UNPAIRED);
    const res = await request(app)
      .post('/api/admin/clients/55/workouts/backfill/commit')
      .send(commitBody);

    expect(res.status).toBe(403);
    expect(mocks.submitAiWorkoutLogAsDailyForm).not.toHaveBeenCalled();
    expect(mocks.runCreate).not.toHaveBeenCalled();
  });

  it('undo: a coach not paired with the run\'s client gets a 403 before any delete', async () => {
    const run = makeRun();
    mocks.runFindByPk.mockResolvedValue(run);
    mocks.ensureClientAccess.mockResolvedValue(UNPAIRED);

    const res = await request(app).post('/api/admin/backfill-runs/3/undo').send({});

    expect(res.status).toBe(403);
    // The pairing is checked against the run's OWN client id, not caller input.
    expect(mocks.ensureClientAccess.mock.calls[0][1]).toBe(99);
    expect(mocks.dbTransaction).not.toHaveBeenCalled();
    expect(mocks.dbQuery).not.toHaveBeenCalled();
    expect(mocks.prDestroy).not.toHaveBeenCalled();
    expect(run.update).not.toHaveBeenCalled();
  });

  it('commit: dates that already hold real training are skipped, never rewritten', async () => {
    mocks.ensureClientAccess.mockResolvedValue(PAIRED);
    // A form-less real session exists on the commit date (older-lane rows).
    mocks.sessionFindAll.mockResolvedValue([{ date: new Date('2026-04-06T00:00:00.000Z') }]);

    const res = await request(app)
      .post('/api/admin/clients/55/workouts/backfill/commit')
      .send(commitBody);

    expect(res.status).toBe(201);
    expect(res.body.created).toEqual([]);
    expect(res.body.skipped).toMatchObject([{ date: '2026-04-06' }]);
    expect(mocks.submitAiWorkoutLogAsDailyForm).not.toHaveBeenCalled();
  });

  it('preview: a paired coach still gets a working preview', async () => {
    mocks.ensureClientAccess.mockResolvedValue(PAIRED);
    const res = await request(app)
      .post('/api/admin/clients/55/workouts/backfill/preview')
      .send({ startDate: '2026-04-01', endDate: '2026-04-28', sessionsPerWeek: 3 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.days.length).toBeGreaterThan(0);
  });

  it('commit: a paired coach still commits (201 with the run id)', async () => {
    mocks.ensureClientAccess.mockResolvedValue(PAIRED);
    const res = await request(app)
      .post('/api/admin/clients/55/workouts/backfill/commit')
      .send(commitBody);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, runId: 7 });
    expect(mocks.submitAiWorkoutLogAsDailyForm).toHaveBeenCalledTimes(1);
  });

  it('undo: a paired coach (or admin) still undoes the run cleanly', async () => {
    const run = makeRun();
    mocks.runFindByPk.mockResolvedValue(run);
    mocks.ensureClientAccess.mockResolvedValue({ ...PAIRED, clientId: 99 });

    const res = await request(app).post('/api/admin/backfill-runs/3/undo').send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, removedSessions: 2, removedForms: 2 });
    expect(run.update).toHaveBeenCalledTimes(1);
    // PR baselines minted by the deleted fake sessions go with them.
    expect(mocks.prDestroy).toHaveBeenCalledTimes(1);
    expect(mocks.prDestroy.mock.calls[0][0].where.userId).toBe(99);
  });
});
