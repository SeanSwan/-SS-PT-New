/**
 * ============================================================================
 * FILE: aiDataWriteWorkoutPlanActiveInvariant.test.mjs
 * PURPOSE: Prove Swan Coach activation uses the audited lifecycle boundary.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  create: vi.fn(),
  transitionLifecycle: vi.fn(),
}));
const WorkoutPlan = { create: harness.create };

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../models/index.mjs', () => ({
  getWorkoutPlan: () => WorkoutPlan,
}));
vi.mock('../../services/workoutPlanLifecycleService.mjs', () => ({
  transitionWorkoutPlanLifecycle: (...args) => harness.transitionLifecycle(...args),
}));

const { processAIDataUpdates } = await import('../../services/aiDataWriteService.mjs');

function makeFakeSequelize(capture) {
  const transaction = { id: 'tx-workout-plan', LOCK: { UPDATE: 'UPDATE' } };
  capture.transaction = transaction;
  return {
    transaction: vi.fn(async (work) => work(transaction)),
    query: vi.fn(async () => [[], { rowCount: 1 }]),
    QueryTypes: { INSERT: 'INSERT', UPDATE: 'UPDATE' },
  };
}

describe('aiDataWriteService save_workout_plan active invariant', () => {
  let capture;

  beforeEach(() => {
    capture = { create: null, transaction: null };
    vi.clearAllMocks();
    harness.create.mockImplementation(async (values, options) => {
      capture.create = { values, ...options };
      return { id: '6ea7806d-36c8-4307-bd5d-6b04b68be849', ...values };
    });
    harness.transitionLifecycle.mockImplementation(async ({ planId }) => ({
      plan: { id: planId, status: 'active' },
      lifecycleReceipts: [],
    }));
  });

  it('creates a draft then activates it in the same caller-owned transaction', async () => {
    const sequelize = makeFakeSequelize(capture);
    const result = await processAIDataUpdates(42, [{
      type: 'save_workout_plan',
      data: {
        title: 'Swan Coach Replacement Arc',
        durationWeeks: 26,
        planData: {
          weeks: [{
            weekNumber: 1,
            days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Split Squat' }] }],
          }],
        },
      },
    }], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(sequelize.transaction).toHaveBeenCalledOnce();
    expect(sequelize.query).not.toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'paused'"),
      expect.anything(),
    );
    expect(capture.create.transaction).toBe(capture.transaction);
    expect(capture.create.values).toMatchObject({
      status: 'draft',
      contentRevision: 1,
      contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      metadata: {
        planHorizon: 'six_month',
        horizonKey: 'six_month',
        planDurationKey: 'six_month',
        planSource: 'swan_coach_planning',
        assignmentDefault: 'trainer_session',
        billingIntent: 'trainer_led_scheduled_flow',
        defaultShouldDeductSession: false,
      },
    });
    expect(capture.create.values.metadata).not.toHaveProperty('isPrimaryPlan');
    expect(capture.create.values.metadata).not.toHaveProperty('primary');
    expect(harness.transitionLifecycle).toHaveBeenCalledWith(expect.objectContaining({
      sequelize,
      WorkoutPlan,
      transaction: capture.transaction,
      planId: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
      action: 'activate',
      actorId: 7,
      derivativeReason: 'ai_plan_save',
    }));
  });
});