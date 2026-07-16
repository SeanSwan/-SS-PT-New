/**
 * ============================================================================
 * FILE: workoutPlanMutationService.test.mjs
 * PURPOSE: Lock the single transactional boundary for WorkoutPlan mutations.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Proves creation identity, row locking, optimistic
 * concurrency, progress-only stability, lazy backfill, and reserved-field guards.
 * HOW IT FITS IN THE APP: Active plan writers -> mutation service -> WorkoutPlan.
 * KEY DECISIONS: All tests use injected model/transaction doubles so the domain
 * contract is exercised without a live database or hidden global state.
 * NASM PROTOCOL CONTEXT: Every prescribed program change receives a durable
 * revision while completion evidence leaves the prescription identity intact.
 */

import { describe, expect, it, vi } from 'vitest';
import { hashWorkoutPlanContent } from '../services/workoutPlanRevisionService.mjs';

const loadMutationService = async () => {
  try {
    return await import('../services/workoutPlanMutationService.mjs');
  } catch (error) {
    if (
      error?.code === 'ERR_MODULE_NOT_FOUND'
      && String(error.message).includes('workoutPlanMutationService.mjs')
    ) {
      return null;
    }
    throw error;
  }
};

const basePlanData = () => ({
  weeks: [{
    weekNumber: 1,
    days: [{
      dayNumber: 1,
      exercises: [{ exerciseName: 'Goblet Squat', sets: 3, reps: '8-12' }],
    }],
  }],
});

const transactionFixture = () => ({ LOCK: { UPDATE: 'UPDATE' } });

const sequelizeFixture = () => {
  const transaction = transactionFixture();
  return {
    transaction,
    sequelize: {
      transaction: vi.fn(async (callback) => callback(transaction)),
    },
  };
};

const planFixture = ({
  id = 'plan-1',
  revision = 4,
  planData = basePlanData(),
  hash = hashWorkoutPlanContent(planData),
} = {}) => {
  const plan = {
    id,
    userId: 42,
    planData,
    contentRevision: revision,
    contentHash: hash,
  };
  plan.update = vi.fn(async (updates) => {
    Object.assign(plan, updates);
    return plan;
  });
  return plan;
};

