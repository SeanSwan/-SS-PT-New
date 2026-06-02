import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({
  questionnaire = null,
  baseline = null,
} = {}) {
  vi.resetModules();

  const createBaseline = vi.fn(async (payload) => ({ id: 'baseline-1', ...payload }));
  const findOneBaseline = vi.fn(async () => baseline);
  const ClientBaselineMeasurements = {
    create: createBaseline,
    findOne: findOneBaseline,
  };

  const findOneQuestionnaire = vi.fn(async () => questionnaire);
  const createQuestionnaire = vi.fn(async (payload) => ({ id: 'questionnaire-1', ...payload }));
  const ClientOnboardingQuestionnaire = {
    findOne: findOneQuestionnaire,
    create: createQuestionnaire,
  };

  const User = { findByPk: vi.fn(async () => null) };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ ClientBaselineMeasurements, ClientOnboardingQuestionnaire, User }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    createBaseline,
    findOneBaseline,
    findOneQuestionnaire,
    createQuestionnaire,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('legacy onboarding command selected-client scope', () => {
  const ctx = {
    user: { id: 7, role: 'trainer' },
    resolvedClient: { id: 42 },
  };

  it('prefers the selected client for baseline measurement creation', async () => {
    const { dispatch, createBaseline } = await loadDispatcher();

    const result = await dispatch('fill_baseline_measurements', {
      clientId: 999,
      bodyWeight: 185,
    }, ctx);

    expect(createBaseline).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      recordedBy: 7,
      bodyWeight: 185,
    }));
    expect(result.clientId).toBe(42);
  });

  it('prefers the selected client for onboarding status reads', async () => {
    const { dispatch, findOneQuestionnaire, findOneBaseline } = await loadDispatcher();

    const result = await dispatch('view_onboarding_status', { clientId: 999 }, ctx);

    expect(findOneQuestionnaire).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42 },
    }));
    expect(findOneBaseline).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42 },
    }));
    expect(result.clientId).toBe(42);
  });

  it('prefers the selected client when starting onboarding', async () => {
    const { dispatch, findOneQuestionnaire, createQuestionnaire } = await loadDispatcher();

    const result = await dispatch('start_onboarding', { clientId: 999 }, ctx);

    expect(findOneQuestionnaire).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42 },
    }));
    expect(createQuestionnaire).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      createdBy: 7,
    }));
    expect(result.clientId).toBe(42);
  });

  it('prefers the selected client when submitting onboarding', async () => {
    const { dispatch, findOneQuestionnaire } = await loadDispatcher();

    const result = await dispatch('submit_onboarding', { clientId: 999 }, ctx);

    expect(findOneQuestionnaire).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42 },
    }));
    expect(result).toMatchObject({
      clientId: 42,
      submitted: false,
      reason: 'no_questionnaire',
    });
  });
});
