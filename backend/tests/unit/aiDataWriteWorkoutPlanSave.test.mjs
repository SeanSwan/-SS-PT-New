/**
 * AI workout-plan write regression tests.
 *
 * Guards Swan Coach's save_workout_plan path against schema drift from the
 * authoritative WorkoutPlan Sequelize model.
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
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../services/workoutPlanPdfStorageService.mjs', () => ({
  storeWorkoutPlanPdf: mockStoreWorkoutPlanPdf,
}));

const { processAIDataUpdates } = await import('../../services/aiDataWriteService.mjs');

function makeFakeSequelize(capture) {
  return {
    query: vi.fn().mockImplementation(async (sql, opts) => {
      capture.queries.push({ sql, replacements: opts?.replacements || {}, type: opts?.type });
      if (typeof sql === 'string' && sql.includes('INSERT INTO workout_plans')) {
        capture.sql = sql;
        capture.replacements = opts?.replacements || {};
        return [[{ id: 'plan-ai-1' }], { rowCount: 1 }];
      }
      if (typeof sql === 'string' && sql.includes('UPDATE workout_plans')) {
        capture.pdfUpdate = { sql, replacements: opts?.replacements || {} };
      }
      return [[], { rowCount: 1 }];
    }),
    QueryTypes: { INSERT: 'INSERT', UPDATE: 'UPDATE' },
  };
}

describe('aiDataWriteService save_workout_plan', () => {
  let capture;

  beforeEach(() => {
    capture = { sql: '', replacements: null, pdfUpdate: null, queries: [] };
    mockStoreWorkoutPlanPdf.mockClear();
  });

  it('uses WorkoutPlan model column names and stamps horizon metadata for Swan Coach-created plans', async () => {
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
      createdBy: 'swan_coach_planning',
    });
    expect(JSON.parse(capture.replacements.metadata)).toMatchObject({
      planHorizon: 'six_month',
      horizonKey: 'six_month',
      planDurationKey: 'six_month',
      planSource: 'swan_coach_planning',
    });
    expect(JSON.parse(capture.replacements.planData).weeks).toHaveLength(24);
  });

  it('attaches an AI-generated protected PDF to the saved workout plan metadata', async () => {
    const sequelize = makeFakeSequelize(capture);

    const result = await processAIDataUpdates(42, [{
      type: 'save_workout_plan',
      data: {
        title: 'Six Month Strength Arc',
        durationWeeks: 24,
        nasmPhase: 2,
        planData: {
          planSummary: {
            durationWeeks: 24,
            sessionsPerWeek: 3,
            totalSessions: 72,
            primaryGoal: 'strength',
            startingPhase: 2,
          },
          weeks: [{
            weekNumber: 1,
            days: [{
              dayNumber: 1,
              name: 'Strength Endurance Lower',
              exercises: [{ exerciseName: 'Split Squat', sets: 3, reps: '8-12', tempo: '2/0/2', restTime: 60 }],
            }],
          }],
          recommendations: ['Progress load only when tempo is consistent.'],
        },
      },
    }], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.sql).toMatch(/RETURNING\s+id/i);
    expect(mockStoreWorkoutPlanPdf).toHaveBeenCalledOnce();
    expect(mockStoreWorkoutPlanPdf).toHaveBeenCalledWith(expect.objectContaining({
      planId: 'plan-ai-1',
      clientId: 42,
      uploadedBy: 7,
      file: expect.objectContaining({
        originalname: expect.stringMatching(/^SwanStudios-Workout-Plan-Six-Month-Strength-Arc\.pdf$/),
        mimetype: 'application/pdf',
        size: expect.any(Number),
        buffer: expect.any(Buffer),
      }),
    }));

    const storedFile = mockStoreWorkoutPlanPdf.mock.calls[0][0].file;
    expect(storedFile.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(storedFile.size).toBe(storedFile.buffer.length);

    expect(capture.pdfUpdate?.sql).toContain('UPDATE workout_plans');
    expect(capture.pdfUpdate?.replacements).toMatchObject({
      planId: 'plan-ai-1',
    });
    expect(JSON.parse(capture.pdfUpdate.replacements.metadata)).toMatchObject({
      planHorizon: 'six_month',
      horizonKey: 'six_month',
      planDurationKey: 'six_month',
      planSource: 'swan_coach_planning',
      planPdf: {
        url: '/api/workout-plans/plan-ai-1/pdf/content.pdf',
        fileName: 'SwanStudios-Workout-Plan-Six-Month-Strength-Arc.pdf',
        contentType: 'application/pdf',
        storage: 'local',
        storageKey: 'workout-plans/42/plan-ai-1-ai-generated.pdf',
      },
    });
  });
});
