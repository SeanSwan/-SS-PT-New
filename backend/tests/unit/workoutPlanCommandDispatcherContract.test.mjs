/**
 * ============================================================================
 * FILE: workoutPlanCommandDispatcherContract.test.mjs
 * PURPOSE: Lock Swan Coach archive commands to the audited lifecycle boundary.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const workoutPlanId = '33333333-3333-4333-8333-333333333333';

async function loadDispatcher({ plan = null } = {}) {
  vi.resetModules();
  const planRow = plan ? { ...plan, update: vi.fn() } : null;
  // `findByPk` is here because the archive dispatcher now loads the plan to authorize the
  // caller against its owner before reaching the lifecycle service — see
  // tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs. The actor in these cases is
  // an admin, so the check passes on role; the lookup still has to return a row.
  const WorkoutPlan = { modelName: 'WorkoutPlan', findByPk: vi.fn(async () => planRow) };
  const transitionWorkoutPlanLifecycle = vi.fn(async ({ action, actorId }) => ({
    plan: { ...planRow, status: 'archived' },
    lifecycleReceipt: {
      id: 'lifecycle-receipt-1',
      fromStatus: planRow?.status || null,
      toStatus: 'archived',
      action,
      actorId,
    },
  }));

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ WorkoutPlan }),
  }));
  vi.doMock('../../services/workoutPlanLifecycleService.mjs', () => ({
    transitionWorkoutPlanLifecycle,
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return { ...dispatcher, WorkoutPlan, planRow, transitionWorkoutPlanLifecycle };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('workout plan command dispatchers', () => {
  it('archives through the canonical lifecycle service without leaking plan content', async () => {
    const loaded = await loadDispatcher({
      plan: {
        id: workoutPlanId,
        userId: 42,
        trainerId: 7,
        title: 'Do Not Return',
        description: 'Private plan details',
        status: 'active',
      },
    });

    expect(loaded.hasDispatcher('delete_workout_plan')).toBe(true);
    const result = await loaded.dispatch('delete_workout_plan', { planId: workoutPlanId }, {
      user: { id: 1, role: 'admin', email: 'admin@example.com' },
    });

    expect(loaded.transitionWorkoutPlanLifecycle).toHaveBeenCalledWith(expect.objectContaining({
      WorkoutPlan: loaded.WorkoutPlan,
      planId: workoutPlanId,
      action: 'archive',
      actorId: 1,
    }));
    expect(loaded.planRow.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      planId: workoutPlanId,
      planFound: true,
      archived: true,
      previousStatus: 'active',
      status: 'archived',
      lifecycleReceiptId: 'lifecycle-receipt-1',
      clientId: 42,
      trainerId: 7,
    });
    expect(JSON.stringify(result)).not.toContain('Do Not Return');
    expect(JSON.stringify(result)).not.toContain('Private plan details');
    expect(JSON.stringify(result)).not.toContain('admin@example.com');
  });
});