/**
 * aiWorkoutDailyFormScheduledSession tests
 * =======================================
 * Locks Swan Coach workout-log writes to the scheduled-session contract used by
 * the manual DailyWorkoutForm route: schedule ownership, attendance, credits,
 * WorkoutSession linkage, and plan progress.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashWorkoutPlanContent } from '../../services/workoutPlanRevisionService.mjs';

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
    availableSessions: 3,
    decrement: vi.fn(async () => undefined),
    ...overrides,
  };
}

function makeScheduledSession(overrides = {}) {
  return {
    id: 777,
    userId: 42,
    trainerId: 7,
    sessionTypeId: 22,
    sessionDate: '2026-05-06T15:00:00.000Z',
    status: 'scheduled',
    attendanceStatus: null,
    sessionDeducted: false,
    deductionDate: null,
    checkInTime: null,
    markedPresentBy: null,
    attendanceRecordedAt: null,
    update: vi.fn(async () => undefined),
    ...overrides,
  };
}

function makeActivePlan(overrides = {}) {
  const plan = {
    id: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
    userId: 42,
    title: 'Six Month Foundation',
    status: 'active',
    currentWeek: 1,
    currentDay: 1,
    durationWeeks: 26,
    metadata: { planHorizon: 'six_month' },
    planData: {
      weeks: [{
        days: [
          {
            dayLabel: 'Coach-Led Strength Day',
            assignmentType: 'trainer_session',
            shouldDeductSession: true,
            exercises: [{ exerciseName: 'Trap Bar Deadlift' }],
          },
          {
            dayLabel: 'Next Recovery Homework',
            assignmentType: 'homework',
            exercises: [{ exerciseName: 'Hip Airplane' }],
          },
        ],
      }],
    },
    update: vi.fn(async () => undefined),
    ...overrides,
  };
  plan.contentRevision = overrides.contentRevision ?? 4;
  plan.contentHash = overrides.contentHash ?? hashWorkoutPlanContent(plan.planData);
  return plan;
}

async function loadService({
  client = makeClient(),
  scheduledSession = makeScheduledSession(),
  activePlan = makeActivePlan(),
  sessionType = { id: 22, creditsRequired: 2 },
} = {}) {
  vi.resetModules();
  const tx = makeTransaction();
  const dailyFormRow = {
    id: 'form-1',
    submittedAt: '2026-05-06T15:50:00.000Z',
    update: vi.fn(async () => undefined),
  };
  const workoutSession = {
    id: 'workout-session-1',
    title: 'AI Scheduled Log',
    update: vi.fn(async () => undefined),
  };
  models = {
    User: { findByPk: vi.fn(async () => client) },
    Session: { findByPk: vi.fn(async () => scheduledSession) },
    SessionType: { findByPk: vi.fn(async () => sessionType) },
    DailyWorkoutForm: {
      findOne: vi.fn(async () => null),
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
      findByPk: vi.fn(async () => activePlan),
    },
    WorkoutPlanCompletionReceipt: {
      findOrCreate: vi.fn(async ({ defaults }) => [{ id: 'receipt-ai-scheduled', ...defaults }, true]),
    },
  };
  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => models,
  }));
  // Isolate the XP step (same as aiWorkoutDailyFormService.test.mjs). Without this
  // the REAL runWorkoutXpAwardStep -> awardWorkoutXP runs and calls User.findByPk on
  // an unconnected Sequelize, which rejects AFTER the test completes as an unhandled
  // rejection ("Cannot read properties of undefined (reading 'query')"). These tests
  // assert scheduled-session/billing behavior, not XP, so stubbing the step keeps the
  // unit isolated and stops the floating promise Vitest flags as a false-positive risk.
  vi.doMock('../../services/workout/workoutXpAwardStep.mjs', () => ({
    runWorkoutXpAwardStep: vi.fn(async ({ suppress }) => (suppress
      ? null
      : { pointsAwarded: 50, newBalance: 150, streakDays: 3, milestones: [] })),
  }));
  const service = await import('../../services/workout/aiWorkoutDailyFormService.mjs');
  return {
    ...service,
    activePlan,
    client,
    dailyFormRow,
    models,
    scheduledSession,
    sequelize: { transaction: vi.fn(async () => tx) },
    tx,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('submitAiWorkoutLogAsDailyForm scheduled-session truth', () => {
  it('logs AI-approved scheduled trainer sessions through attendance, credits, and plan progress', async () => {
    const {
      activePlan,
      client,
      dailyFormRow,
      models,
      scheduledSession,
      sequelize,
      tx,
      submitAiWorkoutLogAsDailyForm,
    } = await loadService();

    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      scheduledSessionId: 777,
      date: '2026-05-01',
      title: 'AI Scheduled Log',
      duration: 45,
      intensity: 8,
      notes: 'Dictated from the schedule',
      plannedAssignment: {
        assignmentKey: '6ea7806d-36c8-4307-bd5d-6b04b68be849:w1:d1:trainer_session',
        planId: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
        assignmentType: 'trainer_session',
        source: 'workout_plan',
        isBillable: true,
        shouldDeductSession: true,
        weekNumber: 1,
        dayNumber: 1,
      },
      exercises: [{ name: 'Trap Bar Deadlift', sets: [{ reps: 5, weight: 135 }] }],
      sequelize,
    });

    expect(models.Session.findByPk).toHaveBeenCalledWith(777, expect.objectContaining({
      lock: 'UPDATE',
      transaction: tx,
    }));
    expect(models.SessionType.findByPk).toHaveBeenCalledWith(22, expect.objectContaining({
      attributes: ['id', 'creditsRequired'],
      transaction: tx,
    }));
    expect(models.DailyWorkoutForm.findOne).toHaveBeenCalledWith({
      where: { clientId: 42, date: '2026-05-06' },
      transaction: tx,
    });
    expect(models.WorkoutSession.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, date: '2026-05-06' },
      defaults: expect.objectContaining({
        sessionId: 777,
        sessionType: 'trainer-led',
        trainerId: 7,
      }),
      transaction: tx,
    }));
    expect(client.decrement).toHaveBeenCalledWith('availableSessions', { by: 2, transaction: tx });
    expect(dailyFormRow.update).toHaveBeenCalledWith({ sessionDeducted: true }, { transaction: tx });
    expect(scheduledSession.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      attendanceStatus: 'present',
      checkInTime: expect.any(Date),
      markedPresentBy: 7,
      attendanceRecordedAt: expect.any(Date),
      noShowReason: null,
      sessionDeducted: true,
      creditsDeducted: 2,
      deductionDate: expect.any(Date),
    }), { transaction: tx });
    expect(activePlan.update).toHaveBeenCalledWith(expect.objectContaining({
      currentWeek: 1,
      currentDay: 2,
      status: 'active',
    }), { transaction: tx });
    expect(result.date).toBe('2026-05-06');
    expect(result.billing).toEqual(expect.objectContaining({
      status: 'deducted',
      creditsDeducted: 2,
      creditsRequired: 2,
      remainingSessions: 1,
    }));
    expect(result.form).toEqual(expect.objectContaining({
      date: '2026-05-06',
      scheduledSessionId: 777,
      sessionDeducted: true,
      plannedAssignment: expect.objectContaining({
        assignmentType: 'trainer_session',
        shouldDeductSession: true,
      }),
      planProgress: expect.objectContaining({ advanced: true }),
    }));
  });

  it('keeps previously deducted AI scheduled sessions from double-charging while preserving the required-credit receipt', async () => {
    const existingDeductionDate = new Date('2026-05-06T14:00:00.000Z');
    const scheduledSession = makeScheduledSession({
      sessionDeducted: true,
      deductionDate: existingDeductionDate,
    });
    const {
      client,
      dailyFormRow,
      scheduledSession: loadedScheduledSession,
      sequelize,
      submitAiWorkoutLogAsDailyForm,
      tx,
    } = await loadService({ scheduledSession });

    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      scheduledSessionId: 777,
      date: '2026-05-06',
      exercises: [{ name: 'Push-up', sets: [{ reps: 10, weight: 0 }] }],
      sequelize,
    });

    expect(client.decrement).not.toHaveBeenCalled();
    expect(dailyFormRow.update).toHaveBeenCalledWith({ sessionDeducted: true }, { transaction: tx });
    expect(loadedScheduledSession.update).toHaveBeenCalledWith(expect.objectContaining({
      sessionDeducted: true,
      deductionDate: existingDeductionDate,
    }), { transaction: tx });
    expect(result.billing).toEqual(expect.objectContaining({
      status: 'previously_deducted',
      creditsDeducted: 0,
      creditsRequired: 2,
    }));
  });
  it('rejects no-show scheduled sessions before writing AI workout logs', async () => {
    const scheduledSession = makeScheduledSession({ attendanceStatus: 'no_show' });
    const {
      models,
      sequelize,
      submitAiWorkoutLogAsDailyForm,
      tx,
    } = await loadService({ scheduledSession });

    await expect(submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      scheduledSessionId: 777,
      date: '2026-05-06',
      exercises: [{ name: 'Push-up', sets: [{ reps: 10, weight: 0 }] }],
      sequelize,
    })).rejects.toMatchObject({
      name: 'AiWorkoutDailyFormError',
      code: 'VALIDATION_ERROR',
      message: 'No-show scheduled sessions cannot be logged as workouts',
    });

    expect(models.WorkoutSession.findOrCreate).not.toHaveBeenCalled();
    expect(models.DailyWorkoutForm.create).not.toHaveBeenCalled();
    expect(tx.rollback).toHaveBeenCalledTimes(1);
    expect(tx.commit).not.toHaveBeenCalled();
  });

  it('rejects scheduled sessions assigned to another trainer', async () => {
    const scheduledSession = makeScheduledSession({ trainerId: 99 });
    const {
      models,
      sequelize,
      submitAiWorkoutLogAsDailyForm,
      tx,
    } = await loadService({ scheduledSession });

    await expect(submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      scheduledSessionId: 777,
      date: '2026-05-06',
      exercises: [{ name: 'Push-up', sets: [{ reps: 10, weight: 0 }] }],
      sequelize,
    })).rejects.toMatchObject({
      name: 'AiWorkoutDailyFormError',
      code: 'VALIDATION_ERROR',
      message: 'You are not assigned to this scheduled session',
    });

    expect(models.WorkoutSession.findOrCreate).not.toHaveBeenCalled();
    expect(models.DailyWorkoutForm.create).not.toHaveBeenCalled();
    expect(tx.rollback).toHaveBeenCalledTimes(1);
    expect(tx.commit).not.toHaveBeenCalled();
  });
});
