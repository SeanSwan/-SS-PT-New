import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-toastify';

const apiGet = vi.hoisted(() => vi.fn());

vi.mock('../../services/api.service', () => ({
  ApiService: class { get = apiGet; },
}));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('./WorkoutLogger.loadTodaysPlan', () => ({
  loadTodaysPlanIntoLogger: vi.fn(),
}));
vi.mock('./WorkoutLogger.repeatLastSession', () => ({
  repeatLastSessionIntoLogger: vi.fn(),
}));

import { useWorkoutPlanLoading } from './useWorkoutPlanLoading';

const makeParams = (effectiveClientId: number | undefined) => ({
  autoLoadTodayPlan: false,
  autoLoadTodayPlanRef: { current: null },
  createWorkoutLoggerLocalId: (prefix: string) => `${prefix}-1`,
  effectiveClientId,
  hasInitialExercises: true,
  isClientSelfMode: false,
  loadTodayPlanSignal: 0,
  pendingAiPlanPrefillLoadedRef: { current: false },
  routeAssignmentKey: null,
  routeAssignmentType: null,
  scheduledSessionId: null,
  searchParams: new URLSearchParams(),
  setExercises: vi.fn(),
});

const clientResponse = (id: number, availableSessions: unknown = 4) => ({
  data: {
    success: true,
    client: {
      id,
      firstName: `Client ${id}`,
      lastName: 'Test',
      email: `${id}@example.com`,
      availableSessions,
      clientSource: 'paid',
    },
  },
});

describe('useWorkoutPlanLoading client truth', () => {
  beforeEach(() => {
    apiGet.mockReset();
    vi.clearAllMocks();
  });

  it('reports unavailable on failure without fabricating a zero-balance client', async () => {
    apiGet.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useWorkoutPlanLoading(makeParams(42)));

    await waitFor(() => expect(result.current.clientInfoStatus).toBe('unavailable'));
    expect(result.current.client).toBeNull();
    expect(result.current.clientInfoError).toMatch(/network down/i);
  });

  it('ignores a late response for a previous selected client', async () => {
    const first = (() => { let resolve!: (value: unknown) => void; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; })();
    const second = (() => { let resolve!: (value: unknown) => void; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; })();
    apiGet.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const { result, rerender } = renderHook(
      ({ clientId }) => useWorkoutPlanLoading(makeParams(clientId)),
      { initialProps: { clientId: 42 } },
    );

    rerender({ clientId: 99 });
    await act(async () => { second.resolve(clientResponse(99)); await second.promise; });
    await waitFor(() => expect(result.current.client?.id).toBe(99));
    await act(async () => { first.resolve(clientResponse(42)); await first.promise; });

    expect(result.current.client?.id).toBe(99);
    expect(result.current.client?.availableSessions).toBe(4);
  });

  it('preserves an explicitly unknown balance as null', async () => {
    apiGet.mockResolvedValueOnce(clientResponse(42, null));
    const { result } = renderHook(() => useWorkoutPlanLoading(makeParams(42)));
    await waitFor(() => expect(result.current.clientInfoStatus).toBe('ready'));
    expect(result.current.client?.availableSessions).toBeNull();
  });

  it('ignores a late failure after unmount without a stale toast', async () => {
    let reject!: (error: unknown) => void;
    const pending = new Promise<unknown>((_resolve, rejectPromise) => { reject = rejectPromise; });
    apiGet.mockReturnValueOnce(pending);
    const { unmount } = renderHook(() => useWorkoutPlanLoading(makeParams(42)));

    unmount();
    await act(async () => {
      reject(new Error('late network failure'));
      await pending.catch(() => undefined);
    });

    expect(toast.error).not.toHaveBeenCalled();
  });
});
