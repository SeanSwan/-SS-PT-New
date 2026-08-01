/**
 * ============================================================================
 * FILE: useWorkoutPlannerSaveActions.test.tsx
 * PURPOSE: Lock one-owner PDF behavior across derivative and rollback modes.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

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
  loadedPlanId: null, loadedPlanRevision: 1,
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

  it('uses the server derivative request without generating or uploading a second PDF', async () => {
    const authAxios = {
      post: vi.fn().mockResolvedValue({
        data: {
          plan: { id: 'plan-26', title: 'Client Plan' },
          pdfDerivative: { enabled: true, state: 'pending' },
        },
      }),
      put: vi.fn().mockResolvedValue({
        data: { success: true, pdfDerivative: { enabled: true, state: 'pending' } },
      }),
    };
    const input = makeHookInput(authAxios);
    const { result } = renderHook(() => useWorkoutPlannerSaveActions(input));

    await act(async () => {
      await result.current.handleSaveAndActivate();
    });

    expect(authAxios.post).toHaveBeenCalledTimes(2);
    expect(authAxios.post).toHaveBeenCalledWith('/api/workout-plans', expect.objectContaining({
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
    expect(authAxios.post).toHaveBeenCalledWith('/api/workout-plans/plan-26/status', { action: 'activate' });
    expect(mocks.buildPlanPdfFileFromPlanData).not.toHaveBeenCalled();
    expect(input.setStatusMsg).toHaveBeenCalledWith({
      type: 'success',
      text: 'Plan saved and made current. PDF generation queued.',
      nextAction: 'current-plan-ready',
    });
  });

  it('keeps the generated-plan create body byte-for-byte contract-shaped', async () => {
    const authAxios = {
      post: vi.fn((url: string) => (
        url === '/api/workout-plans'
          ? Promise.resolve({ data: { plan: { id: 'plan-26', title: 'Client Plan' }, pdfDerivative: { enabled: true, state: 'pending' } } })
          : Promise.resolve({ data: { success: true } })
      )),
      put: vi.fn(),
    };
    const input = makeHookInput(authAxios);
    const { result } = renderHook(() => useWorkoutPlannerSaveActions(input));

    // Capture independently before invoking the hook. Reusing the fixture object
    // here would let a mutation of planData make both actual and expected agree.
    const expectedPlanData = structuredClone(planData);
    const expectedRequest = ['/api/workout-plans', {
      userId: 42,
      title: "Client's Strength Endurance Plan",
      description: 'Full Body — strength',
      nasmPhase: 2,
      durationWeeks: 26,
      status: 'draft',
      planData: expectedPlanData,
      createdBy: 'swan_coach_planning',
      metadata: {
        planHorizon: 'six_month',
        horizonKey: 'six_month',
        planDurationKey: 'six_month',
        durationPreset: '26',
        durationWeeks: 26,
        planSource: 'swan_coach_planning',
        createdByRole: 'trainer',
        assignmentDefault: 'trainer_session',
        billingIntent: 'trainer_led_scheduled_flow',
        defaultShouldDeductSession: false,
      },
    }];

    await act(async () => {
      await result.current.handleSaveDraft();
    });

    expect(authAxios.post).toHaveBeenCalledTimes(1);
    expect(authAxios.put).not.toHaveBeenCalled();
    expect(JSON.stringify(authAxios.post.mock.calls[0])).toBe(JSON.stringify(expectedRequest));
  });

  it('uses the update derivative response without browser PDF upload', async () => {
    const authAxios = {
      post: vi.fn().mockResolvedValue({ data: { success: true } }),
      put: vi.fn().mockResolvedValue({
        data: { success: true, pdfDerivative: { enabled: true, state: 'pending' } },
      }),
    };
    const input = makeHookInput(authAxios, { loadedPlanId: 'loaded-plan', loadedPlanRevision: 4 });
    const { result } = renderHook(() => useWorkoutPlannerSaveActions(input));

    await act(async () => {
      await result.current.handleUpdateLoaded();
    });

    expect(authAxios.put).toHaveBeenCalledWith('/api/workout-plans/loaded-plan', expect.objectContaining({
      nasmPhase: 2,
      expectedRevision: 4,
      durationWeeks: 26,
      planData,
      metadata: expect.objectContaining({
        planHorizon: 'six_month',
        assignmentDefault: 'trainer_session',
        billingIntent: 'trainer_led_scheduled_flow',
        defaultShouldDeductSession: false,
      }),
    }));
    expect(authAxios.post).not.toHaveBeenCalled();
    expect(mocks.buildPlanPdfFileFromPlanData).not.toHaveBeenCalled();
  });

  it('refreshes a stale loaded plan after a revision conflict', async () => {
    const authAxios = {
      post: vi.fn(),
      put: vi.fn().mockRejectedValue({ response: { status: 409 } }),
    };
    const input = makeHookInput(authAxios, { loadedPlanId: 'loaded-plan', loadedPlanRevision: 4 });
    const { result } = renderHook(() => useWorkoutPlannerSaveActions(input));

    await act(async () => result.current.handleUpdateLoaded());

    expect(input.fetchSavedPlans).toHaveBeenCalledWith(42);
    expect(input.setStatusMsg).toHaveBeenCalledWith({
      type: 'error',
      text: 'This plan changed on the server. Saved plans were refreshed; review and retry.',
    });
  });
  it('retains one browser upload only when the server reports legacy rollback mode', async () => {
    const singlePlanData = {
      weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Flexibility Prep' }] }] }],
    };
    const authAxios = {
      post: vi.fn((url: string) => (
        url === '/api/workout-plans'
          ? Promise.resolve({
            data: {
              plan: { id: 'plan-1d', title: 'Single Day Plan' },
              pdfDerivative: { enabled: false, state: 'legacy' },
            },
          })
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
    expect(authAxios.post).toHaveBeenNthCalledWith(
      2,
      '/api/workout-plans/plan-1d/pdf/upload',
      expect.any(FormData),
    );
  });
});
