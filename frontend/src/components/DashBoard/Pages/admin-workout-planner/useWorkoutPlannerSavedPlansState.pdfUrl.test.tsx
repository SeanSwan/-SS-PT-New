import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useWorkoutPlannerSavedPlansState } from './useWorkoutPlannerSavedPlansState';

const makeHookInput = (authAxios: any) => ({
  authAxios,
  selectedClientId: 42,
  loadedPlanId: null,
  currentExercisesSig: '',
  setSavedSnapshot: vi.fn(),
  setLoadedPlanName: vi.fn(),
  resetLoadedPlanState: vi.fn(),
  setStatusMsg: vi.fn(),
  setConfirmRequest: vi.fn(),
});

describe('useWorkoutPlannerSavedPlansState PDF URL mapping', () => {
  it('keeps safe PDF metadata and drops unsafe legacy URLs before rendering admin/trainer PDF links', async () => {
    const authAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          plans: [
            {
              id: 'safe-plan',
              title: 'Safe Plan',
              status: 'active',
              planData: { goal: 'strength' },
              metadata: {
                planHorizon: 'six_month',
                isPrimaryPlan: true,
                planPdf: {
                  url: '/api/workout-plans/safe-plan/pdf/content.pdf',
                  fileName: 'Safe Plan.pdf',
                },
              },
            },
            {
              id: 'unsafe-plan',
              title: 'Unsafe Plan',
              status: 'draft',
              planData: { goal: 'strength' },
              metadata: {
                planPdf: {
                  url: '/uploads/workout-plans/42/unsafe-plan.pdf\r\n',
                  fileName: 'Unsafe Plan.pdf',
                },
              },
            },
          ],
        },
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState(makeHookInput(authAxios)));

    await waitFor(() => expect(result.current.savedPlans).toHaveLength(2));

    expect(result.current.savedPlans[0].pdfFile?.url).toBe(
      '/api/workout-plans/safe-plan/pdf/content.pdf',
    );
    expect(result.current.savedPlans[0]).toMatchObject({
      horizonKey: 'six_month',
      horizonLabel: '6 Month',
      isPrimary: true,
    });
    expect(result.current.savedPlans[1].pdfFile).toBeNull();
  });

  it('sets a saved plan as the primary arc through the dedicated endpoint', async () => {
    const authAxios = {
      get: vi.fn().mockResolvedValue({ data: { success: true, plans: [] } }),
      post: vi.fn(),
      put: vi.fn().mockResolvedValue({ data: { success: true } }),
      delete: vi.fn(),
    };
    const setStatusMsg = vi.fn();

    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState({
      ...makeHookInput(authAxios),
      setStatusMsg,
    }));

    await act(async () => {
      await result.current.handlePlanSetPrimary('plan-9m', 'Nine Month Arc');
    });

    expect(authAxios.put).toHaveBeenCalledWith('/api/workout-plans/plan-9m/primary');
    expect(setStatusMsg).toHaveBeenCalledWith({
      type: 'success',
      text: 'Nine Month Arc is now the primary training arc.',
    });
  });
});
