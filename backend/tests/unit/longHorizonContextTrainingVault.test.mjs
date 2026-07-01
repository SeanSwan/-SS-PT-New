/**
 * longHorizonContextTrainingVault
 * ===============================
 *
 * Regression lock for Swan Coach long-horizon planning context. Long-horizon
 * drafts must see the same de-identified plan-vault/current-assignment summary
 * that single-workout Swan Coach planning uses, otherwise the AI can propose a
 * multi-month arc without knowing an active plan already exists.
 */
import { describe, expect, it, vi } from 'vitest';
import { buildLongHorizonContext } from '../../services/ai/longHorizonContextBuilder.mjs';
import { buildLongHorizonPrompt } from '../../services/ai/longHorizonPromptBuilder.mjs';

const emptyFindAll = () => vi.fn().mockResolvedValue([]);
const emptyFindOne = () => vi.fn().mockResolvedValue(null);

function makeModels() {
  return {
    WorkoutSession: { findAll: emptyFindAll() },
    WorkoutLog: {},
    ClientBaselineMeasurements: { findOne: emptyFindOne() },
    Goal: { findAll: emptyFindAll() },
    BodyMeasurement: { findAll: emptyFindAll() },
    MovementProfile: { findOne: emptyFindOne() },
    WorkoutPlan: { findAll: emptyFindAll() },
    DailyWorkoutForm: { findAll: emptyFindAll() },
    LongTermProgramPlan: { findOne: emptyFindOne() },
  };
}

describe('long-horizon Swan Coach plan-vault context', () => {
  it('includes de-identified training vault and active-program context', async () => {
    const models = makeModels();
    models.LongTermProgramPlan.findOne.mockResolvedValue({
      id: 'program-42',
      horizonMonths: 6,
      goalProfile: { primaryGoal: 'strength' },
      status: 'active',
      sourceType: 'ai_assisted',
      planName: 'Jane Doe Strength Plan',
      summary: 'Reach Jane at jane@example.test',
    });

    const context = await buildLongHorizonContext(42, 9, models);

    expect(models.WorkoutPlan.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 42 }),
      limit: 14,
    }));
    expect(models.LongTermProgramPlan.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, status: 'active' },
    }));
    expect(models.LongTermProgramPlan.findOne).not.toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ clientId: 42 }),
    }));
    expect(context.activeProgram).toEqual(expect.objectContaining({
      id: 'program-42',
      horizonMonths: 6,
      goalProfile: { primaryGoal: 'strength' },
      status: 'active',
      sourceType: 'ai_assisted',
    }));
    expect(context.activeProgram).not.toHaveProperty('planName');
    expect(context.activeProgram).not.toHaveProperty('summary');
    expect(context.trainingVault).toEqual(expect.objectContaining({
      available: false,
      defaultHorizonKey: 'six_month',
      filledHorizonKeys: [],
      slots: expect.any(Array),
      todayAssignment: expect.objectContaining({
        assignmentType: 'none',
        isLoggable: false,
      }),
    }));
  });

  it('includes safe plan-vault and today-assignment signals in the long-horizon prompt', () => {
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: { client: { alias: 'Client #42' } },
      horizonMonths: 9,
      longHorizonContext: {
        progressSummary: { recentSessionCount: 2, avgSessionsPerWeek: 1 },
        trainingVault: {
          available: true,
          primaryHorizonKey: 'six_month',
          filledHorizonKeys: ['one_day', 'six_month'],
          todayAssignment: {
            assignmentType: 'homework',
            status: 'available',
            isLoggable: true,
            isBillable: false,
            shouldDeductSession: false,
            weekNumber: 2,
            dayNumber: 3,
            exerciseCount: 4,
            firstExerciseName: 'Goblet Squat',
          },
        },
        activeProgram: {
          id: 'program-42',
          horizonMonths: 6,
          goalProfile: { primaryGoal: 'strength' },
          status: 'active',
          sourceType: 'ai_assisted',
          planName: 'Jane Doe Strength Plan',
          summary: 'Reach Jane at jane@example.test',
        },
      },
    });

    expect(prompt).toContain('--- Active Program Context (de-identified) ---');
    expect(prompt).toContain('Active program: 6-month ai_assisted plan; status active');
    expect(prompt).toContain('Primary program goal: strength');
    expect(prompt).toContain('--- Plan Vault / Current Assignment (de-identified) ---');
    expect(prompt).toContain('Filled horizons: one_day, six_month');
    expect(prompt).toContain('Primary horizon: six_month');
    expect(prompt).toContain('Today assignment: homework');
    expect(prompt).toContain('deduct paid session: no');
    expect(prompt).toContain('first exercise Goblet Squat');
    expect(prompt).not.toMatch(/Jane|Doe|example\.test/i);
  });
});
