/**
 * AI workout-plan active invariant regression tests.
 *
 * Guards the legacy Swan Coach save_workout_plan fallback so it cannot trip the
 * one-active-plan-per-client invariant when it creates a new active plan.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStoreWorkoutPlanPdf = vi.hoisted(() => vi.fn(async ({ file, planId, clientId, uploadedBy }) => ({
  url: `/api/workout-plans/${planId}/pdf/content.pdf`,
  fileName: file.originalname,
  contentType: 'application/pdf',
  storage: 'local',
  storageKey: `workout-plans/${clientId}/${planId}-ai-generated.pdf`,
  size: file.size,
  updatedBy: uploadedBy,
  updatedAt: '2026-06-06T12:00:00.000Z',
})));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../services/workoutPlanPdfStorageService.mjs', () => ({
  storeWorkoutPlanPdf: mockStoreWorkoutPlanPdf,
}));

const { processAIDataUpdates } = await import('../../services/aiDataWriteService.mjs');

function makeFakeSequelize(capture) {
  const transaction = { id: 'tx-workout-plan' };
  capture.transaction = transaction;

  return {
    transaction: vi.fn(async (work) => work(transaction)),
    query: vi.fn().mockImplementation(async (sql, opts = {}) => {
      const entry = {
        sql,
        replacements: opts.replacements || {},
        type: opts.type,
        transaction: opts.transaction,
      };
      capture.queries.push(entry);

      if (typeof sql === 'string' && sql.includes('INSERT INTO workout_plans')) {
        capture.insert = entry;
        return [[{ id: 'plan-ai-2' }], { rowCount: 1 }];
      }

      if (typeof sql === 'string' && sql.includes('SET metadata = :metadata::jsonb')) {
        capture.pdfUpdate = entry;
      }

      return [[], { rowCount: 1 }];
    }),
    QueryTypes: { INSERT: 'INSERT', UPDATE: 'UPDATE' },
  };
}

describe('aiDataWriteService save_workout_plan active invariant', () => {
  let capture;

  beforeEach(() => {
    capture = { queries: [], insert: null, pdfUpdate: null, transaction: null };
    mockStoreWorkoutPlanPdf.mockClear();
  });

  it('pauses existing active plans transactionally before inserting the AI-created active plan', async () => {
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

    const demotionIndex = capture.queries.findIndex((query) => (
      typeof query.sql === 'string'
      && query.sql.includes("SET status = 'paused'")
      && query.sql.includes('WHERE "userId" = :clientId')
    ));
    const insertIndex = capture.queries.findIndex((query) => (
      typeof query.sql === 'string' && query.sql.includes('INSERT INTO workout_plans')
    ));

    expect(demotionIndex).toBeGreaterThanOrEqual(0);
    expect(insertIndex).toBeGreaterThan(demotionIndex);

    const demotion = capture.queries[demotionIndex];
    expect(demotion).toMatchObject({
      replacements: { clientId: 42 },
      type: 'UPDATE',
      transaction: capture.transaction,
    });
    expect(demotion.sql).toContain('COALESCE(metadata');
    expect(JSON.parse(demotion.replacements.demotionMetadata)).toEqual({
      isPrimaryPlan: false,
      primary: false,
    });

    expect(capture.insert.transaction).toBe(capture.transaction);
    expect(JSON.parse(capture.insert.replacements.metadata)).toMatchObject({
      planSource: 'swan_coach_planning',
      isPrimaryPlan: true,
      primary: true,
    });
    expect(capture.pdfUpdate).toBeTruthy();
  });
});