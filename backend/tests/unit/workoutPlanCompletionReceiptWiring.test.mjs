/**
 * ============================================================================
 * FILE: workoutPlanCompletionReceiptWiring.test.mjs
 * PURPOSE: Lock completion proof to the canonical plan-progress transaction.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Proves plan advancement writes immutable pre-mutation
 * prescription evidence in the same transaction as the workout-log progress.
 * HOW IT FITS IN THE APP: Verified DailyWorkoutForm -> plan cursor mutation ->
 * WorkoutPlanCompletionReceipt, with one atomic commit or rollback boundary.
 * KEY DECISIONS: The receipt uses the assigned revision/hash and original day
 * prescription even though planData is marked completed by the adjacent write.
 * NASM PROTOCOL CONTEXT: Historical proof retains the assigned acute variables.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashWorkoutPlanContent } from '../../services/workoutPlanRevisionService.mjs';

const fixtures = vi.hoisted(() => ({
  mutateWorkoutPlanRecord: vi.fn(),
  sequelize: {},
}));

vi.mock('../../database.mjs', () => ({ default: fixtures.sequelize }));
vi.mock('../../services/workoutPlanMutationService.mjs', () => ({
  mutateWorkoutPlanRecord: (...args) => fixtures.mutateWorkoutPlanRecord(...args),
}));

const { advancePlanAfterPlannedAssignmentLog } = await import(
  '../../services/clientTrainingPlanProgressService.mjs'
);

const transaction = { id: 'workout-log-tx', LOCK: { UPDATE: 'UPDATE' } };
const planData = {
  weeks: [{
    weekNumber: 1,
    days: [
      {
        dayNumber: 1,
        exercises: [{
          exerciseId: 'goblet-squat',
          exerciseName: 'Goblet Squat',
          sets: 3,
          targetReps: '8-12',
          notes: 'private coaching context',
        }],
      },
      { dayNumber: 2, exercises: [] },
    ],
  }],
};
const plan = {
  id: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
  userId: 42,
  status: 'active',
  currentWeek: 1,
  currentDay: 1,
  contentRevision: 4,
  contentHash: hashWorkoutPlanContent(planData),
  planData,
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

describe('WorkoutPlan completion receipt progress wiring', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stores pre-mutation prescription evidence in the caller transaction', async () => {
    const WorkoutPlan = {
      findOne: vi.fn().mockResolvedValue(plan),
      findByPk: vi.fn().mockResolvedValue(plan),
    };
    const WorkoutPlanCompletionReceipt = {
      findOrCreate: vi.fn().mockResolvedValue([{ id: 'receipt-1' }, true]),
    };
    fixtures.mutateWorkoutPlanRecord.mockResolvedValue({ plan });

    const result = await advancePlanAfterPlannedAssignmentLog({
      WorkoutPlan,
      WorkoutPlanCompletionReceipt,
      assignment,
      clientId: 42,
      dailyWorkoutFormId: '4ea7806d-36c8-4307-bd5d-6b04b68be849',
      workoutSessionId: '5ea7806d-36c8-4307-bd5d-6b04b68be849',
      completedAt: '2026-07-15T20:00:00.000Z',
      transaction,
    });

    expect(fixtures.mutateWorkoutPlanRecord).toHaveBeenCalledWith(expect.objectContaining({
      WorkoutPlan,
      planId: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
      expectedRevision: 4,
      transaction,
    }));
    const receiptCall = WorkoutPlanCompletionReceipt.findOrCreate.mock.calls[0][0];
    expect(receiptCall.transaction).toBe(transaction);
    expect(receiptCall.defaults).toMatchObject({
      workoutPlanId: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
      clientId: 42,
      scheduledDate: '2026-07-15',
      prescribedRevision: 4,
      prescribedHash: plan.contentHash,
      exerciseSnapshot: {
        version: 1,
        exerciseCount: 1,
        exercises: [{
          exerciseId: 'goblet-squat',
          exerciseName: 'Goblet Squat',
          sets: 3,
          reps: '8-12',
        }],
      },
    });
    expect(JSON.stringify(receiptCall.defaults.exerciseSnapshot)).not.toContain('private coaching');
    expect(result).toMatchObject({
      advanced: true,
      completionReceiptId: 'receipt-1',
      completionReceiptCreated: true,
    });
  });

  it('fails before plan mutation when the atomic transaction is missing', async () => {
    const WorkoutPlan = {
      findOne: vi.fn().mockResolvedValue(plan),
      findByPk: vi.fn().mockResolvedValue(plan),
    };
    const WorkoutPlanCompletionReceipt = { findOrCreate: vi.fn() };

    await expect(advancePlanAfterPlannedAssignmentLog({
      WorkoutPlan,
      WorkoutPlanCompletionReceipt,
      assignment,
      clientId: 42,
      dailyWorkoutFormId: '4ea7806d-36c8-4307-bd5d-6b04b68be849',
      completedAt: '2026-07-15T20:00:00.000Z',
    })).rejects.toMatchObject({
      code: 'WORKOUT_PLAN_COMPLETION_TRANSACTION_REQUIRED',
    });

    expect(fixtures.mutateWorkoutPlanRecord).not.toHaveBeenCalled();
    expect(WorkoutPlanCompletionReceipt.findOrCreate).not.toHaveBeenCalled();
  });
});