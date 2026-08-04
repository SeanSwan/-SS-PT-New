/**
 * Goal command dispatcher contracts
 * =================================
 * Ensures Coach goal commands read and write real Goal rows for the selected
 * client while returning compact, non-free-text receipts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({ goals = [], createdGoal = null, foundGoal = null } = {}) {
  vi.resetModules();

  const findAll = vi.fn(async () => goals);
  const create = vi.fn(async (payload) => createdGoal || { id: 'goal-new', ...payload });
  const save = vi.fn(async () => foundGoal);
  const set = vi.fn((updates) => Object.assign(foundGoal, updates));
  const findOne = vi.fn(async () => foundGoal ? { ...foundGoal, set, save } : null);
  const Goal = { findAll, create, findOne };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ Goal }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return { ...dispatcher, Goal, findAll, create, findOne, set, save };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('goal command dispatchers', () => {
  it('summarizes selected-client goals without echoing private goal text', async () => {
    const { dispatch, hasDispatcher, findAll } = await loadDispatcher({
      goals: [
        {
          id: 'goal-1',
          userId: 42,
          title: 'Private goal text',
          status: 'active',
          progressPercentage: 40,
          // Relative, not a literal. This was '2026-07-01T00:00:00.000Z' while the test asserts
          // overdueGoals: 0 — so it passed until that date arrived and has failed every run since.
          // It was red for five weeks before anyone looked, because nothing runs the suite.
          // The intent is "an active goal whose deadline has NOT passed is not overdue"; a
          // hardcoded future date only expresses that until it becomes a past one.
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'goal-2',
          userId: 42,
          title: 'Another private goal',
          status: 'completed',
          progressPercentage: 100,
        },
      ],
    });

    expect(hasDispatcher('view_goals')).toBe(true);

    const result = await dispatch('view_goals', { clientId: 42 }, {
      user: { id: 1, role: 'admin' },
    });

    expect(findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 42 }),
      order: [['updatedAt', 'DESC']],
      limit: 100,
    }));
    expect(result).toEqual({
      clientId: 42,
      totalGoals: 2,
      activeGoals: 1,
      completedGoals: 1,
      overdueGoals: 0,
      averageProgress: 70,
      firstGoalId: 'goal-1',
    });
    expect(JSON.stringify(result)).not.toContain('Private goal text');
  });

  it('creates goals with model-required target fields and PII-safe receipts', async () => {
    const { dispatch, hasDispatcher, create } = await loadDispatcher({
      createdGoal: { id: 'goal-new', progressPercentage: 20, status: 'active' },
    });

    expect(hasDispatcher('create_goal')).toBe(true);

    const result = await dispatch('create_goal', {
      clientId: 42,
      title: 'Pushup volume',
      targetValue: 50,
      currentValue: 10,
      unit: 'reps',
      category: 'strength',
      priority: 'high',
      deadline: '2026-07-01T00:00:00.000Z',
      notes: 'Private note',
    }, {
      user: { id: 1, role: 'admin' },
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      title: 'Pushup volume',
      targetValue: 50,
      currentValue: 10,
      unit: 'reps',
      category: 'strength',
      priority: 'high',
      status: 'active',
      progressPercentage: 20,
    }));
    expect(result).toEqual({
      clientId: 42,
      goalId: 'goal-new',
      created: true,
      status: 'active',
      progressPercentage: 20,
    });
    expect(JSON.stringify(result)).not.toContain('Pushup volume');
    expect(JSON.stringify(result)).not.toContain('Private note');
  });

  it('creates selected-client goals even when params contain stale client identity', async () => {
    const { dispatch, create } = await loadDispatcher({
      createdGoal: { id: 'goal-selected', progressPercentage: 20, status: 'active' },
    });

    const result = await dispatch('create_goal', {
      clientId: 999,
      title: 'Selected client pushups',
      targetValue: 50,
      currentValue: 10,
      unit: 'reps',
      deadline: '2026-07-01T00:00:00.000Z',
    }, {
      user: { id: 1, role: 'admin' },
      resolvedClient: { id: 42 },
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ userId: 42 }));
    expect(result).toMatchObject({ clientId: 42, goalId: 'goal-selected' });
  });

  it('updates progress percentage by deriving currentValue from the existing target', async () => {
    const goal = {
      id: 'goal-1',
      userId: 42,
      targetValue: 50,
      currentValue: 10,
      status: 'active',
      progressHistory: [{ value: 10, percentage: 20 }],
    };
    const { dispatch, hasDispatcher, findOne, set, save } = await loadDispatcher({ foundGoal: goal });

    expect(hasDispatcher('update_goal_progress')).toBe(true);

    const result = await dispatch('update_goal_progress', {
      clientId: 42,
      goalId: 'goal-1',
      progress: 60,
      notes: 'Private progress note',
    }, {
      user: { id: 1, role: 'admin' },
    });

    expect(findOne).toHaveBeenCalledWith({
      where: { userId: 42, id: 'goal-1' },
    });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      currentValue: 30,
      progressPercentage: 60,
      status: 'active',
    }));
    expect(save).toHaveBeenCalled();
    expect(result).toEqual({
      clientId: 42,
      goalId: 'goal-1',
      found: true,
      updated: true,
      progressPercentage: 60,
      status: 'active',
    });
    expect(JSON.stringify(result)).not.toContain('Private progress note');
  });
});
