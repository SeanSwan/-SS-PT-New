/**
 * useExerciseSearch — setter invalidation contract
 * ===============================================
 * Regression lock for the highest-severity finding of the combined hostile
 * review (frontend F2): a setter that does NOT change the value must not
 * invalidate an in-flight search, because no replacement request follows it.
 *
 * Before the fix, `setQuery('')` while the query was already '' (which
 * `handleSelect` does on every row double-click) advanced `searchSequenceRef`
 * with no new SEARCH behind it. The in-flight reply was then discarded by the
 * sequence guard, `isSearching` stayed true forever, and the logger could end up
 * on a permanent "No exercises match current filters" panel with no filters
 * active and no recovery control.
 *
 * Kept in its own file so useExerciseSearch.test.tsx stays out of the 300-line
 * cap discussion.
 */

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

function exercise(overrides: Partial<ExerciseSlim> = {}): ExerciseSlim {
  return {
    id: 'bench-press',
    name: 'Bench Press',
    exerciseKey: 'bench-press',
    exerciseType: 'strength',
    bodyPartCategory: 'Chest',
    primaryMuscles: ['Chest'],
    difficulty: 1,
    ...overrides,
  };
}

const catalog = [
  exercise(),
  exercise({ id: 'back-squat', name: 'Back Squat', bodyPartCategory: 'Legs' }),
];

type SearchMessage = { type: string; query: string; category: string | null; catalogRevision: number; searchSequence: number };

let worker: {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

const postedSearches = (): SearchMessage[] => worker.postMessage.mock.calls
  .map(([message]) => message as SearchMessage)
  .filter((message) => message?.type === 'SEARCH');

const emitResultsFor = (search: SearchMessage, exercises: ExerciseSlim[]) =>
  worker.onmessage?.({
    data: {
      type: 'RESULTS',
      exercises,
      query: search.query,
      category: search.category,
      catalogRevision: search.catalogRevision,
      searchSequence: search.searchSequence,
    },
  } as MessageEvent);

beforeEach(() => {
  apiGet.mockReset();
  worker = {
    onmessage: null, onerror: null, onmessageerror: null,
    postMessage: vi.fn(), terminate: vi.fn(), addEventListener: vi.fn(),
  };
  vi.stubGlobal('Worker', vi.fn(function () { return worker; }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('setter invalidation', () => {
  it('does not strand the search when setQuery is called with the SAME value', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: true, exercises: catalog } });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The INITIAL blank search is in flight (query is '' and stays '').
    const search = postedSearches().at(-1)!;
    expect(result.current.isSearching).toBe(true);

    // handleSelect's exact call: setQuery('') while the query is ALREADY ''.
    act(() => result.current.setQuery(''));
    expect(postedSearches().at(-1)!.searchSequence).toBe(search.searchSequence);

    // The in-flight reply is therefore still current and MUST settle.
    act(() => emitResultsFor(search, result.current.allExercises));
    expect(result.current.results).toEqual(result.current.allExercises);
    expect(result.current.isSearching).toBe(false);
  });

  it('does not strand the search when setCategory repeats the same value', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: true, exercises: catalog } });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setCategory('Chest'));
    const search = postedSearches().at(-1)!;

    act(() => result.current.setCategory('Chest'));
    expect(postedSearches().at(-1)!.searchSequence).toBe(search.searchSequence);

    act(() => emitResultsFor(search, [catalog[0]]));
    expect(result.current.results).toEqual([catalog[0]]);
    expect(result.current.isSearching).toBe(false);
  });

  it('never advances the sequence without issuing a replacement SEARCH', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: true, exercises: catalog } });
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const before = postedSearches().length;
    act(() => result.current.setQuery(''));
    act(() => result.current.setCategory(null));
    // No value changed, so no sequence bumped and no SEARCH was posted.
    expect(postedSearches()).toHaveLength(before);

    // A REAL change still invalidates and re-issues.
    act(() => result.current.setQuery('squat'));
    expect(postedSearches().length).toBe(before + 1);
  });
});
