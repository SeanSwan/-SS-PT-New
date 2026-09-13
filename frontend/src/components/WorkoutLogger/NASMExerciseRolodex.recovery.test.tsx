/**
 * NASMExerciseRolodex library recovery states — S04 / R-H13 consumer tests
 * ========================================================================
 * Locks the logger's visible answer for every library state so a failed or
 * empty library can never masquerade as "no matches", and so a retry never
 * mutates the draft.
 *
 * The hook is mocked at the boundary on purpose: this slice owns PRESENTATION.
 * The hook's own fetch/worker/revision contract is locked separately in
 * useExerciseSearch.test.tsx.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NASMExerciseRolodex from './NASMExerciseRolodex';
import { LIBRARY_COPY } from './NASMExerciseRolodex.states';
import type { ExerciseSlim } from './useExerciseSearch';
import { StyledBox } from '@/components/ui/StyledBox';
import { reactWindowStyleProps } from '@/components/ui/reactWindowStyleProps';

const { mockUseExerciseSearch, mockScrollToRow, mockSetQuery, mockSetCategory, mockRefresh } = vi.hoisted(() => ({
  mockUseExerciseSearch: vi.fn(),
  mockScrollToRow: vi.fn(),
  mockSetQuery: vi.fn(),
  mockSetCategory: vi.fn(),
  mockRefresh: vi.fn(),
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
  { id: 'push-up', exerciseKey: 'push-up', name: 'Push-Up', exerciseType: 'strength', bodyPartCategory: 'Chest', primaryMuscles: ['Chest'], difficulty: 1 },
  { id: 'dumbbell-row', exerciseKey: 'dumbbell-row', name: 'Dumbbell Row', exerciseType: 'strength', bodyPartCategory: 'Back', primaryMuscles: ['Back'], difficulty: 1 },
];

const searchState = (over: Record<string, unknown> = {}) => ({
  results: exercises,
  allExercises: exercises,
  isSearching: false,
  isLoading: false,
  loadError: null,
  loadState: 'ready',
  refreshError: null,
  setQuery: mockSetQuery,
  setCategory: mockSetCategory,
  query: '',
  category: null,
  refresh: mockRefresh,
  ...over,
});

const renderRolodex = () => render(
  <NASMExerciseRolodex isOpen onClose={vi.fn()} onSelectExercise={vi.fn()} />,
);

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mockUseExerciseSearch.mockReturnValue(searchState());
});

describe('NASMExerciseRolodex library recovery states', () => {
  it('shows a loading status and never claims there are no results', () => {
    mockUseExerciseSearch.mockReturnValue(searchState({
      results: [], allExercises: [], isLoading: true, loadState: 'loading',
    }));

    renderRolodex();

    expect(screen.getByText(LIBRARY_COPY.loading)).toBeInTheDocument();
    expect(screen.queryByText(LIBRARY_COPY.filterEmptyTitle)).not.toBeInTheDocument();
    expect(screen.queryByText(LIBRARY_COPY.emptyCatalogTitle)).not.toBeInTheDocument();
    expect(screen.queryByText(/Start typing to search/)).not.toBeInTheDocument();
  });

  it('names an initial load failure honestly and retries exactly once per click', () => {
    mockUseExerciseSearch.mockReturnValue(searchState({
      results: [], allExercises: [], loadState: 'error',
      loadError: 'The exercise library failed to load.',
    }));

    renderRolodex();

    const notice = screen.getByRole('alert');
    expect(notice).toHaveTextContent(LIBRARY_COPY.errorTitle);
    expect(notice).toHaveTextContent('The exercise library failed to load.');

    const retry = screen.getByTestId('rolodex-library-retry');
    expect(retry).toBeEnabled();
    fireEvent.click(retry);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('distinguishes a genuinely empty catalog from empty filters', () => {
    mockUseExerciseSearch.mockReturnValue(searchState({
      results: [], allExercises: [], loadState: 'empty',
    }));

    renderRolodex();

    expect(screen.getByText(LIBRARY_COPY.emptyCatalogTitle)).toBeInTheDocument();
    expect(screen.queryByText(LIBRARY_COPY.filterEmptyTitle)).not.toBeInTheDocument();
    expect(screen.getByTestId('rolodex-library-retry')).toBeInTheDocument();
    expect(screen.queryByTestId('rolodex-library-clear')).not.toBeInTheDocument();
  });

  it('offers filter clearing (never a retry) when the catalog is fine but filters match nothing', () => {
    mockUseExerciseSearch.mockReturnValue(searchState({
      results: [], allExercises: exercises, loadState: 'ready',
      query: 'zzz', setQuery: mockSetQuery, setCategory: mockSetCategory,
    }));

    renderRolodex();

    expect(screen.getByText(LIBRARY_COPY.filterEmptyTitle)).toBeInTheDocument();
    expect(screen.queryByTestId('rolodex-library-retry')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('rolodex-library-clear'));
    expect(mockSetQuery).toHaveBeenCalledWith('');
    expect(mockSetCategory).toHaveBeenCalledWith(null);
    // Clearing filters must not mutate the draft.
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('keeps cached rows visible and discloses a failed refresh instead of hiding it', () => {
    mockUseExerciseSearch.mockReturnValue(searchState({
      loadState: 'stale',
      refreshError: 'The exercise library failed to load.',
    }));

    renderRolodex();

    // Rows survive — a stale cache is still usable.
    expect(screen.getByRole('option', { name: /dumbbell row/i })).toBeInTheDocument();
    expect(screen.getByText(LIBRARY_COPY.staleTitle)).toBeInTheDocument();
    expect(screen.getByTestId('rolodex-library-retry')).toBeInTheDocument();
    // A usable cache must not raise a blocking alert.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables retry while a fetch is already in flight', () => {
    mockUseExerciseSearch.mockReturnValue(searchState({
      results: [], allExercises: [], loadState: 'stale', isLoading: true,
    }));

    renderRolodex();

    const retry = screen.getByTestId('rolodex-library-retry');
    expect(retry).toBeDisabled();
    fireEvent.click(retry);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('preserves cached rows and stays quiet while a refresh is in flight', () => {
    mockUseExerciseSearch.mockReturnValue(searchState({
      loadState: 'ready', isLoading: true,
    }));

    renderRolodex();

    // Rows stay on screen; a skeleton must never replace a usable catalog.
    expect(screen.getByRole('option', { name: /dumbbell row/i })).toBeInTheDocument();
    expect(screen.queryByTestId('rolodex-library-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rolodex-library-retry')).not.toBeInTheDocument();
  });

  it('renders no recovery notice at all when the library is ready', () => {
    renderRolodex();

    expect(screen.queryByTestId('rolodex-library-retry')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rolodex-library-loading')).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /dumbbell row/i })).toBeInTheDocument();
  });

  it('marks the status line busy and withholds a final count while a search is pending', () => {
    mockUseExerciseSearch.mockReturnValue(searchState({
      query: 'row', isSearching: true, results: exercises,
    }));

    renderRolodex();

    const status = screen.getByTestId('rolodex-status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('searching');
    // An earlier result count must not be announced as final.
    expect(status).not.toHaveTextContent('2 matching');
  });

  it('tolerates a hook boundary fixture that predates the S03 loadState field', () => {
    mockUseExerciseSearch.mockReturnValue({
      results: exercises,
      allExercises: exercises,
      isSearching: false,
      isLoading: false,
      setQuery: mockSetQuery,
      setCategory: mockSetCategory,
      query: '',
      category: null,
      refresh: mockRefresh,
    });

    renderRolodex();

    expect(screen.getByRole('option', { name: /dumbbell row/i })).toBeInTheDocument();
    expect(screen.queryByTestId('rolodex-library-retry')).not.toBeInTheDocument();
  });
});
