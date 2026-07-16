/**
 * ============================================================================
 * FILE: workoutPlanLifecycleMutationWiring.test.mjs
 * PURPOSE: Lock completion and archive writers to the canonical plan boundary.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Proves verified workout completion and Swan Coach plan
 * archival cannot bypass row locking, revision checks, or identity persistence.
 * HOW IT FITS IN THE APP: Workout-form/AI logs and delete_workout_plan commands
 * converge on WorkoutPlan mutation semantics without duplicating raw ORM writes.
 * KEY DECISIONS: Cursor progress keeps the enclosing transaction; command
 * archival uses a managed mutation transaction and preserves not-found receipts.
 * NASM PROTOCOL CONTEXT: Completion changes lifecycle/progress state while the
 * prescribed training content remains revision-addressable.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  WorkoutPlan: {
    findOne: vi.fn(),
    findByPk: vi.fn(),
  },
  mutateWorkoutPlanRecord: vi.fn(),
  sequelize: {
    transaction: vi.fn(),
  },
}));

vi.mock('../../database.mjs', () => ({
  default: fixtures.sequelize,
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({ WorkoutPlan: fixtures.WorkoutPlan }),
}));

vi.mock('../../services/workoutPlanMutationService.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
  mutateWorkoutPlanRecord: (...args) => fixtures.mutateWorkoutPlanRecord(...args),
}));

const { advancePlanAfterPlannedAssignmentLog } = await import(
  '../../services/clientTrainingPlanProgressService.mjs'
);
const { dispatchDeleteWorkoutPlan } = await import(
  '../../services/ai/dispatchers/workoutPlanCommandDispatchers.mjs'
);

const transaction = { LOCK: { UPDATE: 'UPDATE' } };

const buildPlan = (overrides = {}) => ({
  id: 'plan-lifecycle',
  userId: 42,
  trainerId: 3,
  status: 'active',
  currentWeek: 1,
  currentDay: 1,
  contentRevision: 4,
  contentHash: 'a'.repeat(64),
  planData: {
    weeks: [{
      weekNumber: 1,
      days: [
        { dayNumber: 1, exercises: [{ exerciseName: 'Goblet Squat' }] },
        { dayNumber: 2, exercises: [] },
      ],
    }],
  },
  update: vi.fn(),
  ...overrides,
});

const assignment = {
  source: 'workout_plan',
  assignmentType: 'homework',
  isBillable: false,
  shouldDeductSession: false,
  planId: 'plan-lifecycle',
  weekNumber: 1,
  dayNumber: 1,
};

describe('workout plan lifecycle mutation wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('advances verified plan progress through the existing transaction and revision', async () => {
    const plan = buildPlan();
    fixtures.WorkoutPlan.findOne.mockResolvedValue(plan);
    fixtures.mutateWorkoutPlanRecord.mockResolvedValue({ plan });

    const result = await advancePlanAfterPlannedAssignmentLog({
      WorkoutPlan: fixtures.WorkoutPlan,
      assignment,
      clientId: 42,
      dailyWorkoutFormId: 'daily-form-1',
      workoutSessionId: 'workout-session-1',
      completedAt: '2026-07-15T20:00:00.000Z',
      transaction,
    });

    expect(result).toMatchObject({
      advanced: true,
      planCompleted: false,
      next: { week: 1, day: 2 },
    });
    expect(fixtures.mutateWorkoutPlanRecord).toHaveBeenCalledWith(expect.objectContaining({
      WorkoutPlan: fixtures.WorkoutPlan,
      planId: plan.id,
      expectedRevision: 4,
      transaction,
      updates: expect.objectContaining({
        currentWeek: 1,
        currentDay: 2,
        status: 'active',
      }),
    }));
    const updates = fixtures.mutateWorkoutPlanRecord.mock.calls[0][0].updates;
    expect(updates.planData.weeks[0].days[0]).toMatchObject({
      completed: true,
      dailyWorkoutFormId: 'daily-form-1',
      workoutSessionId: 'workout-session-1',
    });
    expect(plan.update).not.toHaveBeenCalled();
  });

  it('archives a Swan Coach plan through the managed mutation boundary', async () => {
    const plan = buildPlan();
    fixtures.mutateWorkoutPlanRecord.mockImplementation(async ({ updates }) => {
      if (typeof updates === 'function') await updates(plan);
      return { plan };
    });

    const result = await dispatchDeleteWorkoutPlan({ planId: plan.id });

    expect(fixtures.mutateWorkoutPlanRecord).toHaveBeenCalledWith(expect.objectContaining({
      sequelize: fixtures.sequelize,
      WorkoutPlan: fixtures.WorkoutPlan,
      planId: plan.id,
      updates: expect.any(Function),
    }));
    expect(fixtures.WorkoutPlan.findByPk).not.toHaveBeenCalled();
    expect(plan.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      planFound: true,
      archived: true,
      previousStatus: 'active',
      status: 'completed',
      clientId: 42,
      trainerId: 3,
    });
  });

  it('reports an already-completed plan as an idempotent archive', async () => {
    const plan = buildPlan({ status: 'completed' });
    fixtures.mutateWorkoutPlanRecord.mockImplementation(async ({ updates }) => {
      if (typeof updates === 'function') await updates(plan);
      return { plan };
    });

    const result = await dispatchDeleteWorkoutPlan({ planId: plan.id });

    expect(result).toMatchObject({
      planFound: true,
      archived: false,
      previousStatus: 'completed',
      status: 'completed',
    });
  });

  it('propagates non-not-found mutation failures', async () => {
    const error = Object.assign(new Error('lock failed'), {
      code: 'WORKOUT_PLAN_LOCK_UNAVAILABLE',
      statusCode: 500,
    });
    fixtures.mutateWorkoutPlanRecord.mockRejectedValue(error);

    await expect(dispatchDeleteWorkoutPlan({ planId: 'plan-lifecycle' }))
      .rejects.toBe(error);
  });

  it('preserves the command receipt when the plan does not exist', async () => {
    fixtures.mutateWorkoutPlanRecord.mockRejectedValue(Object.assign(
      new Error('Workout plan not found'),
      { code: 'WORKOUT_PLAN_NOT_FOUND', statusCode: 404 },
    ));

    const result = await dispatchDeleteWorkoutPlan({ planId: 'missing-plan' });

    expect(result).toEqual({
      planId: 'missing-plan',
      planFound: false,
      archived: false,
      previousStatus: null,
      status: null,
      clientId: null,
      trainerId: null,
    });
  });
});
