/**
 * Workout plan command dispatcher contracts
 * =========================================
 * Locks destructive workout-plan commands to route-matched soft-archive behavior.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const workoutPlanId = '33333333-3333-4333-8333-333333333333';

async function loadDispatcher({ plan = null } = {}) {
  vi.resetModules();

  const planRow = plan
    ? {
        ...plan,
        update: plan.update || vi.fn(async (payload) => ({ ...plan, ...payload })),
      }
    : null;

  const WorkoutPlan = {
    findByPk: vi.fn(async () => planRow),
  };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ WorkoutPlan }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return { ...dispatcher, WorkoutPlan, planRow };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('workout plan command dispatchers', () => {
  it('archives workout plans by status instead of hard-deleting them', async () => {
    const { dispatch, hasDispatcher, WorkoutPlan, planRow } = await loadDispatcher({
      plan: {
        id: workoutPlanId,
        userId: 42,
        trainerId: 7,
        title: 'Do Not Return',
        description: 'Private plan details',
        status: 'active',
      },
    });

    expect(hasDispatcher('delete_workout_plan')).toBe(true);

    const result = await dispatch('delete_workout_plan', { planId: workoutPlanId }, {
      user: { id: 1, role: 'admin', email: 'admin@example.com' },
    });

    expect(WorkoutPlan.findByPk).toHaveBeenCalledWith(workoutPlanId);
    expect(planRow.update).toHaveBeenCalledWith({ status: 'completed' });
    expect(result).toEqual({
      planId: workoutPlanId,
      planFound: true,
      archived: true,
      previousStatus: 'active',
      status: 'completed',
      clientId: 42,
      trainerId: 7,
    });
    expect(JSON.stringify(result)).not.toContain('Do Not Return');
    expect(JSON.stringify(result)).not.toContain('Private plan details');
    expect(JSON.stringify(result)).not.toContain('admin@example.com');
  });
});
