/**
 * ============================================================================
 * FILE: exerciseSearchStaleRetry.test.tsx — finding F3.
 *
 * THE DEFECT
 *   `resolveLibraryState` documents "stale is decided BEFORE refreshing, so a
 *   failed refresh stays visible while a retry is running". That ordering was
 *   UNREACHABLE: the hook cleared `refreshError` at load start, so `stale`
 *   could not coexist with `isLoading`.
 *
 *   Consequence: clicking Retry from the stale notice flipped the state to
 *   `refreshing`, which renders NO notice — and the Retry button lives INSIDE
 *   that notice. The notice and its own button vanished, leaving a blank pane
 *   with no feedback while the request ran.
 *
 * This file asserts the ORDERING (pure) and, more importantly, that the HOOK can
 * actually emit the combination — a fixture-only proof is what let the bug live,
 * so reachability is the assertion that matters.
 * ============================================================================
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('../../services/api.service', () => ({
  ApiService: vi.fn(function (this: { get: typeof apiGet }) {
    this.get = apiGet;
  }),
}));

import { useExerciseSearch } from './useExerciseSearch';
import { catalog } from './useExerciseSearch.testSupport';
import { resolveLibraryState } from './exerciseSearchLibraryState';

const okBody = () => ({ data: { success: true, exercises: catalog } });

beforeEach(() => {
  apiGet.mockReset();
});

describe('resolveLibraryState — the documented ordering (pure)', () => {
  it('stale beats refreshing while a retry runs', () => {
    expect(resolveLibraryState({
      loadState: 'stale', isLoading: true, catalogCount: 3, resultCount: 3,
    })).toBe('stale');
  });

  it('refreshing applies only to a catalog that is NOT stale', () => {
    expect(resolveLibraryState({
      loadState: 'ready', isLoading: true, catalogCount: 3, resultCount: 3,
    })).toBe('refreshing');
  });

  it('a stale catalog with nothing in flight is still stale', () => {
    expect(resolveLibraryState({
      loadState: 'stale', isLoading: false, catalogCount: 3, resultCount: 3,
    })).toBe('stale');
  });

  it('STALE outranks a ZERO count — the count may only be section-filtered', () => {
    // THE TEST WHOSE ABSENCE LET A REGRESSION SHIP (round-2 review finding 2).
    // Round 46 moved `catalogCount === 0` above the stale check on the premise
    // "count 0 == empty library". That premise is FALSE for the logger, which
    // passes a SECTION-filtered count: a section matching nothing with a failed
    // refresh then rendered `refreshError` nowhere and printed "The library
    // returned no exercises" over a non-empty library. Nothing asserted this
    // combination, so reverting the line left the whole suite green.
    expect(resolveLibraryState({
      loadState: 'stale', isLoading: false, catalogCount: 0, resultCount: 0,
    })).toBe('stale');
  });

  it('STALE still outranks a zero count with a refresh in flight', () => {
    // The count check must not be reachable over `stale` by the isLoading route
    // either — this is the exact shape that hid the error.
    expect(resolveLibraryState({
      loadState: 'stale', isLoading: true, catalogCount: 0, resultCount: 0,
    })).toBe('stale');
  });

  it('EMPTY-CATALOG beats refreshing, so the notice and its Retry button survive', () => {
    // Hostile-review finding 1: with no rows there is nothing to preserve, so
    // returning 'refreshing' made the notice return null — and the Retry button
    // lives inside it, so clicking Retry blanked the pane. That was the same
    // defect this file's stale-path test covers, still live one click away.
    // Pre-fix this returned 'refreshing'.
    expect(resolveLibraryState({
      loadState: 'empty', isLoading: true, catalogCount: 0, resultCount: 0,
    })).toBe('empty-catalog');
  });

  it('refreshing still applies when there ARE rows to preserve', () => {
    // The counterpart: the empty-catalog guard must not swallow the case the
    // state exists for. This is what makes `refreshing` reachable, and therefore
    // what makes the old "deliberately UNREACHABLE" annotation false.
    expect(resolveLibraryState({
      loadState: 'ready', isLoading: true, catalogCount: 3, resultCount: 3,
    })).toBe('refreshing');
  });

  it('a genuinely empty catalog with no refetch is empty-catalog', () => {
    expect(resolveLibraryState({
      loadState: 'empty', isLoading: false, catalogCount: 0, resultCount: 0,
    })).toBe('empty-catalog');
  });
});

describe('the hook can actually EMIT stale-while-retrying (F3)', () => {
  it('keeps refreshError set while the retry is in flight', async () => {
    // A first success, then a failed refresh => stale.
    apiGet.mockResolvedValueOnce(okBody());
    const { result } = renderHook(() => useExerciseSearch());
    await waitFor(() => expect(result.current.allExercises.length).toBe(catalog.length));

    apiGet.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { await result.current.refresh(); });
    await waitFor(() => expect(result.current.refreshError).toBeTruthy());

    // Now retry. The request is held open so the in-flight state is observable.
    let release: (value: unknown) => void = () => {};
    const pending = new Promise((resolve) => { release = resolve; });
    apiGet.mockReturnValueOnce(pending);

    let retry: Promise<void> = Promise.resolve();
    act(() => { retry = result.current.refresh(); });

    // THE ASSERTION THE BUG FAILED: stale AND loading at the same time, which is
    // what keeps the notice — and the Retry button inside it — on screen.
    await waitFor(() => {
      expect(result.current.refreshError).toBeTruthy();
      expect(result.current.isLoading).toBe(true);
      expect(resolveLibraryState({
        loadState: 'stale',
        isLoading: result.current.isLoading,
        catalogCount: result.current.allExercises.length,
        resultCount: result.current.allExercises.length,
      })).toBe('stale');
    });

    await act(async () => {
      release(okBody());
      await retry;
    });

    // A SUCCESSFUL retry is what finally clears it.
    expect(result.current.refreshError).toBeNull();
  });
});
