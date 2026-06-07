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
    durationWeeks: 24,
    sessionsPerWeek: 3,
    totalSessions: 72,
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
  planDuration: '24' as const,
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
          ? Promise.resolve({ data: { plan: { id: 'plan-24', title: 'Client Plan' } } })
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
      durationWeeks: 24,
      createdBy: 'swan_coach_planning',
      planData,
      metadata: expect.objectContaining({
        planHorizon: 'six_month',
        planDurationKey: 'six_month',
        durationPreset: '24',
        planSource: 'swan_coach_planning',
      }),
    }));
    expect(authAxios.put).toHaveBeenCalledWith('/api/workout-plans/plan-24/activate');
    expect(mocks.buildPlanPdfFileFromPlanData).toHaveBeenCalledWith(expect.objectContaining({
      planData,
      durationWeeks: 24,
      goal: 'strength',
      nasmPhase: 2,
    }));
    expect(authAxios.post).toHaveBeenNthCalledWith(
      2,
      '/api/workout-plans/plan-24/pdf/upload',
      expect.any(FormData),
    );
    expect(input.setStatusMsg).toHaveBeenCalledWith({
      type: 'success',
      text: 'Plan saved and made current. PDF attached from the saved plan.',
    });
  });

  it('refreshes the PDF on update without replacing existing backend metadata', async () => {
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
      durationWeeks: 24,
      planData,
    }));
    const updateBody = authAxios.put.mock.calls[0][1];
    expect(updateBody).not.toHaveProperty('metadata');
    expect(authAxios.post).toHaveBeenCalledWith(
      '/api/workout-plans/loaded-plan/pdf/upload',
      expect.any(FormData),
    );
  });
});
