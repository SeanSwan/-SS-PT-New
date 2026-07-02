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
      nasmPhase: 2,
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

  it('derives duration metadata from generated planData when durationWeeks is omitted', async () => {
    const sequelize = makeFakeSequelize(capture);

    const result = await processAIDataUpdates(42, [{
      type: 'save_workout_plan',
      data: {
        title: 'Generated Six Month Arc',
        nasmPhase: 2,
        planData: {
          planSummary: {
            durationWeeks: 26,
            sessionsPerWeek: 3,
            totalSessions: 78,
            primaryGoal: 'strength',
            startingPhase: 2,
          },
          weeks: Array.from({ length: 26 }, (_, index) => ({
            weekNumber: index + 1,
            days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Split Squat' }] }],
          })),
        },
      },
    }], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements).toMatchObject({
      durationWeeks: 26,
    });
    expect(JSON.parse(capture.replacements.metadata)).toMatchObject({
      planHorizon: 'six_month',
      horizonKey: 'six_month',
      planDurationKey: 'six_month',
    });
    expect(JSON.parse(capture.replacements.planData).weeks).toHaveLength(26);
    expect(capture.pdfUpdate?.replacements).toMatchObject({
      planId: 'plan-ai-1',
    });
    expect(JSON.parse(capture.pdfUpdate.replacements.metadata)).toMatchObject({
      planHorizon: 'six_month',
      horizonKey: 'six_month',
      planDurationKey: 'six_month',
    });
  });

  it('overrides AI-supplied horizon metadata with generated plan duration', async () => {
    const sequelize = makeFakeSequelize(capture);

    const result = await processAIDataUpdates(42, [{
      type: 'save_workout_plan',
      data: {
        title: 'Prompt Metadata Six Month Arc',
        durationWeeks: 4,
        metadata: {
          planHorizon: 'one_day',
          horizonKey: 'one_day',
          planDurationKey: 'one_day',
        },
        planData: {
          planSummary: {
            durationWeeks: 26,
            sessionsPerWeek: 3,
            totalSessions: 78,
            primaryGoal: 'strength',
            startingPhase: 2,
          },
          weeks: Array.from({ length: 26 }, (_, index) => ({
            weekNumber: index + 1,
            days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Split Squat' }] }],
          })),
        },
      },
    }], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements).toMatchObject({
      durationWeeks: 26,
    });
    expect(JSON.parse(capture.replacements.metadata)).toMatchObject({
      planHorizon: 'six_month',
      horizonKey: 'six_month',
      planDurationKey: 'six_month',
    });
    expect(JSON.parse(capture.pdfUpdate.replacements.metadata)).toMatchObject({
      planHorizon: 'six_month',
      horizonKey: 'six_month',
      planDurationKey: 'six_month',
    });
  });

  it('defaults Swan Coach-created plans to trainer-led non-auto-deduct assignment semantics', async () => {
    const sequelize = makeFakeSequelize(capture);

    const result = await processAIDataUpdates(42, [{
      type: 'save_workout_plan',
      data: {
        title: 'Trainer-Led Strength Arc',
        durationWeeks: 26,
        nasmPhase: 2,
        planData: {
          weeks: [{
            weekNumber: 1,
            days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Split Squat' }] }],
          }],
        },
      },
    }], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(JSON.parse(capture.replacements.metadata)).toMatchObject({
      assignmentDefault: 'trainer_session',
      billingIntent: 'trainer_led_scheduled_flow',
      defaultShouldDeductSession: false,
    });
    expect(JSON.parse(capture.replacements.planData)).toMatchObject({
      assignmentDefaults: {
        defaultAssignmentType: 'trainer_session',
        billingIntent: 'trainer_led_scheduled_flow',
        shouldDeductSession: false,
      },
    });
  });

  it('drops invalid AI-supplied NASM phases instead of persisting NaN', async () => {
    const sequelize = makeFakeSequelize(capture);

    const result = await processAIDataUpdates(42, [{
      type: 'save_workout_plan',
      data: {
        title: 'Invalid Phase Arc',
        durationWeeks: 4,
        nasmPhase: 'phase two',
        planData: {
          weeks: [{
            weekNumber: 1,
            days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Split Squat' }] }],
          }],
        },
      },
    }], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements.nasmPhase).toBeNull();
  });
  it('refuses AI-supplied auto-deduct defaults when saving a workout plan', async () => {
    const sequelize = makeFakeSequelize(capture);

    const result = await processAIDataUpdates(42, [{
      type: 'save_workout_plan',
      data: {
        title: 'Prompt Injected Deduction Arc',
        durationWeeks: 4,
        metadata: {
          defaultShouldDeductSession: true,
        },
        planData: {
          assignmentDefaults: {
            shouldDeductSession: true,
          },
          weeks: [{
            weekNumber: 1,
            days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Split Squat' }] }],
          }],
        },
      },
    }], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(JSON.parse(capture.replacements.metadata)).toMatchObject({
      defaultShouldDeductSession: false,
    });
    expect(JSON.parse(capture.replacements.planData)).toMatchObject({
      assignmentDefaults: {
        shouldDeductSession: false,
      },
    });
  });


  it('sanitizes contact details from AI-supplied planData before direct insert', async () => {
    const sequelize = makeFakeSequelize(capture);

    const result = await processAIDataUpdates(42, [{
      type: 'save_workout_plan',
      data: {
        title: 'Privacy Safe AI Arc',
        durationWeeks: 4,
        planData: {
          planSummary: {
            durationWeeks: 4,
            email: 'private@example.com',
            phoneNumber: '555-555-0199',
          },
          recommendations: ['Email private@example.com or call (555) 555-0199.'],
          weeks: [{
            weekNumber: 1,
            days: [{
              dayNumber: 1,
              exercises: [{ exerciseName: 'Split Squat', notes: 'Backup: 555-555-0199' }],
            }],
          }],
        },
      },
    }], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    const savedPlanData = JSON.parse(capture.replacements.planData);
    const serialized = JSON.stringify(savedPlanData);
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('555-555-0199');
    expect(serialized).not.toContain('(555) 555-0199');
    expect(serialized).toContain('[redacted]');
    expect(serialized).toContain('Split Squat');
  });
  it('sanitizes contact details from AI-supplied metadata before insert and PDF update', async () => {
    const sequelize = makeFakeSequelize(capture);

    const result = await processAIDataUpdates(42, [{
      type: 'save_workout_plan',
      data: {
        title: 'Privacy Safe Metadata Arc',
        durationWeeks: 4,
        metadata: {
          contactEmail: 'private@example.com',
          emergencyPhone: '555-555-0199',
          notes: 'Backup private@example.com or (555) 555-0199.',
        },
        planData: {
          weeks: [{
            weekNumber: 1,
            days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Split Squat' }] }],
          }],
        },
      },
    }], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    const insertedMetadata = JSON.stringify(JSON.parse(capture.replacements.metadata));
    const pdfUpdatedMetadata = JSON.stringify(JSON.parse(capture.pdfUpdate.replacements.metadata));
    for (const serialized of [insertedMetadata, pdfUpdatedMetadata]) {
      expect(serialized).not.toContain('private@example.com');
      expect(serialized).not.toContain('555-555-0199');
      expect(serialized).not.toContain('(555) 555-0199');
      expect(serialized).toContain('[redacted]');
      expect(serialized).toContain('swan_coach_planning');
    }
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