// SECTION: Transactional creation and mutation contract
// PURPOSE: Prove every writer receives one identity/locking implementation.
// WHY: Direct ORM writes would reintroduce revision drift and lost updates.
describe('workoutPlanMutationService', () => {
  it('exports the canonical mutation boundary', async () => {
    const service = await loadMutationService();

    expect(service).not.toBeNull();
    expect(service).toMatchObject({
      createWorkoutPlanRecord: expect.any(Function),
      mutateWorkoutPlanRecord: expect.any(Function),
      WorkoutPlanMutationError: expect.any(Function),
    });
  });

  it('requires the model capability used by each operation', async () => {
    const service = await loadMutationService();
    expect(service).not.toBeNull();
    const createHarness = sequelizeFixture();
    const mutateHarness = sequelizeFixture();

    await expect(service.createWorkoutPlanRecord({
      sequelize: createHarness.sequelize,
      WorkoutPlan: { findByPk: vi.fn() },
      values: { title: 'Missing create', planData: {} },
    })).rejects.toMatchObject({
      code: 'WORKOUT_PLAN_MODEL_UNAVAILABLE',
      statusCode: 500,
    });
    expect(createHarness.sequelize.transaction).not.toHaveBeenCalled();

    await expect(service.mutateWorkoutPlanRecord({
      sequelize: mutateHarness.sequelize,
      WorkoutPlan: { create: vi.fn() },
      planId: 'plan-1',
      updates: { status: 'paused' },
    })).rejects.toMatchObject({
      code: 'WORKOUT_PLAN_MODEL_UNAVAILABLE',
      statusCode: 500,
    });
    expect(mutateHarness.sequelize.transaction).not.toHaveBeenCalled();
  });

  it('creates revision one with a deterministic hash inside a transaction', async () => {
    const service = await loadMutationService();
    expect(service).not.toBeNull();
    const { sequelize, transaction } = sequelizeFixture();
    const created = { id: 'new-plan' };
    const WorkoutPlan = { create: vi.fn().mockResolvedValue(created) };
    const planData = basePlanData();

    const result = await service.createWorkoutPlanRecord({
      sequelize,
      WorkoutPlan,
      values: { userId: 42, title: 'Strength Base', planData },
    });

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(WorkoutPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        planData,
        contentRevision: 1,
        contentHash: hashWorkoutPlanContent(planData),
      }),
      { transaction },
    );
    expect(result).toBe(created);
  });

  it('locks the current row and increments a material prescription change', async () => {
    const service = await loadMutationService();
    expect(service).not.toBeNull();
    const { sequelize, transaction } = sequelizeFixture();
    const plan = planFixture();
    const changedPlanData = basePlanData();
    changedPlanData.weeks[0].days[0].exercises[0].sets = 4;
    const WorkoutPlan = { findByPk: vi.fn().mockResolvedValue(plan) };

    const result = await service.mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan,
      planId: plan.id,
      expectedRevision: 4,
      updates: { planData: changedPlanData },
    });

    expect(WorkoutPlan.findByPk).toHaveBeenCalledWith(plan.id, {
      transaction,
      lock: 'UPDATE',
    });
    expect(plan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        planData: changedPlanData,
        contentRevision: 5,
        contentHash: hashWorkoutPlanContent(changedPlanData),
      }),
      { transaction },
    );
    expect(result).toMatchObject({ plan, contentChanged: true, contentRevision: 5 });
  });

  it('keeps the revision stable for completion/cursor evidence', async () => {
    const service = await loadMutationService();
    expect(service).not.toBeNull();
    const { sequelize } = sequelizeFixture();
    const plan = planFixture();
    const progressed = structuredClone(plan.planData);
    Object.assign(progressed.weeks[0].days[0], {
      completed: true,
      completedAt: '2026-07-15T20:00:00.000Z',
      trainerNotes: 'Controlled tempo',
    });
    const WorkoutPlan = { findByPk: vi.fn().mockResolvedValue(plan) };

    const result = await service.mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan,
      planId: plan.id,
      updates: { planData: progressed, currentWeek: 1, currentDay: 1 },
    });

    expect(plan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        contentRevision: 4,
        contentHash: plan.contentHash,
      }),
      expect.any(Object),
    );
    expect(result).toMatchObject({ contentChanged: false, contentRevision: 4 });
  });

  it('rejects a stale material write before calling update', async () => {
    const service = await loadMutationService();
    expect(service).not.toBeNull();
    const { sequelize } = sequelizeFixture();
    const plan = planFixture();
    const changedPlanData = basePlanData();
    changedPlanData.weeks[0].days[0].exercises[0].reps = '12-15';
    const WorkoutPlan = { findByPk: vi.fn().mockResolvedValue(plan) };

    await expect(service.mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan,
      planId: plan.id,
      expectedRevision: 3,
      updates: { planData: changedPlanData },
    })).rejects.toMatchObject({
      code: 'WORKOUT_PLAN_REVISION_CONFLICT',
      statusCode: 409,
      currentRevision: 4,
    });
    expect(plan.update).not.toHaveBeenCalled();
  });

  it('lazily initializes identity without incrementing a legacy row', async () => {
    const service = await loadMutationService();
    expect(service).not.toBeNull();
    const { sequelize } = sequelizeFixture();
    const plan = planFixture({ revision: null, hash: null });
    const WorkoutPlan = { findByPk: vi.fn().mockResolvedValue(plan) };

    const result = await service.mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan,
      planId: plan.id,
      updates: { metadata: { source: 'legacy-backfill' } },
    });

    expect(plan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        contentRevision: 1,
        contentHash: hashWorkoutPlanContent(plan.planData),
      }),
      expect.any(Object),
    );
    expect(result).toMatchObject({ contentRevision: 1 });
  });

  it('uses a caller transaction without nesting another transaction', async () => {
    const service = await loadMutationService();
    expect(service).not.toBeNull();
    const { sequelize } = sequelizeFixture();
    const transaction = transactionFixture();
    const plan = planFixture();
    const WorkoutPlan = { findByPk: vi.fn().mockResolvedValue(plan) };

    await service.mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan,
      transaction,
      planId: plan.id,
      updates: { status: 'paused' },
    });

    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(WorkoutPlan.findByPk).toHaveBeenCalledWith(plan.id, {
      transaction,
      lock: 'UPDATE',
    });
  });

  it('rejects ownership and identity fields at the boundary', async () => {
    const service = await loadMutationService();
    expect(service).not.toBeNull();
    const { sequelize } = sequelizeFixture();
    const plan = planFixture();
    const WorkoutPlan = { findByPk: vi.fn().mockResolvedValue(plan) };

    await expect(service.mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan,
      planId: plan.id,
      updates: { userId: 99, contentRevision: 500 },
    })).rejects.toMatchObject({
      code: 'WORKOUT_PLAN_RESERVED_FIELD',
      statusCode: 400,
    });
    expect(plan.update).not.toHaveBeenCalled();
  });

  it('fails closed when the locked row is not updatable', async () => {
    const service = await loadMutationService();
    expect(service).not.toBeNull();
    const { sequelize } = sequelizeFixture();
    const lockedRow = {
      id: 'plan-1',
      planData: basePlanData(),
      contentRevision: 1,
      contentHash: hashWorkoutPlanContent(basePlanData()),
    };
    const WorkoutPlan = { findByPk: vi.fn().mockResolvedValue(lockedRow) };

    await expect(service.mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan,
      planId: lockedRow.id,
      updates: { status: 'paused' },
    })).rejects.toMatchObject({
      code: 'WORKOUT_PLAN_MODEL_UNAVAILABLE',
      statusCode: 500,
    });
  });

  it('returns a typed not-found error from the locked lookup', async () => {
    const service = await loadMutationService();
    expect(service).not.toBeNull();
    const { sequelize } = sequelizeFixture();
    const WorkoutPlan = { findByPk: vi.fn().mockResolvedValue(null) };

    await expect(service.mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan,
      planId: 'missing-plan',
      updates: { status: 'paused' },
    })).rejects.toMatchObject({
      code: 'WORKOUT_PLAN_NOT_FOUND',
      statusCode: 404,
    });
  });
});
