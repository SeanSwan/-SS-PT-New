/**
 * useRolodexDeepLink + Rolodex integration + logger source lock — Slice 11
 * ========================================================================
 * Locks: query seeding once per open, exact-match auto-select exactly once,
 * no auto-select without the flag or on inexact queries, re-open resets, and
 * the WorkoutLogger source contract (?exercise= param -> Rolodex props).
 */

import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useRolodexDeepLink from './useRolodexDeepLink';
import NASMExerciseRolodex from './NASMExerciseRolodex';
import type { ExerciseSlim } from './useExerciseSearch';
import { StyledBox } from '@/components/ui/StyledBox';
import { reactWindowStyleProps } from '@/components/ui/reactWindowStyleProps';

const { mockUseExerciseSearch, mockScrollToRow, mockSetQuery } = vi.hoisted(() => ({
  mockUseExerciseSearch: vi.fn(),
  mockScrollToRow: vi.fn(),
  mockSetQuery: vi.fn(),
}));

vi.mock('react-window', () => ({
  useListRef: () => ({ current: { scrollToRow: mockScrollToRow } }),
  List: ({ rowComponent: RowComponent, rowCount, rowHeight, style, id, role, 'aria-label': ariaLabel }: any) => (
    <StyledBox as="div" id={id} role={role} aria-label={ariaLabel} $style={style}>
      {Array.from({ length: rowCount }).map((_, index) => (
        <RowComponent key={index} index={index} {...reactWindowStyleProps({ height: rowHeight, top: index * rowHeight })} />
      ))}
    </StyledBox>
  ),
}));

vi.mock('./useExerciseSearch', async () => {
  const actual = await vi.importActual<typeof import('./useExerciseSearch')>('./useExerciseSearch');
  return { ...actual, useExerciseSearch: () => mockUseExerciseSearch() };
});

const exercises: ExerciseSlim[] = [
  { id: 'face-pull', exerciseKey: 'face-pull', name: 'Face Pull', exerciseType: 'strength', bodyPartCategory: 'Back', primaryMuscles: ['Back'], equipment: ['Cable'], difficulty: 1 },
];

describe('useRolodexDeepLink (unit)', () => {
  const base = {
    isOpen: true,
    initialQuery: 'Face Pull',
    autoSelectExact: true,
    results: exercises,
    setQuery: vi.fn(),
    onExactMatch: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('seeds the query once and auto-selects the exact match once', () => {
    const setQuery = vi.fn();
    const onExactMatch = vi.fn();
    const { rerender } = renderHook(
      (props) => useRolodexDeepLink(props),
      { initialProps: { ...base, setQuery, onExactMatch } },
    );
    rerender({ ...base, setQuery, onExactMatch });
    expect(setQuery).toHaveBeenCalledTimes(1);
    expect(setQuery).toHaveBeenCalledWith('Face Pull');
    expect(onExactMatch).toHaveBeenCalledTimes(1);
    expect(onExactMatch).toHaveBeenCalledWith(exercises[0]);
  });

  it('never auto-selects without the flag or on an inexact query', () => {
    const onExactMatch = vi.fn();
    renderHook(() => useRolodexDeepLink({ ...base, autoSelectExact: false, onExactMatch }));
    renderHook(() => useRolodexDeepLink({ ...base, initialQuery: 'Face', onExactMatch }));
    expect(onExactMatch).not.toHaveBeenCalled();
  });

  it('re-arms after a close/open cycle', () => {
    const setQuery = vi.fn();
    const { rerender } = renderHook(
      (props) => useRolodexDeepLink(props),
      { initialProps: { ...base, setQuery, isOpen: true } },
    );
    rerender({ ...base, setQuery, isOpen: false });
    rerender({ ...base, setQuery, isOpen: true });
    expect(setQuery).toHaveBeenCalledTimes(2);
  });
});

describe('NASMExerciseRolodex deep-link integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockUseExerciseSearch.mockReturnValue({
      results: exercises,
      allExercises: exercises,
      isSearching: false,
      isLoading: false,
      setQuery: mockSetQuery,
      setCategory: vi.fn(),
      query: '',
      category: 'All',
    });
  });

  it('prefills the query and auto-adds the exact match through onSelectExercise', async () => {
    const onSelect = vi.fn();
    render(
      <NASMExerciseRolodex
        onSelectExercise={onSelect}
        isOpen
        onClose={vi.fn()}
        initialQuery="Face Pull"
        autoSelectExact
      />,
    );
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'face-pull' })));
    expect(mockSetQuery).toHaveBeenCalledWith('Face Pull');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('without a deep link, renders normally and never auto-selects', () => {
    const onSelect = vi.fn();
    render(<NASMExerciseRolodex onSelectExercise={onSelect} isOpen onClose={vi.fn()} />);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});

describe('WorkoutLogger deep-link source contract', () => {
  it('reads ?exercise=, forwards a ONE-SHOT deep link, and consumes it on close', () => {
    const source = readFileSync(resolve(__dirname, './WorkoutLogger.tsx'), 'utf8');
    expect(source).toContain("searchParams.get('exercise')");
    expect(source).toContain('initialQuery={deepLinkExercise}');
    expect(source).toContain('autoSelectExact={Boolean(deepLinkExercise)}');
    expect(source).toMatch(/routeExerciseOpenedRef[\s\S]*setShowExerciseSearch\(true\)/);
    // Consume-on-close: manual re-opens must never surprise-add while the
    // ?exercise= param lingers in the URL (select also routes through close).
    expect(source).toMatch(/onClose=\{[\s\S]*?setDeepLinkExercise\(null\)/);
  });
});
