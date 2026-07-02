import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkoutPlannerLoadPlanActions } from './useWorkoutPlannerLoadPlanActions';

const baseSetters = () => ({
  buildGeneratedSnapshot: vi.fn(() => 'generated-snapshot'),
  buildManualSnapshot: vi.fn(() => 'manual-snapshot'),
  setPlanExercises: vi.fn(),
  setGeneratedPlan: vi.fn(),
  setPhaseNumber: vi.fn(),
  setGoal: vi.fn(),
  setCategory: vi.fn(),
  setLoadedPlanId: vi.fn(),
  setLoadedPlanName: vi.fn(),
  setSavedSnapshot: vi.fn(),
  setStatusMsg: vi.fn(),
});

const renderLoadHook = (planData: Record<string, unknown>) => {
  const authAxios = {
    get: vi.fn().mockResolvedValue({
      data: {
        plan: {
          userId: 91,
          nasmPhase: 2,
          planData,
        },
      },
    }),
  };
  const setters = baseSetters();

  const hook = renderHook(() => useWorkoutPlannerLoadPlanActions({
    authAxios,
    selectedClientId: 91,
    phaseName: 'Strength Endurance',
    phaseNumber: 2,
    category: 'full_body',
    goal: 'general_fitness',
    ...setters,
  } as Parameters<typeof useWorkoutPlannerLoadPlanActions>[0]));

  return { hook, setters };
};

describe('useWorkoutPlannerLoadPlanActions', () => {
  it('does not hydrate generated-plan first-day rows into the manual builder', async () => {
    const equipmentContext = {
      profileId: 77,
      availableEquipment: ['Dumbbell (free_weights)', 'Bench (support)'],
      resistanceTypes: ['dumbbell'],
    };
    const { hook, setters } = renderLoadHook({
      planSummary: {
        durationWeeks: 4,
        sessionsPerWeek: 3,
        totalSessions: 12,
        primaryGoal: 'general_fitness',
        startingPhase: 2,
      },
      mesocycles: [{ mesocycle: 1, weeks: '1-4' }],
      equipmentContext,
      weeklySchedule: [{ dayNumber: 1, focus: 'full body', category: 'full_body' }],
      recommendations: [],
      weeks: [{
        weekNumber: 1,
        days: [{
          dayNumber: 1,
          exercises: [{ exerciseId: 'ex-1', exerciseName: 'Generated Squat' }],
        }],
      }],
    });

    await act(async () => {
      await hook.result.current.loadPlanIntoBuilder('plan-1', 'Generated Plan');
    });

    expect(setters.setPlanExercises).toHaveBeenCalledWith([]);
    expect(setters.setGeneratedPlan).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 91,
      equipmentContext,
      weeks: expect.any(Array),
    }));
  });

  it('preserves Swan Coach planning metadata when reloading a generated plan', async () => {
    const swanCoachPlanning = {
      createdBy: 'swan_coach_planning',
      identityMode: 'client_id_only',
      horizonWeeks: 4,
      dataCategoriesUsed: ['workout history'],
    };
    const trainingStyle = {
      mode: 'hardcore',
      method: 'standard',
      label: 'Hardcore Sean Style',
      cue: 'High-intent blocks with guardrails.',
    };
    const { hook, setters } = renderLoadHook({
      planningSystem: 'swan_coach_planning',
      swanCoachPlanning,
      trainingStyle,
      planSummary: {
        durationWeeks: 4,
        sessionsPerWeek: 3,
        totalSessions: 12,
        primaryGoal: 'strength',
        startingPhase: 3,
        trainingStyle,
      },
      mesocycles: [{ mesocycle: 1, weeks: '1-4' }],
      weeklySchedule: [{ dayNumber: 1, focus: 'full body', category: 'full_body' }],
      recommendations: [],
      weeks: [{
        weekNumber: 1,
        days: [{
          dayNumber: 1,
          exercises: [{ exerciseId: 'ex-1', exerciseName: 'Generated Squat' }],
        }],
      }],
    });

    await act(async () => {
      await hook.result.current.loadPlanIntoBuilder('plan-3', 'Reloaded Swan Coach Plan');
    });

    expect(setters.setGeneratedPlan).toHaveBeenCalledWith(expect.objectContaining({
      planningSystem: 'swan_coach_planning',
      swanCoachPlanning,
      trainingStyle,
    }));
  });

  it('still hydrates manual saved plans into the builder rows', async () => {
    const { hook, setters } = renderLoadHook({
      goal: 'general_fitness',
      category: 'full_body',
      weeks: [{
        weekNumber: 1,
        days: [{
          dayNumber: 1,
          exercises: [{ exerciseId: 'manual-1', exerciseName: 'Manual Row' }],
        }],
      }],
    });

    await act(async () => {
      await hook.result.current.loadPlanIntoBuilder('plan-2', 'Manual Plan');
    });

    expect(setters.setGeneratedPlan).toHaveBeenCalledWith(null);
    expect(setters.setPlanExercises).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        exerciseSlim: expect.objectContaining({ name: 'Manual Row' }),
      }),
    ]));
  });
});
