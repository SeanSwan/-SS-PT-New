import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkoutPlannerClientState } from './useWorkoutPlannerClientState';
import type { PlannerClient } from './WorkoutPlannerTypes';

const noop = vi.fn();
const setState = vi.fn();

const adminSelfClient: PlannerClient = {
  id: 1,
  firstName: 'Owner',
  lastName: 'Self',
  username: 'owner',
  clientSource: 'swanstudios',
  canGenerateWorkoutPlans: true,
};

function makeInput(overrides: Partial<Parameters<typeof useWorkoutPlannerClientState>[0]> = {}) {
  return {
    authAxios: { get: vi.fn().mockResolvedValue({ data: { success: true, clients: [] } }) },
    user: { id: 1, role: 'admin', username: 'owner', firstName: 'Owner', lastName: 'Self' } as any,
    requestedClientId: null,
    selfClient: null,
    setPlanExercises: setState,
    setGeneratedPlan: setState,
    clearExplanations: noop,
    resetLoadedPlanState: noop,
    ...overrides,
  };
}

describe('useWorkoutPlannerClientState', () => {
  it('selects the admin self target without losing the normal client list', async () => {
    const authAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          clients: [{ id: 42, firstName: 'Ava', lastName: 'Stone', username: 'ava' }],
        },
      }),
    };

    const { result } = renderHook(() => useWorkoutPlannerClientState(makeInput({
      authAxios,
      requestedClientId: adminSelfClient.id,
      selfClient: adminSelfClient,
    })));

    await waitFor(() => expect(result.current.clientsLoading).toBe(false));

    expect(authAxios.get).toHaveBeenCalledWith('/api/auth/clients');
    expect(result.current.selectedClientId).toBe(1);
    expect(result.current.selectedClient?.firstName).toBe('Owner');
    expect(result.current.clients.map((client) => client.id)).toEqual([1, 42]);
  });

  it('keeps the admin self target when the client list returns no usable payload', async () => {
    const authAxios = {
      get: vi.fn().mockResolvedValue({ data: { success: false } }),
    };

    const { result } = renderHook(() => useWorkoutPlannerClientState(makeInput({
      authAxios,
      requestedClientId: adminSelfClient.id,
      selfClient: adminSelfClient,
    })));

    await waitFor(() => expect(result.current.clientsLoading).toBe(false));

    expect(result.current.selectedClientId).toBe(1);
    expect(result.current.clients.map((client) => client.id)).toEqual([1]);
  });
});
