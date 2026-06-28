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

function makeActivePlan(overrides = {}) {
  return {
    id: 'plan-6m',
    userId: 42,
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
    update: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function loadService({ client = makeClient(), existingForm = null, activePlan = makeActivePlan() } = {}) {
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
    WorkoutPlan: {
      findOne: vi.fn(async () => activePlan),
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
    activePlan,
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

  it('logs verified AI homework assignments as completed plan progress without deduction', async () => {
    const client = makeClient({ availableSessions: 0 });
    const {
      submitAiWorkoutLogAsDailyForm,
      activePlan,
      models,
      sequelize,
      tx,
    } = await loadService({ client });

    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      date: new Date().toISOString().slice(0, 10),
      exercises: [{ name: 'Goblet Squat', sets: [{ reps: 10, weight: 40 }] }],
      plannedAssignment: {
        assignmentKey: 'plan-6m:w4:d2:homework',
        planId: 'plan-6m',
        assignmentType: 'homework',
        source: 'workout_plan',
        isBillable: false,
        shouldDeductSession: false,
        weekNumber: 4,
        dayNumber: 2,
      },
      sequelize,
    });

    expect(client.decrement).not.toHaveBeenCalled();
    expect(models.WorkoutPlan.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'plan-6m', userId: 42, status: 'active' },
      lock: 'UPDATE',
      transaction: tx,
    }));
    const formCreate = models.DailyWorkoutForm.create.mock.calls[0][0];
    expect(formCreate.formData.plannedAssignment).toMatchObject({
      assignmentKey: 'plan-6m:w4:d2:homework',
      planId: 'plan-6m',
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
    expect(activePlan.update).toHaveBeenCalledWith(expect.objectContaining({
      currentWeek: 5,
      currentDay: 1,
      status: 'active',
    }), { transaction: tx });
    expect(result.form.plannedAssignment).toMatchObject({
      assignmentKey: 'plan-6m:w4:d2:homework',
      shouldDeductSession: false,
    });
    expect(result.form.planProgress).toMatchObject({
      advanced: true,
      previous: { week: 4, day: 2 },
      next: { week: 5, day: 1 },
    });
    expect(result.billing.status).toBe('not_deducted');
  });

  it('logs historical imports for paid clients without deducting session credits', async () => {
    const client = makeClient({ clientSource: 'swanstudios', availableSessions: 0 });
    const { submitAiWorkoutLogAsDailyForm, dailyFormRow, models, sequelize } = await loadService({ client });

    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      date: '2026-05-05',
      source: 'historical_import',
      exercises: [{ name: 'Squat', sets: [{ setNumber: 1, reps: 10, weight: 40 }] }],
      sequelize,
    });

    expect(client.decrement).not.toHaveBeenCalled();
    expect(dailyFormRow.update).not.toHaveBeenCalled();
    expect(models.DailyWorkoutForm.create.mock.calls[0][0].formData).toEqual(expect.objectContaining({
      source: 'historical_import',
      historicalImport: true,
    }));
    expect(result).toEqual(expect.objectContaining({
      source: 'historical_import',
      historicalImport: true,
    }));
    expect(result.billing).toEqual(expect.objectContaining({
      status: 'not_deducted',
      shouldDeduct: false,
      sessionDeducted: false,
      creditsDeducted: 0,
      creditsRequired: 0,
      remainingSessions: 0,
    }));
    expect(result.form).toEqual(expect.objectContaining({
      source: 'historical_import',
      historicalImport: true,
      sessionDeducted: false,
    }));
  });

  it('does not advance active plan progress for historical planned-assignment sources', async () => {
    const { submitAiWorkoutLogAsDailyForm, activePlan, sequelize } = await loadService();
    const verifiedAssignmentDate = new Date().toISOString().slice(0, 10);

    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      date: verifiedAssignmentDate,
      source: 'move_fitness_historical_import',
      exercises: [{ name: 'Goblet Squat', sets: [{ reps: 10, weight: 40 }] }],
      plannedAssignment: {
        assignmentKey: 'plan-6m:w4:d2:homework',
        planId: 'plan-6m',
        assignmentType: 'homework',
        source: 'workout_plan',
        isBillable: false,
        shouldDeductSession: false,
        weekNumber: 4,
        dayNumber: 2,
      },
      sequelize,
    });

    expect(activePlan.update).not.toHaveBeenCalled();
    expect(result.form.plannedAssignment).toMatchObject({
      assignmentKey: 'plan-6m:w4:d2:homework',
      shouldDeductSession: false,
    });
    expect(result.form.planProgress).toBeUndefined();
    expect(result.billing).toEqual(expect.objectContaining({
      status: 'not_deducted',
      creditsRequired: 0,
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
