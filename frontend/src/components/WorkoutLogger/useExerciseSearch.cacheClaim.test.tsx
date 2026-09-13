/**
 * ============================================================================
 * FILE: useExerciseSearch.cacheClaim.test.tsx — finding F4.
 *
 * THE DEFECT
 *   `useExerciseSearch` claims a 5-minute catalog freshness window, but the claim
 *   was taken in the wrong place:
 *
 *     const hadCatalog = hasCatalogRef.current;
 *     if (!force && hadCatalog && Date.now() - lastFetchRef.current < CACHE_TTL_MS) return;
 *     // ...awaits the network...
 *     lastFetchRef.current = Date.now();   // stamped only on SUCCESS
 *
 *   1. DOUBLE FETCH — two invocations in the same tick (a StrictMode effect
 *      replay, or two consumers on one instance) both observed
 *      `hasCatalogRef === false` and both issued `/api/exercises/library`. A
 *      guard that only fires after the first request COMPLETES cannot dedupe a
 *      race that starts before it finishes.
 *   2. DEAD WINDOW — because the guard required `hadCatalog`, and a successful
 *      load is what sets it, the TTL could only suppress a call made after a
 *      completed success — never the duplicate the cache exists to prevent.
 *
 * THE INVARIANT: N concurrent mounts inside one TTL window issue ONE request.
 * The compensating half — a FAILED load must stay retryable — is asserted too,
 * because the obvious version of this fix breaks recovery.
 * ============================================================================
 */

import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('../../services/api.service', () => ({
  ApiService: vi.fn(function (this: { get: typeof apiGet }) {
    this.get = apiGet;
  }),
}));

import { useExerciseSearch } from './useExerciseSearch';
import { catalog } from './useExerciseSearch.testSupport';

const LIBRARY = '/api/exercises/library';

const okBody = () => ({ data: { success: true, exercises: catalog } });

/** Every call that actually asked for the library. */
const libraryCalls = () => apiGet.mock.calls.filter(([path]) => path === LIBRARY).length;

const searchCalls = () => apiGet.mock.calls.filter(([path]) => path !== LIBRARY).length;

beforeEach(() => {
  apiGet.mockReset();
  apiGet.mockResolvedValue(okBody());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the catalog freshness claim is taken before the first await (F4)', () => {
  it('TWO SEPARATE consumers each fetch once — the cache is PER INSTANCE', async () => {
    // Scope note, deliberately asserted: `lastFetchRef` is a per-instance ref and
    // the hook documents itself as fetching "once per mounted consumer". Cross-
    // instance sharing was never promised, and this pins that so a future reader
    // does not mistake it for a dedupe the cache ought to provide.
    const first = renderHook(() => useExerciseSearch());
    const second = renderHook(() => useExerciseSearch());

    await waitFor(() => expect(first.result.current.allExercises.length).toBe(catalog.length));
    await waitFor(() => expect(second.result.current.allExercises.length).toBe(catalog.length));

    expect(libraryCalls()).toBe(2);
  });

  it('a StrictMode replay does NOT double-fetch — the actual F4 defect', async () => {
    // StrictMode mounts, unmounts and re-mounts effects on the SAME instance:
    // the replay the guard was supposed to absorb and could not, because the
    // freshness stamp was taken only after the first request had completed.
    const { result } = renderHook(() => useExerciseSearch(), { wrapper: StrictMode });

    await waitFor(() => expect(result.current.allExercises.length).toBe(catalog.length));
    expect(libraryCalls()).toBe(1);
  });

  it('re-rendering one instance never refetches', async () => {
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.allExercises.length).toBe(catalog.length));
    expect(libraryCalls()).toBe(1);

    const before = libraryCalls();
    act(() => { result.current.setQuery('squat'); });
    act(() => { result.current.setQuery(''); });
    expect(libraryCalls()).toBe(before);
  });

  it('a FAILED load is still retryable', async () => {
    // SCOPE, corrected after hostile review finding 5. This does NOT prove the
    // `lastFetchRef.current = 0` reset on the failure path: `refresh()` passes
    // force:true AND sets the stamp itself, so deleting that line leaves this
    // test green. What it actually proves is that a failed mount is recoverable
    // through the supported retry path, which is the user-visible property.
    apiGet.mockReset();
    apiGet.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.loadError).toBeTruthy());
    expect(libraryCalls()).toBe(1);

    // A retry must reach the network again and clear the error.
    apiGet.mockResolvedValue(okBody());
    await act(async () => { await result.current.refresh(); });

    await waitFor(() => expect(result.current.allExercises.length).toBe(catalog.length));
    expect(libraryCalls()).toBe(2);
    expect(result.current.loadError).toBeNull();
  });

  it('refresh() always reaches the network regardless of the window', async () => {
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.allExercises.length).toBe(catalog.length));
    expect(libraryCalls()).toBe(1);

    await act(async () => { await result.current.refresh(); });
    expect(libraryCalls()).toBe(2);
  });

  it('typing does not refetch the catalog', async () => {
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.allExercises.length).toBe(catalog.length));

    act(() => { result.current.setQuery('squat'); });
    act(() => { result.current.setCategory('Legs'); });

    await waitFor(() => expect(result.current.allExercises.length).toBe(catalog.length));
    expect(libraryCalls()).toBe(1);
    void searchCalls;
  });
});
