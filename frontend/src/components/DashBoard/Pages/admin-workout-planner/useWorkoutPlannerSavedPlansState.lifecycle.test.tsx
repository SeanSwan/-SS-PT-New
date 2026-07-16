/**
 * FILE: useWorkoutPlannerSavedPlansState.lifecycle.test.tsx
 * PURPOSE: Lock revision-aware saved-plan rename and audited lifecycle writes.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useWorkoutPlannerSavedPlansState } from './useWorkoutPlannerSavedPlansState';

const makeHookInput = (authAxios: any, overrides: Record<string, unknown> = {}) => ({
  authAxios,
  selectedClientId: 42,
  loadedPlanId: null,
  currentExercisesSig: '',
  setSavedSnapshot: vi.fn(),
  setLoadedPlanName: vi.fn(),
  resetLoadedPlanState: vi.fn(),
  setStatusMsg: vi.fn(),
  setConfirmRequest: vi.fn(),
  ...overrides,
});

const revisionPlanResponse = {
  data: {
    success: true,
    plans: [{
      id: 'revision-plan',
      title: 'Revision Plan',
      status: 'draft',
      contentRevision: 4,
    }],
  },
};

describe('useWorkoutPlannerSavedPlansState lifecycle writes', () => {
  it('renames with the list revision so stale staff edits conflict safely', async () => {
    const authAxios = {
      get: vi.fn().mockResolvedValue(revisionPlanResponse),
      post: vi.fn(),
      put: vi.fn().mockResolvedValue({ data: { success: true } }),
      delete: vi.fn(),
    };
    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState(makeHookInput(authAxios)));
    await waitFor(() => expect(result.current.savedPlans).toHaveLength(1));

    await act(async () => result.current.handleCardRename('revision-plan', 'Renamed Plan'));

    expect(authAxios.put).toHaveBeenCalledWith('/api/workout-plans/revision-plan', {
      title: 'Renamed Plan',
      expectedRevision: 4,
    });
  });

  it('refreshes stale plan state and gives an actionable rename conflict receipt', async () => {
    const conflict = Object.assign(new Error('Conflict'), { response: { status: 409 } });
    const authAxios = {
      get: vi.fn().mockResolvedValue(revisionPlanResponse),
      post: vi.fn(),
      put: vi.fn().mockRejectedValue(conflict),
      delete: vi.fn(),
    };
    const setStatusMsg = vi.fn();
    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState(makeHookInput(
      authAxios,
      { setStatusMsg },
    )));
    await waitFor(() => expect(result.current.savedPlans).toHaveLength(1));

    await act(async () => result.current.handleCardRename('revision-plan', 'Stale Rename'));

    expect(authAxios.get).toHaveBeenCalledTimes(2);
    expect(setStatusMsg).toHaveBeenLastCalledWith({
      type: 'error',
      text: 'This plan changed on the server. Saved plans were refreshed; review and retry.',
    });
  });

  it('archives through the audited lifecycle endpoint after confirmation', async () => {
    const authAxios = {
      get: vi.fn().mockResolvedValue({ data: { success: true, plans: [] } }),
      post: vi.fn().mockResolvedValue({ data: { success: true } }),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const setConfirmRequest = vi.fn();
    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState(makeHookInput(
      authAxios,
      { setConfirmRequest },
    )));

    act(() => result.current.handleCardArchive('archive-plan', 'Archive Plan'));
    const request = setConfirmRequest.mock.calls[0]?.[0];
    await act(async () => request.onConfirm());

    expect(authAxios.post).toHaveBeenCalledWith('/api/workout-plans/archive-plan/status', {
      action: 'archive',
    });
    expect(authAxios.delete).not.toHaveBeenCalled();
  });
});
