import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({ rows = [], recommendations = [] } = {}) {
  vi.resetModules();

  const findAllWorkoutSessions = vi.fn(async (options) => rows.slice(0, options.limit ?? rows.length));
  const getExerciseRecommendations = vi.fn(async () => recommendations);
  const WorkoutSession = { findAll: findAllWorkoutSessions };
  const WorkoutLog = {};

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ WorkoutSession, WorkoutLog }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    findAllWorkoutSessions,
    getExerciseRecommendations,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('legacy workout command selected-client scope', () => {
  it('prefers the selected client for workout history reads', async () => {
    const { dispatch, findAllWorkoutSessions } = await loadDispatcher({
      rows: [{ completedAt: new Date('2026-05-20T15:30:00.000Z'), logs: [] }],
    });

    await dispatch('view_workout_history', { clientId: 999, limit: 5 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(findAllWorkoutSessions).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42 },
      limit: 5,
    }));
  });

  it('prefers the selected client for workout statistics reads', async () => {
    const { dispatch, findAllWorkoutSessions } = await loadDispatcher({
      rows: [{
        completedAt: new Date('2026-05-20T15:30:00.000Z'),
        duration: 45,
        intensity: 7,
        logs: [{ exerciseName: 'Push-up', reps: 12 }],
      }],
    });

    await dispatch('view_workout_statistics', { clientId: 999 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(findAllWorkoutSessions).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, status: 'completed' },
      limit: 100,
    }));
  });

  it('prefers the selected client for exercise recommendations', async () => {
    const { dispatch, getExerciseRecommendations } = await loadDispatcher({
      recommendations: [{ name: 'Incline Push-up' }],
    });

    await dispatch('view_exercise_recommendations', {
      clientId: 999,
      goal: 'strength',
      limit: 3,
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(getExerciseRecommendations).toHaveBeenCalledWith(42, expect.objectContaining({
      goal: 'strength',
      limit: 3,
    }));
  });
});
