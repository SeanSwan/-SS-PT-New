import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({ rows = [], recommendations = [] } = {}) {
  vi.resetModules();

  const findAllWorkoutSessions = vi.fn(async (options) => rows.slice(0, options.limit ?? rows.length));
  const getExerciseRecommendations = vi.fn(async () => recommendations);
  const submitAiWorkoutLogAsDailyForm = vi.fn(async () => ({
    formId: 'form-1',
    workoutId: 'session-1',
  }));
  const WorkoutSession = { findAll: findAllWorkoutSessions };
  const WorkoutLog = {};

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ WorkoutSession, WorkoutLog }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations },
  }));
  vi.doMock('../../services/workout/aiWorkoutDailyFormService.mjs', () => ({
    submitAiWorkoutLogAsDailyForm,
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    findAllWorkoutSessions,
    getExerciseRecommendations,
    submitAiWorkoutLogAsDailyForm,
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

  it('prefers the selected client for workout log writes', async () => {
    const { dispatch, submitAiWorkoutLogAsDailyForm } = await loadDispatcher();

    await dispatch('log_workout', {
      clientId: 999,
      date: '2026-05-20',
      scheduledSessionId: 777,
      exercises: [{ name: 'Push-up', sets: 1, reps: 10 }],
      plannedAssignment: {
        assignmentKey: 'plan-6m:w4:d2:homework',
        planId: 'plan-6m',
        assignmentType: 'homework',
        source: 'workout_plan',
        isBillable: false,
        shouldDeductSession: false,
        weekNumber: 4,
        dayNumber: 2,
      },
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
      options: { sequelize: { transaction: async () => ({}) } },
    });

    expect(submitAiWorkoutLogAsDailyForm).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 42,
      trainerId: 7,
      date: '2026-05-20',
      scheduledSessionId: 777,
      plannedAssignment: expect.objectContaining({
        assignmentKey: 'plan-6m:w4:d2:homework',
      }),
    }));
  });
});
