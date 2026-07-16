/**
 * ============================================================================
 * FILE: aiDataWriteWorkoutPlanActiveInvariant.test.mjs
 * PURPOSE: Prove Swan Coach demotes active plans before canonical creation.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({ create: vi.fn(), storePdf: vi.fn() }));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../models/index.mjs', () => ({
  getWorkoutPlan: () => ({ create: harness.create }),
}));
vi.mock('../../services/workoutPlanPdfStorageService.mjs', () => ({
  storeWorkoutPlanPdf: harness.storePdf,
}));

const { processAIDataUpdates } = await import('../../services/aiDataWriteService.mjs');

function makeFakeSequelize(capture) {
  const transaction = { id: 'tx-workout-plan' };
  capture.transaction = transaction;
  return {
    transaction: vi.fn(async (work) => work(transaction)),
    query: vi.fn(async (sql, options = {}) => {
      capture.queries.push({ sql, ...options });
      return [[], { rowCount: 1 }];
    }),
    QueryTypes: { INSERT: 'INSERT', UPDATE: 'UPDATE' },
  };
}

describe('aiDataWriteService save_workout_plan active invariant', () => {
  let capture;

  beforeEach(() => {
    capture = { queries: [], create: null, transaction: null };
    vi.clearAllMocks();
    harness.create.mockImplementation(async (values, options) => {
      capture.create = { values, ...options };
      return { id: 'plan-ai-2', ...values };
    });
  });

  it('pauses existing active plans transactionally before creating the replacement', async () => {
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
    const demotionIndex = capture.queries.findIndex(({ sql }) => (
      sql.includes("SET status = 'paused'") && sql.includes('WHERE "userId" = :clientId')
    ));
    expect(demotionIndex).toBeGreaterThanOrEqual(0);
    expect(capture.create).toBeTruthy();
    expect(capture.queries.length).toBe(demotionIndex + 1);
    expect(capture.queries[demotionIndex]).toMatchObject({
      replacements: { clientId: 42 },
      type: 'UPDATE',
      transaction: capture.transaction,
    });
    expect(JSON.parse(capture.queries[demotionIndex].replacements.demotionMetadata)).toEqual({
      isPrimaryPlan: false,
      primary: false,
    });
    expect(capture.create.transaction).toBe(capture.transaction);
    expect(capture.create.values).toMatchObject({
      status: 'active',
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
        isPrimaryPlan: true,
        primary: true,
      },
    });
    expect(harness.storePdf).not.toHaveBeenCalled();
  });
});
