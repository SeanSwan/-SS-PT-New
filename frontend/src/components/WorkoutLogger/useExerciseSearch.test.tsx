import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../../services/api.service';
import { useExerciseSearch, type ExerciseSlim } from './useExerciseSearch';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('../../services/api.service', () => ({
  ApiService: vi.fn(function (this: { get: typeof apiGet }) {
    this.get = apiGet;
  }),
}));

import {
  catalog,
  deferred,
  exercise,
  type Deferred,
  type FakeWorker,
  type SearchMessage,
} from './useExerciseSearch.testSupport';

let worker: FakeWorker;
let WorkerConstructor: ReturnType<typeof vi.fn>;

function postedSearches(): SearchMessage[] {
  return worker.postMessage.mock.calls
    .map(([message]) => message as SearchMessage)
    .filter((message) => message?.type === 'SEARCH');
}

function emitWorker(data: unknown) {
  worker.onmessage?.({ data } as MessageEvent);
}

/** Reply for a real posted SEARCH, echoing its exact revision pair. */
function emitResultsFor(search: SearchMessage, exercises: ExerciseSlim[]) {
  emitWorker({
    type: 'RESULTS',
    exercises,
    query: search.query,
    category: search.category,
    catalogRevision: search.catalogRevision,
    searchSequence: search.searchSequence,
  });
}

