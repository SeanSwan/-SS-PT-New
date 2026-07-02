import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkoutPlannerSaveActions } from './useWorkoutPlannerSaveActions';

const mocks = vi.hoisted(() => ({
  buildPlanPdfFileFromPlanData: vi.fn(),
}));

vi.mock('./workoutPlannerPlanPdfAdapter', () => ({
  buildPlanPdfFileFromPlanData: mocks.buildPlanPdfFileFromPlanData,
}));

const planData = {
  planSummary: {
    durationWeeks: 26,
    sessionsPerWeek: 3,
    totalSessions: 78,
    primaryGoal: 'strength',
    startingPhase: 2,
  },
  weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Split Squat' }] }] }],
};

const makePdfFile = () => new File(['%PDF-1.4'], 'Generated Plan.pdf', { type: 'application/pdf' });

const makeHookInput = (authAxios: any, overrides: Record<string, unknown> = {}) => ({
  authAxios,
  selectedClientId: 42,
  planExercisesLength: 0,
  hasGeneratedHorizonPlan: true,
  loadedPlanId: null,
  planDuration: '26' as const,
  userRole: 'trainer',
  phaseName: 'Strength Endurance',
  phaseNumber: 2,
  categoryLabel: 'Full Body',
  goal: 'strength' as const,
  clients: [{
    id: 42,
    firstName: 'Client',
    lastName: 'FortyTwo',
    username: 'client42',
    clientSource: 'move_fitness' as const,
  }],
  buildPlanData: vi.fn(() => planData),
  currentExercisesSig: 'saved-sig',
  fetchSavedPlans: vi.fn().mockResolvedValue(undefined),
  setSavedSnapshot: vi.fn(),
  setLoadedPlanId: vi.fn(),
  setLoadedPlanName: vi.fn(),
  setStatusMsg: vi.fn(),
  ...overrides,
});

describe('useWorkoutPlannerSaveActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildPlanPdfFileFromPlanData.mockResolvedValue(makePdfFile());
  });

  it('saves generated plans with horizon metadata and uploads a PDF from the saved planData', async () => {
    const authAxios = {
      post: vi.fn((url: string) => (
        url === '/api/workout-plans'
          ? Promise.resolve({ data: { plan: { id: 'plan-26', title: 'Client Plan' } } })
          : Promise.resolve({ data: { success: true } })
      )),
      put: vi.fn().mockResolvedValue({ data: { success: true } }),
    };
    const input = makeHookInput(authAxios);

    const { result } = renderHook(() => useWorkoutPlannerSaveActions(input));

    await act(async () => {
      await result.current.handleSaveAndActivate();
    });

    expect(authAxios.post).toHaveBeenNthCalledWith(1, '/api/workout-plans', expect.objectContaining({
      durationWeeks: 26,
      createdBy: 'swan_coach_planning',
      planData,
      metadata: expect.objectContaining({
        planHorizon: 'six_month',
        planDurationKey: 'six_month',
        durationPreset: '26',
        planSource: 'swan_coach_planning',
      }),
    }));
    expect(authAxios.put).toHaveBeenCalledWith('/api/workout-plans/plan-26/activate');
    expect(mocks.buildPlanPdfFileFromPlanData).toHaveBeenCalledWith(expect.objectContaining({
      planData,
      durationWeeks: 26,
      horizonKey: 'six_month',
      goal: 'strength',
      nasmPhase: 2,
    }));
    expect(authAxios.post).toHaveBeenNthCalledWith(
      2,
      '/api/workout-plans/plan-26/pdf/upload',
      expect.any(FormData),
    );
    expect(input.setStatusMsg).toHaveBeenCalledWith({
      type: 'success',
      text: 'Plan saved and made current. PDF attached from the saved plan.',
      nextAction: 'current-plan-ready',
    });
  });

  it('backfills trainer-led plan-use metadata when updating an existing saved plan', async () => {
    const authAxios = {
      post: vi.fn().mockResolvedValue({ data: { success: true } }),
      put: vi.fn().mockResolvedValue({ data: { success: true } }),
    };
    const input = makeHookInput(authAxios, { loadedPlanId: 'loaded-plan' });

    const { result } = renderHook(() => useWorkoutPlannerSaveActions(input));

    await act(async () => {
      await result.current.handleUpdateLoaded();
    });

    expect(authAxios.put).toHaveBeenCalledWith('/api/workout-plans/loaded-plan', expect.objectContaining({
      nasmPhase: 2,
      durationWeeks: 26,
      planData,
      metadata: expect.objectContaining({
        planHorizon: 'six_month',
        assignmentDefault: 'trainer_session',
        billingIntent: 'trainer_led_scheduled_flow',
        defaultShouldDeductSession: false,
      }),
    }));
    expect(authAxios.post).toHaveBeenCalledWith(
      '/api/workout-plans/loaded-plan/pdf/upload',
      expect.any(FormData),
    );
  });

  it('keeps single-session plans attached to one-day plan vault PDFs', async () => {
    const singlePlanData = {
      weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Mobility Prep' }] }] }],
    };
    const authAxios = {
      post: vi.fn((url: string) => (
        url === '/api/workout-plans'
          ? Promise.resolve({ data: { plan: { id: 'plan-1d', title: 'Single Day Plan' } } })
          : Promise.resolve({ data: { success: true } })
      )),
      put: vi.fn().mockResolvedValue({ data: { success: true } }),
    };
    const input = makeHookInput(authAxios, {
      planDuration: 'single',
      hasGeneratedHorizonPlan: false,
      planExercisesLength: 1,
      buildPlanData: vi.fn(() => singlePlanData),
    });

    const { result } = renderHook(() => useWorkoutPlannerSaveActions(input));

    await act(async () => {
      await result.current.handleSaveDraft();
    });

    expect(authAxios.post).toHaveBeenNthCalledWith(1, '/api/workout-plans', expect.objectContaining({
      durationWeeks: 1,
      metadata: expect.objectContaining({
        planHorizon: 'one_day',
        planSource: 'manual_builder',
      }),
    }));
    expect(mocks.buildPlanPdfFileFromPlanData).toHaveBeenCalledWith(expect.objectContaining({
      planData: singlePlanData,
      durationWeeks: 1,
      horizonKey: 'one_day',
    }));
  });
});
