/**
 * aiWorkoutDailyFormService tests
 * ===============================
 * Locks the Swan Coach workout command write path to diary/billing truth.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashWorkoutPlanContent } from '../../services/workoutPlanRevisionService.mjs';

let models;
let challengeBridge;
let xpStep;

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
  const plan = {
    id: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
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
  plan.contentRevision = overrides.contentRevision ?? 4;
  plan.contentHash = overrides.contentHash ?? hashWorkoutPlanContent(plan.planData);
  return plan;
}

async function loadService({ client = makeClient(), existingForm = null, activePlan = makeActivePlan() } = {}) {
  vi.resetModules();
  challengeBridge = {
    applyDailyWorkoutFormChallengeProgress: vi.fn(async () => ({
      updatedCount: 1,
      skippedCount: 0,
      updated: [{
        challengeId: 'challenge-1',
        title: 'Session Streak',
        progressUnit: 'sessions',
        delta: 1,
        currentProgress: 2,
        progressPercentage: 66.67,
        completed: false,
      }],
      skipped: [],
    })),
  };
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
      findByPk: vi.fn(async () => activePlan),
    },
    WorkoutPlanCompletionReceipt: {
      findOrCreate: vi.fn(async ({ defaults }) => [{ id: 'receipt-ai', ...defaults }, true]),
    },
    Challenge: { modelName: 'Challenge' },
    ChallengeParticipant: { modelName: 'ChallengeParticipant' },
  };
  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => models,
  }));
  vi.doMock('../../services/gamification/challengeWorkoutCompletionBridge.mjs', () => challengeBridge);
  xpStep = {
    runWorkoutXpAwardStep: vi.fn(async ({ suppress }) => (suppress
      ? null
      : { pointsAwarded: 50, newBalance: 150, streakDays: 3, milestones: [] })),
  };
  vi.doMock('../../services/workout/workoutXpAwardStep.mjs', () => xpStep);
  const service = await import('../../services/workout/aiWorkoutDailyFormService.mjs');
  return {
    ...service,
    client,
    dailyFormRow,
    models,
    sequelize: { transaction: vi.fn(async () => tx) },
    challengeBridge,
    xpStep,
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

  it('feeds accepted AI workout logs into challenge progress after the workout commit', async () => {
    const {
      submitAiWorkoutLogAsDailyForm,
      challengeBridge,
      dailyFormRow,
      models,
      sequelize,
      tx,
      workoutSession,
    } = await loadService();

    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      date: '2026-05-05',
      duration: 30,
      exercises: [{
        name: 'Push Up',
        exerciseFamily: 'push',
        movementPattern: 'horizontal_push',
        nasmMovementPattern: 'push',
        bodyPartCategory: 'Chest',
        muscleGroups: ['chest', 'triceps'],
        tags: ['bodyweight', 'push'],
        sets: [{ reps: 10, weight: 0 }],
      }],
      sequelize,
    });

    expect(result.challengeProgress).toEqual({
      status: 'processed',
      updatedCount: 1,
      skippedCount: 0,
      headline: '1 challenge moved from this workout',
      updates: [{
        challengeId: 'challenge-1',
        title: 'Session Streak',
        delta: 1,
        progressUnit: 'sessions',
        currentProgress: 2,
        progressPercentage: 66.67,
        completed: false,
        xpEarned: 0,
      }],
    });
    expect(tx.commit).toHaveBeenCalledTimes(1);
    expect(challengeBridge.applyDailyWorkoutFormChallengeProgress).toHaveBeenCalledWith({
      sequelize,
      models: {
        Challenge: models.Challenge,
        ChallengeParticipant: models.ChallengeParticipant,
      },
      userId: 42,
      dailyForm: expect.objectContaining({ id: dailyFormRow.id }),
      workoutSession,
      workoutDateIso: '2026-05-05',
      estimatedDuration: 30,
      exercises: [expect.objectContaining({
        exerciseName: 'Push Up',
        exerciseFamily: 'push',
        movementPattern: 'horizontal_push',
        nasmMovementPattern: 'push',
        bodyPartCategory: 'Chest',
        muscleGroups: ['chest', 'triceps'],
        tags: ['bodyweight', 'push'],
      })],
    });
    expect(tx.commit.mock.invocationCallOrder[0]).toBeLessThan(
      challengeBridge.applyDailyWorkoutFormChallengeProgress.mock.invocationCallOrder[0],
    );
  });

  it('keeps the AI workout write committed if challenge progress fails after commit', async () => {
    const { submitAiWorkoutLogAsDailyForm, challengeBridge, sequelize, tx } = await loadService();
    challengeBridge.applyDailyWorkoutFormChallengeProgress.mockRejectedValueOnce(new Error('challenge bridge down'));

    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      date: '2026-05-05',
      exercises: [{ name: 'Push Up', sets: [{ reps: 10, weight: 0 }] }],
      sequelize,
    });

    expect(result.form.id).toBe('form-1');
    expect(result.challengeProgress).toEqual({
      status: 'failed',
      updatedCount: 0,
      skippedCount: 0,
      headline: null,
      updates: [],
    });
    expect(JSON.stringify(result.challengeProgress)).not.toContain('challenge bridge down');
    expect(tx.commit).toHaveBeenCalledTimes(1);
    expect(tx.rollback).not.toHaveBeenCalled();
    expect(challengeBridge.applyDailyWorkoutFormChallengeProgress).toHaveBeenCalledTimes(1);
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
      creditsRequired: 0,
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

    const workoutDate = new Date().toISOString().slice(0, 10);
    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      date: workoutDate,
      exercises: [{ name: 'Goblet Squat', sets: [{ reps: 10, weight: 40 }] }],
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
      sequelize,
    });

    expect(client.decrement).not.toHaveBeenCalled();
    expect(models.WorkoutPlan.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '6ea7806d-36c8-4307-bd5d-6b04b68be849', userId: 42, status: 'active' },
      lock: 'UPDATE',
      transaction: tx,
    }));
    const formCreate = models.DailyWorkoutForm.create.mock.calls[0][0];
    expect(formCreate.formData.plannedAssignment).toMatchObject({
      assignmentKey: `6ea7806d-36c8-4307-bd5d-6b04b68be849:w4:d2:${workoutDate}:o1:r4`,
      planId: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
      scheduledDate: workoutDate,
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
    expect(activePlan.update).toHaveBeenCalledWith(expect.objectContaining({
      currentWeek: 5,
      currentDay: 1,
      status: 'active',
    }), { transaction: tx });
    expect(result.form.plannedAssignment).toMatchObject({
      assignmentKey: `6ea7806d-36c8-4307-bd5d-6b04b68be849:w4:d2:${workoutDate}:o1:r4`,
      shouldDeductSession: false,
    });
    expect(result.form.planProgress).toMatchObject({
      advanced: true,
      previous: { week: 4, day: 2 },
      next: { week: 5, day: 1 },
    });
    expect(result.billing).toMatchObject({
      status: 'not_deducted',
      creditsDeducted: 0,
      creditsRequired: 0,
    });
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
        assignmentKey: '6ea7806d-36c8-4307-bd5d-6b04b68be849:w4:d2:homework',
        planId: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
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
      assignmentKey: `6ea7806d-36c8-4307-bd5d-6b04b68be849:w4:d2:${verifiedAssignmentDate}:o1:r4`,
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

  it('awards XP through the shared post-commit step for live sources (Phase 1.1a)', async () => {
    const { submitAiWorkoutLogAsDailyForm, sequelize, xpStep } = await loadService();

    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      date: '2026-05-05',
      exercises: [{ exerciseName: 'Goblet Squat', sets: 2, reps: 10, weight: 20 }],
      sequelize,
    });

    expect(xpStep.runWorkoutXpAwardStep).toHaveBeenCalledTimes(1);
    expect(xpStep.runWorkoutXpAwardStep).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      workoutId: 'form-1',
      sessionId: 'session-1',
      awardedBy: 7,
      suppress: false,
    }));
    expect(result.xpAwarded).toBe(50);
    expect(result.streakDays).toBe(3);
    expect(result.xp).toEqual(expect.objectContaining({ pointsAwarded: 50 }));
  });

  it('suppresses XP for historical imports via the source policy', async () => {
    const { submitAiWorkoutLogAsDailyForm, sequelize, xpStep } = await loadService();

    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      date: '2026-05-05',
      source: 'historical_import',
      exercises: [{ exerciseName: 'Goblet Squat', sets: 2, reps: 10, weight: 20 }],
      sequelize,
    });

    expect(xpStep.runWorkoutXpAwardStep).toHaveBeenCalledWith(expect.objectContaining({ suppress: true }));
    expect(result.xpAwarded).toBeNull();
    expect(result.xp).toBeNull();
  });

  it('keeps PLAUD merges billing-suppressed but XP-active (Sean owns the billing flip)', async () => {
    const client = makeClient({ availableSessions: 2 });
    const { submitAiWorkoutLogAsDailyForm, sequelize, xpStep } = await loadService({ client });

    const result = await submitAiWorkoutLogAsDailyForm({
      clientId: 42,
      trainerId: 7,
      date: '2026-05-05',
      source: 'plaud_merge',
      exercises: [{ exerciseName: 'Goblet Squat', sets: 2, reps: 10, weight: 20 }],
      sequelize,
    });

    expect(client.decrement).not.toHaveBeenCalled();
    expect(result.billing.status).toBe('not_deducted');
    expect(xpStep.runWorkoutXpAwardStep).toHaveBeenCalledWith(expect.objectContaining({ suppress: false }));
    expect(result.xpAwarded).toBe(50);
    expect(result.historicalImport).toBe(false);
  });
});
