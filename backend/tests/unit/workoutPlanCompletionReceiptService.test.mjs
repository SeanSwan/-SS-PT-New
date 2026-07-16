/**
 * ============================================================================
 * FILE: workoutPlanCompletionReceiptService.test.mjs
 * PURPOSE: Lock immutable prescription evidence for completed plan assignments.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Proves receipt identity, compact prescription snapshots,
 * idempotent replay, and collision failure without mutating prior evidence.
 * HOW IT FITS IN THE APP: Verified workout log transaction -> plan advance ->
 * immutable WorkoutPlanCompletionReceipt.
 * KEY DECISIONS: Receipt identity excludes PII and includes the prescribed
 * revision, so later plan edits cannot rewrite historical workout evidence.
 * NASM PROTOCOL CONTEXT: Completed work remains tied to the exact acute-variable
 * prescription that the client was assigned.
 */

import { describe, expect, it, vi } from 'vitest';
import { hashWorkoutPlanContent } from '../../services/workoutPlanRevisionService.mjs';

const loadService = async () => {
  try {
    return await import('../../services/workoutPlanCompletionReceiptService.mjs');
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') return null;
    throw error;
  }
};

const PLAN_ID = '6ea7806d-36c8-4307-bd5d-6b04b68be849';

const planData = {
  weeks: [{
    weekNumber: 1,
    days: [{
      dayNumber: 1,
      exercises: [{
        exerciseId: 'goblet-squat',
        exerciseName: 'Goblet Squat',
        sets: 3,
        targetReps: '8-12',
        tempo: '3/1/1',
        restTime: 60,
        weight: 40,
        targetIntensity: 'RPE 7',
        notes: 'Contains private client context that must not be copied',
        mediaUrl: 'https://private.example/video',
      }],
    }],
  }],
};

const input = () => ({
  plan: {
    id: PLAN_ID,
    planData,
    contentRevision: 4,
    contentHash: hashWorkoutPlanContent(planData),
  },
  assignment: {
    assignmentId: `${PLAN_ID}:w1:d1:2026-07-15:o1:r4`,
    assignmentKey: `${PLAN_ID}:w1:d1:2026-07-15:o1:r4`,
    scheduledDate: '2026-07-15',
    occurrenceIndex: 1,
    weekNumber: 1,
    dayNumber: 1,
  },
  prescribedEntry: planData.weeks[0].days[0],
  clientId: 42,
  dailyWorkoutFormId: '4ea7806d-36c8-4307-bd5d-6b04b68be849',
  workoutSessionId: '5ea7806d-36c8-4307-bd5d-6b04b68be849',
  completedAt: '2026-07-15T20:00:00.000Z',
  transaction: { id: 'workout-log-tx' },
});

describe('WorkoutPlan completion receipt service', () => {
  it('persists an allowlisted prescription snapshot with deterministic identity', async () => {
    const service = await loadService();
    expect(service).not.toBeNull();
    const receipt = { id: 'receipt-1' };
    const WorkoutPlanCompletionReceipt = {
      findOrCreate: vi.fn().mockResolvedValue([receipt, true]),
    };

    const payload = input();
    const result = await service.createWorkoutPlanCompletionReceipt({
      WorkoutPlanCompletionReceipt,
      ...payload,
    });

    const call = WorkoutPlanCompletionReceipt.findOrCreate.mock.calls[0][0];
    expect(call.where.idempotencyKey).toMatch(/^wpc:[a-f0-9]{64}$/);
    expect(call.transaction).toBe(payload.transaction);
    expect(call.defaults).toMatchObject({
      workoutPlanId: PLAN_ID,
      clientId: 42,
      dayKey: 'w1:d1',
      assignmentId: `${PLAN_ID}:w1:d1:2026-07-15:o1:r4`,
      occurrenceIndex: 1,
      scheduledDate: '2026-07-15',
      prescribedRevision: 4,
      prescribedHash: hashWorkoutPlanContent(planData),
      dailyWorkoutFormId: payload.dailyWorkoutFormId,
      workoutSessionId: payload.workoutSessionId,
      completedAt: new Date(payload.completedAt),
    });
    expect(call.defaults.exerciseSnapshot).toEqual({
      version: 1,
      exerciseCount: 1,
      exercises: [{
        exerciseId: 'goblet-squat',
        exerciseName: 'Goblet Squat',
        sets: 3,
        reps: '8-12',
        tempo: '3/1/1',
        restSeconds: 60,
        load: 40,
        targetIntensity: 'RPE 7',
      }],
    });
    expect(JSON.stringify(call.defaults.exerciseSnapshot)).not.toContain('private client');
    expect(JSON.stringify(call.defaults.exerciseSnapshot)).not.toContain('mediaUrl');
    expect(result).toEqual({ receipt, created: true, idempotencyKey: call.where.idempotencyKey });
  });

  it('returns an exact existing receipt without calling update', async () => {
    const service = await loadService();
    expect(service).not.toBeNull();
    const values = service.buildWorkoutPlanCompletionReceiptValues(input());
    const receipt = {
      ...values,
      id: 'receipt-existing',
      get: vi.fn(() => ({ ...values, id: 'receipt-existing' })),
      update: vi.fn(),
    };
    const WorkoutPlanCompletionReceipt = {
      findOrCreate: vi.fn().mockResolvedValue([receipt, false]),
    };

    await expect(service.createWorkoutPlanCompletionReceipt({
      WorkoutPlanCompletionReceipt,
      ...input(),
    })).resolves.toMatchObject({ receipt, created: false });
    expect(receipt.update).not.toHaveBeenCalled();
  });

  it('fails closed when an idempotency key resolves to different evidence', async () => {
    const service = await loadService();
    expect(service).not.toBeNull();
    const values = service.buildWorkoutPlanCompletionReceiptValues(input());
    const receipt = {
      get: vi.fn(() => ({ ...values, prescribedHash: 'f'.repeat(64) })),
    };
    const WorkoutPlanCompletionReceipt = {
      findOrCreate: vi.fn().mockResolvedValue([receipt, false]),
    };

    await expect(service.createWorkoutPlanCompletionReceipt({
      WorkoutPlanCompletionReceipt,
      ...input(),
    })).rejects.toMatchObject({
      code: 'WORKOUT_PLAN_COMPLETION_RECEIPT_CONFLICT',
      statusCode: 409,
    });
  });

  it.each([
    [{ assignment: { ...input().assignment, scheduledDate: '2026-02-30' } }, 'WORKOUT_PLAN_COMPLETION_DATE_INVALID'],
    [{ assignment: { ...input().assignment, occurrenceIndex: 0 } }, 'WORKOUT_PLAN_COMPLETION_EVIDENCE_INVALID'],
    [{ plan: { ...input().plan, contentHash: 'a'.repeat(64) } }, 'WORKOUT_PLAN_COMPLETION_IDENTITY_INVALID'],
  ])('rejects invalid immutable evidence', async (override, code) => {
    const service = await loadService();
    expect(service).not.toBeNull();

    expect(() => service.buildWorkoutPlanCompletionReceiptValues({
      ...input(),
      ...override,
    })).toThrow(expect.objectContaining({ code }));
  });
});
