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
import { hashWorkoutPlanContent } from '../../services/workoutPlanRevisionService.mjs';

const fixtures = vi.hoisted(() => ({
  WorkoutPlan: {
    findOne: vi.fn(),
    findByPk: vi.fn(),
  },
  mutateWorkoutPlanRecord: vi.fn(),
  transitionWorkoutPlanLifecycle: vi.fn(),
  WorkoutPlanCompletionReceipt: {
    findOrCreate: vi.fn(async ({ defaults }) => [{ id: 'receipt-lifecycle', ...defaults }, true]),
  },
  sequelize: {
    transaction: vi.fn(),
  },
}));

vi.mock('../../database.mjs', () => ({
  default: fixtures.sequelize,
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    WorkoutPlan: fixtures.WorkoutPlan,
    WorkoutPlanCompletionReceipt: fixtures.WorkoutPlanCompletionReceipt,
  }),
}));

vi.mock('../../services/workoutPlanMutationService.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
  mutateWorkoutPlanRecord: (...args) => fixtures.mutateWorkoutPlanRecord(...args),
}));

vi.mock('../../services/workoutPlanLifecycleService.mjs', () => ({
  transitionWorkoutPlanLifecycle: (...args) => fixtures.transitionWorkoutPlanLifecycle(...args),
}));

const { advancePlanAfterPlannedAssignmentLog } = await import(
  '../../services/clientTrainingPlanProgressService.mjs'
);
const { dispatchDeleteWorkoutPlan } = await import(
  '../../services/ai/dispatchers/workoutPlanCommandDispatchers.mjs'
);

const transaction = { LOCK: { UPDATE: 'UPDATE' } };

const buildPlan = (overrides = {}) => {
  const plan = {
    id: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
    userId: 42,
    trainerId: 3,
    status: 'active',
    currentWeek: 1,
    currentDay: 1,
    contentRevision: 4,
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
  };
  plan.contentHash = overrides.contentHash ?? hashWorkoutPlanContent(plan.planData);
  return plan;
};

const assignment = {
  source: 'workout_plan',
  assignmentType: 'homework',
  isBillable: false,
  shouldDeductSession: false,
  planId: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
  weekNumber: 1,
  dayNumber: 1,
  assignmentId: '6ea7806d-36c8-4307-bd5d-6b04b68be849:w1:d1:2026-07-15:o1:r4',
  assignmentKey: '6ea7806d-36c8-4307-bd5d-6b04b68be849:w1:d1:2026-07-15:o1:r4',
  scheduledDate: '2026-07-15',
  occurrenceIndex: 1,
  prescribedRevision: 4,
};

describe('workout plan lifecycle mutation wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // `dispatchDeleteWorkoutPlan` now loads the plan to authorize the caller against its
    // owner before reaching the lifecycle service (see
    // tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs). Every actor in this file
    // is an admin, so the check passes on role alone — but the lookup still has to find
    // something. Resolving for EVERY id on purpose: the "plan does not exist" test below
    // is about the SERVICE's not-found rejection, and short-circuiting it here would
    // quietly move that test onto a different code path while it kept passing.
    fixtures.WorkoutPlan.findByPk.mockImplementation(async (id) => ({ id, userId: 42, trainerId: 3 }));
  });

  it('advances verified plan progress through the existing transaction and revision', async () => {
    const plan = buildPlan();
    fixtures.WorkoutPlan.findOne.mockResolvedValue(plan);
    fixtures.mutateWorkoutPlanRecord.mockResolvedValue({ plan });

    const result = await advancePlanAfterPlannedAssignmentLog({
      WorkoutPlan: fixtures.WorkoutPlan,
      WorkoutPlanCompletionReceipt: fixtures.WorkoutPlanCompletionReceipt,
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

  it('archives a Swan Coach plan through the audited lifecycle boundary', async () => {
    const plan = buildPlan({ status: 'archived' });
    fixtures.transitionWorkoutPlanLifecycle.mockResolvedValue({
      plan,
      lifecycleReceipt: {
        id: 'lifecycle-receipt-1',
        fromStatus: 'active',
        toStatus: 'archived',
      },
    });

    const result = await dispatchDeleteWorkoutPlan(
      { planId: plan.id },
      { user: { id: 9, role: 'admin' } },
    );

    expect(fixtures.transitionWorkoutPlanLifecycle).toHaveBeenCalledWith(expect.objectContaining({
      sequelize: fixtures.sequelize,
      WorkoutPlan: fixtures.WorkoutPlan,
      planId: plan.id,
      action: 'archive',
      actorId: 9,
    }));
    expect(fixtures.mutateWorkoutPlanRecord).not.toHaveBeenCalled();
    expect(plan.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      planFound: true,
      archived: true,
      previousStatus: 'active',
      status: 'archived',
      lifecycleReceiptId: 'lifecycle-receipt-1',
      clientId: 42,
      trainerId: 3,
    });
  });

  it('reports an already-archived plan as an idempotent archive', async () => {
    const plan = buildPlan({ status: 'archived' });
    fixtures.transitionWorkoutPlanLifecycle.mockResolvedValue({
      plan,
      lifecycleReceipt: {
        id: 'lifecycle-receipt-2',
        fromStatus: 'archived',
        toStatus: 'archived',
      },
    });

    const result = await dispatchDeleteWorkoutPlan(
      { planId: plan.id },
      { user: { id: 9, role: 'admin' } },
    );

    expect(result).toMatchObject({
      planFound: true,
      archived: false,
      previousStatus: 'archived',
      status: 'archived',
      lifecycleReceiptId: 'lifecycle-receipt-2',
    });
  });
  it('propagates non-not-found mutation failures', async () => {
    const error = Object.assign(new Error('lock failed'), {
      code: 'WORKOUT_PLAN_LOCK_UNAVAILABLE',
      statusCode: 500,
    });
    fixtures.transitionWorkoutPlanLifecycle.mockRejectedValue(error);

    await expect(dispatchDeleteWorkoutPlan(
      { planId: 'plan-lifecycle' },
      { user: { id: 9, role: 'admin' } },
    ))
      .rejects.toBe(error);
  });

  it('preserves the command receipt when the plan does not exist', async () => {
    fixtures.transitionWorkoutPlanLifecycle.mockRejectedValue(Object.assign(
      new Error('Workout plan not found'),
      { code: 'WORKOUT_PLAN_NOT_FOUND', statusCode: 404 },
    ));

    const result = await dispatchDeleteWorkoutPlan(
      { planId: 'missing-plan' },
      { user: { id: 9, role: 'admin' } },
    );

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
