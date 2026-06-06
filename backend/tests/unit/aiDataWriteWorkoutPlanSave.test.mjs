/**
 * AI workout-plan write regression tests.
 *
 * Guards Swan Coach's save_workout_plan path against schema drift from the
 * authoritative WorkoutPlan Sequelize model.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const { processAIDataUpdates } = await import('../../services/aiDataWriteService.mjs');

function makeFakeSequelize(capture) {
  return {
    query: vi.fn().mockImplementation(async (sql, opts) => {
      if (typeof sql === 'string' && sql.includes('INSERT INTO workout_plans')) {
        capture.sql = sql;
        capture.replacements = opts?.replacements || {};
      }
      return [[], { rowCount: 1 }];
    }),
    QueryTypes: { INSERT: 'INSERT' },
  };
}

describe('aiDataWriteService save_workout_plan', () => {
  let capture;

  beforeEach(() => {
    capture = { sql: '', replacements: null };
  });

  it('uses WorkoutPlan model column names and stamps horizon metadata for AI-created plans', async () => {
    const sequelize = makeFakeSequelize(capture);

    const result = await processAIDataUpdates(42, [{
      type: 'save_workout_plan',
      data: {
        title: 'Six Month Strength Arc',
        durationWeeks: 24,
        nasmPhase: 2,
        planData: {
          weeks: Array.from({ length: 24 }, (_, index) => ({
            weekNumber: index + 1,
            days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Split Squat' }] }],
          })),
        },
      },
    }], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.sql).toContain('"userId"');
    expect(capture.sql).toContain('"durationWeeks"');
    expect(capture.sql).toContain('"createdAt"');
    expect(capture.sql).toContain('"updatedAt"');
    expect(capture.sql).not.toContain('user_id');
    expect(capture.sql).not.toContain('duration_weeks');

    expect(capture.replacements).toMatchObject({
      clientId: 42,
      trainerId: 7,
      durationWeeks: 24,
      createdBy: 'ai',
    });
    expect(JSON.parse(capture.replacements.metadata)).toMatchObject({
      planHorizon: 'six_month',
      horizonKey: 'six_month',
      planDurationKey: 'six_month',
      planSource: 'swan_coach_ai',
    });
    expect(JSON.parse(capture.replacements.planData).weeks).toHaveLength(24);
  });
});
