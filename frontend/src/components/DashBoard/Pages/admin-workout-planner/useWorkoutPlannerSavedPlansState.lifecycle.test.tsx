/**
 * FILE: useWorkoutPlannerSavedPlansState.lifecycle.test.tsx
 * PURPOSE: Lock revision-aware saved-plan rename and audited lifecycle writes.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useWorkoutPlannerSavedPlansState } from './useWorkoutPlannerSavedPlansState';
import { derivePlanDataKnown } from './plannerLogic/planDataKnown';

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
  it('activation does not mark unsaved edits as saved', async () => {
    const authAxios = { get: vi.fn().mockResolvedValue(revisionPlanResponse), post: vi.fn().mockResolvedValue({ data: { success: true } }), put: vi.fn(), delete: vi.fn() };
    const input = makeHookInput(authAxios, { loadedPlanId: 'revision-plan', currentExercisesSig: 'unsaved-edits' });
    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState(input));
    await act(async () => result.current.handleCardActivate('revision-plan', 'Revision Plan'));
    expect(input.setSavedSnapshot).not.toHaveBeenCalled();
  });
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

/**
 * H22 across the HOOK boundary, not just the pure resolver.
 *
 * The first H22 repair was tested only by handing `planDataKnown: false` into
 * resolveNextBestAction, which cannot catch a wrong derivation. `fetchSavedPlans`
 * sets `savedPlansClientId` in a finally block, so a rejected GET (or a 2xx
 * failure payload) previously produced exactly the state the caller read as
 * "known and empty" — and the chip announced that the client has no active plan.
 * These tests evaluate the caller's REAL predicate — the shared
 * `derivePlanDataKnown` the mounted panel imports — against real hook state, so
 * neither copy can drift from the other.
 */
const derivedPlanDataKnown = (
  state: { savedPlansClientId: number | null; savedPlansLoading: boolean; savedPlansError: boolean },
  selectedClientId: number | null,
) => derivePlanDataKnown(state, selectedClientId);

describe('useWorkoutPlannerSavedPlansState H22 plan-data knowledge', () => {
  it('reports plan data as UNKNOWN when the saved-plan load rejects', async () => {
    const authAxios = {
      get: vi.fn().mockRejectedValue(new Error('offline')),
      post: vi.fn(), put: vi.fn(), delete: vi.fn(),
    };
    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState(makeHookInput(authAxios)));

    await waitFor(() => expect(result.current.savedPlansLoading).toBe(false));

    // The settle markers are exactly what made the old derivation look "known".
    expect(result.current.savedPlansClientId).toBe(42);
    expect(result.current.savedPlans).toHaveLength(0);
    expect(result.current.savedPlansError).toBe(true);
    expect(derivedPlanDataKnown(result.current, 42)).toBe(false);
  });

  it('reports plan data as UNKNOWN when the load returns a 2xx failure payload', async () => {
    const authAxios = {
      get: vi.fn().mockResolvedValue({ data: { success: false } }),
      post: vi.fn(), put: vi.fn(), delete: vi.fn(),
    };
    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState(makeHookInput(authAxios)));

    await waitFor(() => expect(result.current.savedPlansLoading).toBe(false));

    expect(result.current.savedPlansError).toBe(true);
    expect(derivedPlanDataKnown(result.current, 42)).toBe(false);
  });

  it('reports plan data as KNOWN once a successful load returns an empty list', async () => {
    const authAxios = {
      get: vi.fn().mockResolvedValue({ data: { success: true, plans: [] } }),
      post: vi.fn(), put: vi.fn(), delete: vi.fn(),
    };
    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState(makeHookInput(authAxios)));

    await waitFor(() => expect(result.current.savedPlansLoading).toBe(false));

    expect(result.current.savedPlansError).toBe(false);
    expect(derivedPlanDataKnown(result.current, 42)).toBe(true);
  });

  it('reports plan data as UNKNOWN before the fetch settles', () => {
    const authAxios = {
      get: vi.fn().mockReturnValue(new Promise(() => {})),
      post: vi.fn(), put: vi.fn(), delete: vi.fn(),
    };
    const { result } = renderHook(() => useWorkoutPlannerSavedPlansState(makeHookInput(authAxios)));

    expect(result.current.savedPlansLoading).toBe(true);
    expect(derivedPlanDataKnown(result.current, 42)).toBe(false);
  });
});
