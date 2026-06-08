/**
 * aiWorkoutDailyFormService tests
 * ===============================
 * Locks the Swan Coach workout command write path to diary/billing truth.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

let models;

function makeTransaction() {
  return {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn(async () => undefined),
    rollback: vi.fn(async () => undefined),
  };
}

function makeClient(overrides = {}) {
  return {
    id: 42,
    clientSource: 'swanstudios',
    availableSessions: 2,
    decrement: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function loadService({ client = makeClient(), existingForm = null } = {}) {
  vi.resetModules();
  const tx = makeTransaction();
  const dailyFormRow = {
    id: 'form-1',
    submittedAt: '2026-05-05T12:00:00.000Z',
    update: vi.fn(async () => undefined),
  };
  const workoutSession = {
    id: 'session-1',
    title: 'Voice Log',
    update: vi.fn(async () => undefined),
  };
  models = {
    User: {
      findByPk: vi.fn(async () => client),
    },
    DailyWorkoutForm: {
      findOne: vi.fn(async () => existingForm),
      create: vi.fn(async (attrs) => ({ ...dailyFormRow, ...attrs })),
    },
    WorkoutSession: {
      findOrCreate: vi.fn(async () => [workoutSession, true]),
    },
    WorkoutLog: {
      destroy: vi.fn(async () => undefined),
      bulkCreate: vi.fn(async () => []),
    },
  };
  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => models,
  }));
  const service = await import('../../services/workout/aiWorkoutDailyFormService.mjs');
  return {
    ...service,
    client,
    dailyFormRow,
    models,
    sequelize: { transaction: vi.fn(async () => tx) },
    tx,
    workoutSession,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('submitAiWorkoutLogAsDailyForm', () => {
  it('creates diary truth and deducts a paid SwanStudios session', async () => {
    const { submitAiWorkoutLogAsDailyForm, client, dailyFormRow, models, sequelize, tx } = await loadService();

    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      date: '2026-05-05',
      title: 'Voice Log',
      duration: 45,
      intensity: 8,
      notes: 'Strong session',
      exercises: [{
        name: 'Pull-up',
        exerciseNote: 'Grip faded on last set',
        sets: 2,
        reps: 5,
        weight: 0,
        restSeconds: 90,
      }],
      sequelize,
    });

    expect(models.User.findByPk).toHaveBeenCalledWith(42, expect.objectContaining({
      lock: 'UPDATE',
      transaction: tx,
    }));
    expect(models.DailyWorkoutForm.create).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'session-1',
      clientId: 42,
      trainerId: 7,
      date: '2026-05-05',
      sessionDeducted: false,
      mcpProcessed: false,
    }), { transaction: tx });
    expect(models.WorkoutLog.bulkCreate.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        sessionId: 'session-1',
        exerciseName: 'Pull-up',
        setNumber: 1,
        reps: 5,
        rest: 90,
        exerciseNote: 'Grip faded on last set',
      }),
      expect.objectContaining({
        sessionId: 'session-1',
        exerciseName: 'Pull-up',
        setNumber: 2,
        reps: 5,
        rest: 90,
        exerciseNote: 'Grip faded on last set',
      }),
    ]);
    expect(client.decrement).toHaveBeenCalledWith('availableSessions', { by: 1, transaction: tx });
    expect(dailyFormRow.update).toHaveBeenCalledWith({ sessionDeducted: true }, { transaction: tx });
    expect(result.billing).toEqual({
      status: 'deducted',
      shouldDeduct: true,
      sessionDeducted: true,
      creditsDeducted: 1,
      creditsRequired: 1,
      remainingSessions: 1,
    });
    expect(result.form).toEqual(expect.objectContaining({
      id: 'form-1',
      clientId: 42,
      trainerId: 7,
      date: '2026-05-05',
      sessionDeducted: true,
    }));
    expect(tx.commit).toHaveBeenCalledTimes(1);
    expect(tx.rollback).not.toHaveBeenCalled();
  });

  it('logs Move Fitness clients without deducting sessions', async () => {
    const client = makeClient({ clientSource: 'move_fitness', availableSessions: 0 });
    const { submitAiWorkoutLogAsDailyForm, dailyFormRow, sequelize } = await loadService({ client });

    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      date: '2026-05-05',
      exercises: [{ name: 'Squat', sets: [{ setNumber: 1, reps: 10, weight: 40 }] }],
      sequelize,
    });

    expect(client.decrement).not.toHaveBeenCalled();
    expect(dailyFormRow.update).not.toHaveBeenCalled();
    expect(result.billing).toEqual(expect.objectContaining({
      status: 'not_deducted',
      shouldDeduct: false,
      sessionDeducted: false,
      creditsDeducted: 0,
      remainingSessions: 0,
    }));
  });

  it('rejects duplicate same-day diary forms before rewriting session logs', async () => {
    const existingForm = { id: 'existing-form' };
    const { AiWorkoutDailyFormError, submitAiWorkoutLogAsDailyForm, models, sequelize, tx } = await loadService({ existingForm });

    await expect(submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      date: '2026-05-05',
      exercises: [{ name: 'Squat', sets: 1, reps: 10 }],
      sequelize,
    })).rejects.toMatchObject({
      name: 'AiWorkoutDailyFormError',
      code: 'DUPLICATE_DATE',
    });

    expect(AiWorkoutDailyFormError).toBeTypeOf('function');
    expect(models.WorkoutSession.findOrCreate).not.toHaveBeenCalled();
    expect(models.WorkoutLog.destroy).not.toHaveBeenCalled();
    expect(tx.rollback).toHaveBeenCalledTimes(1);
    expect(tx.commit).not.toHaveBeenCalled();
  });
});
