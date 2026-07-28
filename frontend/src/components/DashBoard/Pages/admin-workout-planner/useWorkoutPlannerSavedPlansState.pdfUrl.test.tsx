import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useWorkoutPlannerSavedPlansState } from './useWorkoutPlannerSavedPlansState';
import type { SavedPlanSummary } from './WorkoutPlannerSavedPlansSection';

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

afterEach(() => {
  vi.unstubAllGlobals();
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
            {
              id: 'public-plan',
              title: 'Public Plan',
              status: 'draft',
              planData: { goal: 'strength' },
              metadata: {
                planPdf: {
                  url: 'https://cdn.swanstudios.com/plans/public-plan.pdf',
                  fileName: 'Public Plan.pdf',
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

    await waitFor(() => expect(result.current.savedPlans).toHaveLength(3));

    expect(result.current.savedPlans[0].pdfFile?.url).toBe(
      '/api/workout-plans/safe-plan/pdf/content.pdf',
    );
    expect(result.current.savedPlans[0]).toMatchObject({
      horizonKey: 'six_month',
      horizonLabel: '6 Month',
      isPrimary: true,
    });
    expect(result.current.savedPlans[1].pdfFile).toBeNull();
    expect(result.current.savedPlans[2].pdfFile).toBeNull();
  });

  it('duplicates a saved plan into the selected target client and copy span', async () => {
    const authAxios = {
      get: vi.fn().mockResolvedValue({ data: { success: true, plans: [] } }),
      post: vi.fn().mockResolvedValue({ data: { success: true } }),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const setStatusMsg = vi.fn();

    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState({
      ...makeHookInput(authAxios),
      setStatusMsg,
    }));

    await act(async () => {
      await result.current.handleCardDuplicate('source-plan', 'Source Plan', 77, 52);
    });

    expect(authAxios.post).toHaveBeenCalledWith('/api/workout-plans/source-plan/duplicate', {
      targetClientId: 77,
      durationWeeks: 52,
    });
    expect(setStatusMsg).toHaveBeenCalledWith({
      type: 'success',
      text: 'Copied "Source Plan" to client #77 as a draft.',
    });
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

  it('blocks archiving the only current plan when legacy status casing is uppercase', async () => {
    const authAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          plans: [{
            id: 'legacy-active-plan',
            title: 'Legacy Active Arc',
            status: 'ACTIVE',
            planData: { goal: 'strength' },
          }],
        },
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState(makeHookInput(authAxios)));

    await waitFor(() => expect(result.current.savedPlans).toHaveLength(1));

    expect(result.current.archiveBlockedFor('ACTIVE')).toBe(true);
  });

  it('opens protected saved-plan PDFs through the authenticated blob proxy', async () => {
    const createObjectURL = vi.fn(() => 'blob:planner-plan-pdf');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const authAxios = {
      get: vi.fn((url: string) => {
        if (url === '/api/workout-plans/protected-plan/pdf/content.pdf') {
          return Promise.resolve({ data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }) });
        }
        return Promise.resolve({ data: { success: true, plans: [] } });
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const plan: SavedPlanSummary = {
      id: 'protected-plan',
      name: 'Protected Six Month Arc',
      status: 'active',
      createdAt: '2026-06-07T12:00:00.000Z',
      goal: 'strength',
      pdfFile: {
        url: '/api/workout-plans/protected-plan/pdf/content.pdf',
        fileName: 'Protected Six Month Arc.pdf',
        contentType: 'application/pdf',
      },
    };

    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState(makeHookInput(authAxios)));

    await act(async () => {
      await result.current.handlePlanPdfView(plan);
    });

    expect(authAxios.get).toHaveBeenCalledWith(
      '/api/workout-plans/protected-plan/pdf/content.pdf',
      { responseType: 'blob' },
    );
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(result.current.pdfDialogPlan?.pdfFile?.url).toBe('blob:planner-plan-pdf');
  });

  it('does not expose the protected PDF API URL in dialog state while blob loading is pending', async () => {
    let resolvePdf: ((value: { data: Blob }) => void) | null = null;
    const pdfPromise = new Promise<{ data: Blob }>((resolve) => {
      resolvePdf = resolve;
    });
    const createObjectURL = vi.fn(() => 'blob:planner-delayed-pdf');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const authAxios = {
      get: vi.fn((url: string) => {
        if (url === '/api/workout-plans/protected-plan/pdf/content.pdf') {
          return pdfPromise;
        }
        return Promise.resolve({ data: { success: true, plans: [] } });
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const plan: SavedPlanSummary = {
      id: 'protected-plan',
      name: 'Protected Six Month Arc',
      status: 'active',
      createdAt: '2026-06-07T12:00:00.000Z',
      goal: 'strength',
      pdfFile: {
        url: '/api/workout-plans/protected-plan/pdf/content.pdf',
        fileName: 'Protected Six Month Arc.pdf',
        contentType: 'application/pdf',
      },
    };

    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState(makeHookInput(authAxios)));

    let viewPromise: Promise<void>;
    await act(async () => {
      viewPromise = result.current.handlePlanPdfView(plan);
    });

    expect(result.current.pdfOpening).toBe(true);
    expect(result.current.pdfDialogPlan?.pdfFile).toBeNull();

    await act(async () => {
      resolvePdf?.({ data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }) });
      await viewPromise;
    });

    expect(result.current.pdfOpening).toBe(false);
    expect(result.current.pdfDialogPlan?.pdfFile?.url).toBe('blob:planner-delayed-pdf');
  });
});
