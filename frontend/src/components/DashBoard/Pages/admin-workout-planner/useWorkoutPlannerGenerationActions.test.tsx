import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkoutPlannerGenerationActions } from './useWorkoutPlannerGenerationActions';
import type { GeneratedPlan } from './WorkoutPlannerTypes';

const generatedPlan: GeneratedPlan = {
  clientId: 91,
  clientName: 'Client 91',
  planningSystem: 'swan_coach_planning',
  swanCoachPlanning: {
    createdBy: 'swan_coach_planning',
    identityMode: 'client_id_only',
    horizonWeeks: 4,
    sessionsPerWeek: 3,
    primaryGoal: 'general_fitness',
    nasmPhase: 2,
    planInputsUsed: { goals: true },
    dataCategoriesUsed: ['goals'],
    missingDataCategories: [],
    rules: ['Use Client # only'],
  },
  planSummary: {
    durationWeeks: 4,
    sessionsPerWeek: 3,
    totalSessions: 12,
    primaryGoal: 'general_fitness',
    startingPhase: 2,
  },
  mesocycles: [],
  weeklySchedule: [],
  recommendations: [],
  weeks: [],
};

const generatedPlanWithSafetyWarning: GeneratedPlan = {
  ...generatedPlan,
  recommendations: ['Pain/injury data could not be loaded. Review this plan carefully before assigning.'],
  recommendationDetails: [{
    type: 'safety_warning',
    text: 'Pain/injury data could not be loaded. Review this plan carefully before assigning.',
    sourceCitation: 'context.criticalFailures',
  }],
};

const renderGenerationHook = (overrides: Record<string, unknown> = {}) => {
  const authAxios = {
    post: vi.fn().mockResolvedValue({ data: { success: true, plan: generatedPlan } }),
  };
  const setters = {
    setPlanExercises: vi.fn(),
    setGeneratedPlan: vi.fn(),
    setPhaseNumber: vi.fn(),
    setStatusMsg: vi.fn(),
    resetLoadedPlanState: vi.fn(),
  };

  const hook = renderHook(() => useWorkoutPlannerGenerationActions({
    authAxios,
    category: 'full_body',
    goal: 'general_fitness',
    phaseNumber: 2,
    planDuration: '4',
    sessionsPerWeek: 3,
    selectedEquipmentProfileId: null,
    ...setters,
    ...overrides,
  } as Parameters<typeof useWorkoutPlannerGenerationActions>[0]));

  return { hook, authAxios, setters };
};

describe('useWorkoutPlannerGenerationActions', () => {
  it('rejects generic single-workout generation responses that are not Swan Coach Planning', async () => {
    const authAxios = {
      post: vi.fn().mockResolvedValue({
        data: {
          success: true,
          workout: {
            clientId: 91,
            trainerId: 7,
            clientName: 'Client 91',
            sessionType: 'build',
            category: 'full_body',
            nasmPhase: 2,
            phaseParams: { name: 'Strength', focus: 'Base', intensity: '70%', tempo: '2-0-2' },
            warmup: [],
            exercises: [],
            swapSuggestions: [],
            cooldown: [],
            explanations: [],
          },
        },
      }),
    };
    const { hook, setters } = renderGenerationHook({ authAxios, planDuration: 'single' });

    await act(async () => {
      await hook.result.current.handleSwanCoachWorkoutGenerate(91);
    });

    expect(setters.setPlanExercises).not.toHaveBeenCalled();
    expect(setters.resetLoadedPlanState).not.toHaveBeenCalled();
    expect(setters.setStatusMsg).toHaveBeenLastCalledWith({
      type: 'error',
      text: 'Swan Coach Planning did not verify this workout. Regenerate before assigning.',
    });
  });

  it('rejects generic long-plan generation responses that are not Swan Coach Planning', async () => {
    const genericPlan = {
      ...generatedPlan,
      planningSystem: 'legacy_builder',
      swanCoachPlanning: null,
    };
    const authAxios = {
      post: vi.fn().mockResolvedValue({ data: { success: true, plan: genericPlan } }),
    };
    const { hook, setters } = renderGenerationHook({ authAxios });

    await act(async () => {
      await hook.result.current.handleGeneratePlan(91);
    });

    expect(setters.setGeneratedPlan).toHaveBeenNthCalledWith(1, null);
    expect(setters.setGeneratedPlan).toHaveBeenCalledTimes(1);
    expect(setters.setStatusMsg).toHaveBeenLastCalledWith({
      type: 'error',
      text: 'Swan Coach Planning did not verify this plan. Regenerate before saving.',
    });
  });

  it('clears stale loaded-plan state before generating a long-horizon plan', async () => {
    const { hook, setters } = renderGenerationHook();

    await act(async () => {
      await hook.result.current.handleGeneratePlan(91);
    });

    expect(setters.setGeneratedPlan).toHaveBeenNthCalledWith(1, null);
    expect(setters.setPlanExercises).toHaveBeenCalledWith([]);
    expect(setters.resetLoadedPlanState).toHaveBeenCalledTimes(1);
    expect(setters.setGeneratedPlan).toHaveBeenLastCalledWith(generatedPlan);
  });

  it('does not clear loaded-plan state when long-plan generation is not available', async () => {
    const { hook, setters, authAxios } = renderGenerationHook({ planDuration: 'single' });

    await act(async () => {
      await hook.result.current.handleGeneratePlan(91);
    });

    expect(authAxios.post).not.toHaveBeenCalled();
    expect(setters.setPlanExercises).not.toHaveBeenCalled();
    expect(setters.resetLoadedPlanState).not.toHaveBeenCalled();
  });

  it('marks long-horizon plans as degraded when generation returns a safety warning', async () => {
    const authAxios = {
      post: vi.fn().mockResolvedValue({ data: { success: true, plan: generatedPlanWithSafetyWarning } }),
    };
    const { hook, setters } = renderGenerationHook({ authAxios });

    await act(async () => {
      await hook.result.current.handleGeneratePlan(91);
    });

    expect(hook.result.current.degradedIntelligence).toBe(true);
    expect(setters.setGeneratedPlan).toHaveBeenLastCalledWith(generatedPlanWithSafetyWarning);
    expect(setters.setStatusMsg).toHaveBeenLastCalledWith({
      type: 'error',
      text: 'Pain/injury data could not be loaded. Review this plan carefully before assigning.',
    });
  });

  it('sends the selected SwanStudios horizon and equipment profile in long-horizon generation', async () => {
    const { hook, authAxios } = renderGenerationHook({
      planDuration: '26',
      selectedEquipmentProfileId: 77,
    });

    await act(async () => {
      await hook.result.current.handleGeneratePlan(91);
    });

    expect(authAxios.post).toHaveBeenCalledWith('/api/workout-builder/plan', expect.objectContaining({
      clientId: 91,
      durationWeeks: 26,
      equipmentProfileId: 77,
    }));
  });
});
