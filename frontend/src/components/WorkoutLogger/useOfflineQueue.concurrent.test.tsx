import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const submitWorkoutForm = vi.hoisted(() => vi.fn());

vi.mock('../../services/nasmApiService', () => ({
  dailyWorkoutFormService: { submitWorkoutForm },
}));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('../../utils/coachIntentRecorder', () => ({ recordCoachIntent: vi.fn() }));

import { getQueueKey, getScopedQueueKey, readQueue, type QueuedEntry } from './offlineQueueStore';
import { useOfflineQueue } from './useOfflineQueue';

const payload = (clientId: number, label: string) => ({
  clientId,
  date: '2026-09-12',
  exercises: [{ exerciseName: label, sets: [{ weight: 10, reps: 5 }] }],
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('useOfflineQueue identity, concurrency, and lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    submitWorkoutForm.mockReset();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('removes only confirmed IDs after await and preserves a concurrent append', async () => {
    const first = deferred<{ success: boolean }>();
    submitWorkoutForm.mockImplementationOnce(() => first.promise);

    const { result } = renderHook(() => useOfflineQueue(11, 42));
    act(() => { result.current.queueSubmission(payload(42, 'A')); });
    await waitFor(() => expect(submitWorkoutForm).toHaveBeenCalledTimes(1));

    act(() => { result.current.queueSubmission(payload(42, 'B')); });
    await act(async () => {
      first.resolve({ success: true });
      await first.promise;
    });

    const queued = readQueue<ReturnType<typeof payload>>(localStorage, 42, 11);
    expect(queued).toHaveLength(1);
    expect(queued[0].formData.exercises[0].exerciseName).toBe('B');

    expect(submitWorkoutForm).toHaveBeenCalledTimes(1);
  });

  it('does not replay unowned legacy bytes and exposes recovery state', async () => {
    const legacy: QueuedEntry<ReturnType<typeof payload>> = {
      id: 'legacy-a',
      timestamp: '2026-09-12T00:00:00.000Z',
      formData: payload(42, 'legacy'),
    };
    localStorage.setItem(getQueueKey(42), JSON.stringify([legacy]));

    const { result } = renderHook(() => useOfflineQueue(11, 42));
    await act(async () => { await result.current.flush(); });

    expect(submitWorkoutForm).not.toHaveBeenCalled();
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.legacyQueuePresent).toBe(true);
    expect(localStorage.getItem(getQueueKey(42))).toBe(JSON.stringify([legacy]));
  });

  it('uses a cryptographic entry ID so same-time entries cannot collide across pages', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    const randomUUID = vi.fn()
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000002');
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID },
    });

    try {
      const { result } = renderHook(() => useOfflineQueue(11, 42));
      act(() => {
        result.current.queueSubmission(payload(42, 'same-time-a'));
        result.current.queueSubmission(payload(42, 'same-time-b'));
      });
      const ids = readQueue(localStorage, 42, 11).map((item) => item.id);
      expect(randomUUID).toHaveBeenCalledTimes(2);
      expect(new Set(ids).size).toBe(2);
      expect(ids).toEqual([
        'offline-00000000-0000-4000-8000-000000000001',
        'offline-00000000-0000-4000-8000-000000000002',
      ]);
    } finally {
      if (originalCrypto) {
        Object.defineProperty(globalThis, 'crypto', originalCrypto);
      } else {
        Reflect.deleteProperty(globalThis, 'crypto');
      }
    }
  });

  it('refuses queueing and flushing when actor identity is missing', () => {
    const { result } = renderHook(() => useOfflineQueue(undefined, 42));

    let persisted = true;
    act(() => { persisted = result.current.queueSubmission(payload(42, 'missing-actor')); });

    expect(persisted).toBe(false);
    expect(result.current.pendingCount).toBe(0);
    expect(submitWorkoutForm).not.toHaveBeenCalled();
    expect(localStorage.getItem(getScopedQueueKey(11, 42))).toBeNull();
  });

  it('fails closed when device storage access itself is blocked', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => { throw new Error('SecurityError'); },
    });
    try {
      const { result } = renderHook(() => useOfflineQueue(11, 42));
      let persisted = true;
      act(() => { persisted = result.current.queueSubmission(payload(42, 'blocked-storage')); });
      expect(persisted).toBe(false);
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });

  it('stops old-scope sends after the selected client changes', async () => {
    const first = deferred<{ success: boolean }>();
    submitWorkoutForm.mockImplementationOnce(() => first.promise);
    const { result, rerender } = renderHook(
      ({ actorId, clientId }) => useOfflineQueue(actorId, clientId),
      { initialProps: { actorId: 11 as number | undefined, clientId: 42 as number | undefined } },
    );

    act(() => { result.current.queueSubmission(payload(42, 'old')); });
    await waitFor(() => expect(submitWorkoutForm).toHaveBeenCalledTimes(1));
    rerender({ actorId: 11, clientId: 99 });

    await act(async () => {
      first.resolve({ success: true });
      await first.promise;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submitWorkoutForm).toHaveBeenCalledTimes(1);
    expect(readQueue(localStorage, 42, 11)).toHaveLength(1);
  });
});