beforeEach(() => {
  apiGet.mockReset();
  worker = {
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
  };
  WorkerConstructor = vi.fn(function () {
    return worker;
  });
  vi.stubGlobal('Worker', WorkerConstructor);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useExerciseSearch current-query engine contract', () => {
  it('performs one fetch when query and category are chosen before delayed load', async () => {
    const pending = deferred<{ data: { success: boolean; exercises: ExerciseSlim[] } }>();
    apiGet.mockReturnValueOnce(pending.promise);

    const { result } = renderHook(() => useExerciseSearch());
    act(() => {
      result.current.setQuery('bench');
      result.current.setCategory('Chest');
    });

    expect(apiGet).toHaveBeenCalledTimes(1);
    pending.resolve({ data: { success: true, exercises: catalog } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(postedSearches().at(-1)).toEqual(
      expect.objectContaining({ query: 'bench', category: 'Chest' }),
    );
  });

  it('rejects an old-query worker reply and settles only the current search', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: true, exercises: catalog } });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setQuery('bench'));
    const staleSearch = postedSearches().at(-1)!;
    act(() => result.current.setQuery('squat'));
    const currentSearch = postedSearches().at(-1)!;
    expect(currentSearch.searchSequence).toBeGreaterThan(staleSearch.searchSequence);

    act(() => emitResultsFor(staleSearch, [result.current.allExercises[0]]));
    expect(result.current.results).toEqual([]);
    expect(result.current.isSearching).toBe(true);

    act(() => emitResultsFor(currentSearch, [result.current.allExercises[1]]));
    expect(result.current.results).toEqual([result.current.allExercises[1]]);
    expect(result.current.isSearching).toBe(false);
  });

  it('rejects a reply stamped with a superseded catalogRevision', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: true, exercises: catalog } });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setQuery('bench'));
    const search = postedSearches().at(-1)!;

    act(() => emitWorker({
      type: 'RESULTS',
      exercises: [catalog[0]],
      query: search.query,
      category: search.category,
      catalogRevision: search.catalogRevision - 1,
      searchSequence: search.searchSequence,
    }));

    expect(result.current.results).toEqual([]);
    expect(result.current.isSearching).toBe(true);
  });

  it('terminates a crashed worker and synchronously returns the latest fallback results', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: true, exercises: catalog } });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setQuery('bench'));
    act(() => worker.onerror?.(new ErrorEvent('error')));

    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(result.current.results).toEqual([result.current.allExercises[0]]);
    expect(result.current.isSearching).toBe(false);
  });

  it('reapplies the current filter after an explicit refresh replaces the catalog', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: true, exercises: catalog } });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setQuery('press');
      result.current.setCategory('Chest');
    });
    act(() => emitResultsFor(postedSearches().at(-1)!, [result.current.allExercises[0]]));
    expect(result.current.results).toEqual([result.current.allExercises[0]]);

    const refreshed = [exercise({ id: 'incline-bench', name: 'Incline Bench Press' })];
    const refreshPending = deferred<{ data: { success: boolean; exercises: ExerciseSlim[] } }>();
    apiGet.mockReset();
    apiGet.mockReturnValueOnce(refreshPending.promise);
    act(() => result.current.refresh());
    expect(apiGet).toHaveBeenCalledTimes(1);
    refreshPending.resolve({ data: { success: true, exercises: refreshed } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The refresh re-ran the CURRENT filter, not a stale empty query.
    const refreshSearch = postedSearches().at(-1)!;
    expect(refreshSearch).toEqual(expect.objectContaining({ query: 'press', category: 'Chest' }));
    expect(refreshSearch.catalogRevision).toBeGreaterThan(1);

    // A real Worker echoes the catalog it was handed, so reply with it.
    act(() => emitResultsFor(refreshSearch, result.current.allExercises));
    expect(result.current.allExercises).toHaveLength(1);
    expect(result.current.allExercises[0].id).toBe('incline-bench');
    expect(result.current.results).toEqual(result.current.allExercises);
    expect(result.current.query).toBe('press');
    expect(result.current.category).toBe('Chest');
    expect(result.current.loadState).toBe('ready');
  });

  it('distinguishes a successful empty catalog from an initial load error', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: true, exercises: [] } });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loadState).toBe('empty');
    expect(result.current.loadError).toBeNull();
    expect(result.current.refreshError).toBeNull();
  });

  it('treats a malformed top-level body as a failure, not an empty library', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: false, message: 'nope' } });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.loadState).toBe('error'));
    expect(result.current.loadError).not.toBeNull();
    expect(result.current.allExercises).toEqual([]);
  });

  it('filters malformed catalog members and non-string array values before search', async () => {
    apiGet.mockResolvedValueOnce({
      data: {
        success: true,
        exercises: [
          null,
          exercise({ primaryMuscles: ['Chest', 42 as unknown as string] }),
        ],
      },
    });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allExercises).toHaveLength(1);
    expect(result.current.allExercises[0].primaryMuscles).toEqual(['Chest']);
    expect(result.current.loadError).toBeNull();
  });

  it('keeps filtered rows and reports stale when a cached refresh fails', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: true, exercises: catalog } });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setQuery('bench'));
    const search = postedSearches().at(-1)!;
    act(() => emitResultsFor(search, [result.current.allExercises[0]]));

    apiGet.mockReset();
    apiGet.mockRejectedValueOnce(new Error('offline'));
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.loadState).toBe('stale');
    expect(result.current.refreshError).not.toBeNull();
    expect(result.current.loadError).toBeNull();
    expect(result.current.results).toEqual([result.current.allExercises[0]]);
    expect(result.current.query).toBe('bench');
  });

  it('uses the synchronous fallback for messageerror and settles busy state', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: true, exercises: catalog } });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setQuery('bench'));
    act(() => worker.onmessageerror?.({ data: 'unreadable' } as MessageEvent));

    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(result.current.results).toEqual([result.current.allExercises[0]]);
    expect(result.current.isSearching).toBe(false);
  });

  it('uses the synchronous fallback when postMessage throws', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: true, exercises: catalog } });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    worker.postMessage.mockImplementation(() => {
      throw new Error('DataCloneError');
    });
    act(() => result.current.setQuery('squat'));

    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(result.current.results).toEqual([result.current.allExercises[1]]);
    expect(result.current.isSearching).toBe(false);
  });

  it('terminates the owned worker before late callbacks can settle an unmounted hook', async () => {
    const pending = deferred<{ data: { success: boolean; exercises: ExerciseSlim[] } }>();
    apiGet.mockReturnValueOnce(pending.promise);
    const { unmount } = renderHook(() => useExerciseSearch());
    unmount();
    pending.resolve({ data: { success: true, exercises: catalog } });
    await Promise.resolve();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
