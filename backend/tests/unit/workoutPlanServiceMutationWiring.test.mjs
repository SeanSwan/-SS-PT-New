/**
 * ============================================================================
 * FILE: workoutPlanServiceMutationWiring.test.mjs
 * PURPOSE: Lock service-level WorkoutPlan writers to the mutation boundary.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Proves backup generation/refresh and plan blending use
 * the canonical revision-aware creation and mutation operations.
 * HOW IT FITS IN THE APP: Service writer -> mutation boundary -> WorkoutPlan.
 * KEY DECISIONS: Promotion is excluded because its multi-row transition is the
 * next dedicated slice; these tests isolate creation and refresh behavior.
 * NASM PROTOCOL CONTEXT: Every newly prescribed plan starts at revision one and
 * regenerated backup prescriptions require optimistic concurrency.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => {
  const WorkoutPlan = {
    findOne: vi.fn(),
    findAll: vi.fn(),
    findByPk: vi.fn(),
  };
  return {
    WorkoutPlan,
    createWorkoutPlanRecord: vi.fn(),
    mutateWorkoutPlanRecord: vi.fn(),
    generatePlan: vi.fn(),
    transitionLifecycle: vi.fn(),
  };
});

vi.mock('../../database.mjs', () => ({
  default: { transaction: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getWorkoutPlan: () => fixtures.WorkoutPlan,
  getWorkoutSession: () => ({ count: vi.fn().mockResolvedValue(0) }),
}));

vi.mock('../../services/workoutBuilderService.mjs', () => ({
  generatePlan: (...args) => fixtures.generatePlan(...args),
}));

vi.mock('../../services/workoutPlanMutationService.mjs', () => ({
  createWorkoutPlanRecord: (...args) => fixtures.createWorkoutPlanRecord(...args),
  mutateWorkoutPlanRecord: (...args) => fixtures.mutateWorkoutPlanRecord(...args),
}));
vi.mock('../../services/workoutPlanLifecycleService.mjs', () => ({
  transitionWorkoutPlanLifecycle: (...args) => fixtures.transitionLifecycle(...args),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { generateBackupPlan } = await import('../../services/backupPlanService.mjs');
const { blendPlans } = await import('../../services/planBlendService.mjs');
const { persistWorkoutPlan } = await import('../../utils/workoutPlanPersistence.mjs');

const generatedPlan = () => ({
  weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, exercises: [] }] }],
  mesocycles: [],
  weeklySchedule: [],
  rationale: [],
  planSummary: { durationWeeks: 4, sessionsPerWeek: 3 },
  recommendations: [],
  swanCoachReadiness: { level: 'green' },
});

describe('service-level WorkoutPlan mutation wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixtures.generatePlan.mockResolvedValue(generatedPlan());
  });

  it('creates a new backup through the canonical create boundary', async () => {
    const created = { id: 'backup-new' };
    fixtures.WorkoutPlan.findOne.mockResolvedValue(null);
    fixtures.createWorkoutPlanRecord.mockResolvedValue(created);

    const result = await generateBackupPlan({ userId: 7, trainerId: 3 });

    expect(fixtures.createWorkoutPlanRecord).toHaveBeenCalledWith(expect.objectContaining({
      WorkoutPlan: fixtures.WorkoutPlan,
      values: expect.objectContaining({
        userId: 7,
        trainerId: 3,
        status: 'draft',
        planData: expect.objectContaining({ weeks: expect.any(Array) }),
      }),
    }));
    expect(result).toEqual({ backup: created, refreshed: false });
  });

  it('refreshes an existing backup with its expected revision', async () => {
    const existing = {
      id: 'backup-existing',
      contentRevision: 6,
      planData: generatedPlan(),
    };
    const refreshed = { ...existing, contentRevision: 7 };
    fixtures.WorkoutPlan.findOne.mockResolvedValue(existing);
    fixtures.mutateWorkoutPlanRecord.mockResolvedValue({ plan: refreshed });

    const result = await generateBackupPlan({ userId: 7, trainerId: 3 });

    expect(fixtures.mutateWorkoutPlanRecord).toHaveBeenCalledWith(expect.objectContaining({
      WorkoutPlan: fixtures.WorkoutPlan,
      planId: existing.id,
      expectedRevision: 6,
      updates: expect.objectContaining({
        status: 'draft',
        planData: expect.objectContaining({ weeks: expect.any(Array) }),
      }),
    }));
    expect(result).toEqual({ backup: refreshed, refreshed: true });
  });

  it('creates a blend through the canonical create boundary', async () => {
    const planA = {
      id: 'plan-a',
      userId: 7,
      planData: { weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, exercises: [] }] }] },
    };
    const planB = {
      id: 'plan-b',
      userId: 7,
      planData: { weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, exercises: [] }] }] },
    };
    const blended = { id: 'blend-1' };
    fixtures.WorkoutPlan.findByPk.mockImplementation(async (id) => (
      id === planA.id ? planA : planB
    ));
    fixtures.createWorkoutPlanRecord.mockResolvedValue(blended);

    const result = await blendPlans({
      trainerId: 3,
      planAId: planA.id,
      planBId: planB.id,
      picks: [{ source: 'A', weekNumber: 1 }],
      title: 'Combined Strength',
    });

    expect(fixtures.createWorkoutPlanRecord).toHaveBeenCalledWith(expect.objectContaining({
      WorkoutPlan: fixtures.WorkoutPlan,
      values: expect.objectContaining({
        userId: 7,
        trainerId: 3,
        title: 'Combined Strength',
        status: 'draft',
        planData: expect.objectContaining({ weeks: expect.any(Array) }),
      }),
    }));
    expect(result).toEqual({
      blended,
      sources: { planAId: planA.id, planBId: planB.id },
    });
  });
});

const persistenceFixture = () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const exercise = { id: 'exercise-1', name: 'Goblet Squat' };
  return {
    transaction,
    plan: {
      planName: 'Strength Base',
      durationWeeks: 4,
      days: [{
        dayNumber: 1,
        name: 'Day One',
        exercises: [{ name: exercise.name, setScheme: '3x10' }],
      }],
    },
    models: {
      WorkoutPlan: fixtures.WorkoutPlan,
      WorkoutPlanDay: {
        create: vi.fn().mockResolvedValue({ id: 'day-1' }),
      },
      WorkoutPlanDayExercise: {
        create: vi.fn().mockResolvedValue({ id: 'day-exercise-1' }),
      },
      Exercise: {
        findAll: vi.fn().mockResolvedValue([exercise]),
        findOne: vi.fn().mockResolvedValue(null),
      },
    },
  };
};

describe('AI persistence WorkoutPlan lifecycle wiring', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a draft parent then activates it through the audited boundary', async () => {
    const { transaction, plan, models } = persistenceFixture();
    const created = { id: '6ea7806d-36c8-4307-bd5d-6b04b68be849' };
    const activated = { ...created, status: 'active' };
    const sequelize = { query: vi.fn() };
    fixtures.createWorkoutPlanRecord.mockResolvedValue(created);
    fixtures.transitionLifecycle.mockResolvedValue({ plan: activated, lifecycleReceipts: [] });

    const result = await persistWorkoutPlan({
      plan,
      userId: 7,
      actorId: 3,
      sequelize,
      models,
      transaction,
    });

    const createInput = fixtures.createWorkoutPlanRecord.mock.calls[0][0];
    expect(createInput).toMatchObject({
      WorkoutPlan: fixtures.WorkoutPlan,
      transaction,
      values: expect.objectContaining({
        userId: 7,
        status: 'draft',
        planData: expect.objectContaining({ weeks: expect.any(Array) }),
      }),
    });
    expect(createInput.values.metadata).not.toHaveProperty('isPrimaryPlan');
    expect(createInput.values.metadata).not.toHaveProperty('primary');
    expect(fixtures.transitionLifecycle).toHaveBeenCalledWith(expect.objectContaining({
      sequelize,
      WorkoutPlan: fixtures.WorkoutPlan,
      transaction,
      planId: created.id,
      action: 'activate',
      actorId: 3,
      derivativeReason: 'ai_generated_plan_save',
    }));
    expect(result.workoutPlan).toBe(activated);
  });

  it('uses coach-approved derivative provenance without a second demotion path', async () => {
    const { transaction, plan, models } = persistenceFixture();
    const created = { id: 'b9e0e94c-a081-4556-a81b-35977cf177a2' };
    fixtures.createWorkoutPlanRecord.mockResolvedValue(created);
    fixtures.transitionLifecycle.mockResolvedValue({ plan: { ...created, status: 'active' } });

    await persistWorkoutPlan({
      plan,
      userId: 7,
      actorId: 3,
      sequelize: { query: vi.fn() },
      models,
      transaction,
      tags: ['ai_generated', 'coach_approved'],
    });

    expect(fixtures.transitionLifecycle).toHaveBeenCalledWith(expect.objectContaining({
      derivativeReason: 'coach_approved_plan_save',
    }));
    expect(fixtures.WorkoutPlan.findAll).not.toHaveBeenCalled();
    expect(fixtures.mutateWorkoutPlanRecord).not.toHaveBeenCalled();
  });
});