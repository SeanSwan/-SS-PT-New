/**
 * useSwanExercisePicker — debounce + persistence tests (Phase 2.3a)
 *
 * Locks: the 300ms query debounce into the shared search worker hook,
 * sessionStorage persistence round-trip, and URL-strategy hydration.
 * The underlying useExerciseSearch (worker + fetch) is mocked — these
 * tests own only the wrapper contract.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setQuery = vi.fn();
vi.mock('../../WorkoutLogger/useExerciseSearch', () => ({
  useExerciseSearch: () => ({
    results: [],
    allExercises: [],
    isSearching: false,
    isLoading: false,
    setQuery,
    setCategory: vi.fn(),
    query: '',
    category: null,
    refresh: vi.fn(),
  }),
}));

import { useSwanExercisePicker } from './useSwanExercisePicker';

describe('useSwanExercisePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setQuery.mockClear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces query commits by 300ms and commits the final value once', () => {
    const { result } = renderHook(() => useSwanExercisePicker({ mode: 'workout-page' }));

    act(() => { result.current.onInputChange('sq'); });
    act(() => { vi.advanceTimersByTime(150); });
    act(() => { result.current.onInputChange('squat'); });
    act(() => { vi.advanceTimersByTime(299); });
    expect(setQuery).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(setQuery).toHaveBeenCalledTimes(1);
    expect(setQuery).toHaveBeenCalledWith('squat');
    expect(result.current.inputValue).toBe('squat');
  });

  it("persists filters to sessionStorage under 'session' strategy and hydrates on re-init", () => {
    const opts = { mode: 'workout-page' as const, persistKey: 'planner', persistence: 'session' as const };
    const first = renderHook(() => useSwanExercisePicker(opts));
    act(() => {
      first.result.current.onInputChange('press');
      first.result.current.setTypeFilter('compound');
    });
    act(() => { vi.advanceTimersByTime(300); });
    first.unmount();

    const stored = JSON.parse(sessionStorage.getItem('swan-picker:planner') ?? '{}');
    expect(stored.q).toBe('press');
    expect(stored.type).toBe('compound');

    const second = renderHook(() => useSwanExercisePicker(opts));
    expect(second.result.current.inputValue).toBe('press');
    expect(second.result.current.typeFilter).toBe('compound');
  });

  it("hydrates from the URL under 'url' strategy", () => {
    window.history.replaceState(null, '', '/?spk_page_q=row&spk_page_type=core');
    const { result } = renderHook(() =>
      useSwanExercisePicker({ mode: 'workout-page', persistKey: 'page', persistence: 'url' }));
    expect(result.current.inputValue).toBe('row');
    expect(result.current.typeFilter).toBe('core');
  });

  it("writes filters into the URL without navigation under 'url' strategy", () => {
    const { result } = renderHook(() =>
      useSwanExercisePicker({ mode: 'workout-page', persistKey: 'page', persistence: 'url' }));
    act(() => { result.current.setMuscleFilter('Glutes'); });
    expect(window.location.search).toContain('spk_page_muscle=Glutes');
  });
});
