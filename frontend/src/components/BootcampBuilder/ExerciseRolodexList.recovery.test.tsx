/**
 * ExerciseRolodexList recovery states — S04b-2b / R-H13 (Bootcamp library)
 * =======================================================================
 * s04-architecture.md names `ExerciseRolodexPanel.recovery.test.tsx`. The
 * Bootcamp panel delegates loading/empty rendering to `ExerciseRolodexList`,
 * and the panel had no line-cap headroom, so the child was admitted and the
 * recovery contract is locked where it is actually rendered. The panel's own
 * composition/line-cap contract is locked separately by
 * ExerciseRolodexPanel.composition.test.ts.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExerciseRolodexList from './ExerciseRolodexList';
import { LIBRARY_COPY } from '../WorkoutLogger/exerciseSearchLibraryState';
import type { ExerciseSlim } from '../WorkoutLogger/useExerciseSearch';

vi.mock('react-window', () => ({
  List: ({ rowCount }: any) => <div data-testid="bootcamp-rolodex-list">{rowCount} pairs</div>,
}));

const exercises: ExerciseSlim[] = [
  { id: 'push-up', exerciseKey: 'push-up', name: 'Push-Up', exerciseType: 'strength', bodyPartCategory: 'Chest', primaryMuscles: ['Chest'], difficulty: 1 },
  { id: 'dumbbell-row', exerciseKey: 'dumbbell-row', name: 'Dumbbell Row', exerciseType: 'strength', bodyPartCategory: 'Back', primaryMuscles: ['Back'], difficulty: 1 },
];

const baseProps = {
  exercises,
  isLoading: false,
  selectedId: null,
  onAddExercise: vi.fn(),
  onSelectExercise: vi.fn(),
  onRetry: vi.fn(),
  onClearFilters: vi.fn(),
};

const renderList = (over: Record<string, unknown> = {}) =>
  render(<ExerciseRolodexList {...baseProps} {...over} />);

describe('ExerciseRolodexList recovery states', () => {
  it('shows skeletons while loading and never claims nothing matched', () => {
    renderList({ exercises: [], isLoading: true, libraryState: 'loading' });

    expect(screen.queryByText('No exercises match your filters.')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bootcamp-rolodex-retry')).not.toBeInTheDocument();
  });

  it('names an initial load failure honestly and retries once per click', () => {
    const onRetry = vi.fn();
    renderList({
      exercises: [],
      libraryState: 'error',
      loadError: 'The exercise library failed to load.',
      onRetry,
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(LIBRARY_COPY.errorTitle);
    expect(alert).toHaveTextContent('The exercise library failed to load.');

    const retry = screen.getByTestId('bootcamp-rolodex-retry');
    expect(retry).toBeEnabled();
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('distinguishes an empty catalog from empty filters', () => {
    renderList({ exercises: [], libraryState: 'empty-catalog' });

    expect(screen.getByTestId('bootcamp-rolodex-empty-catalog')).toHaveTextContent(
      LIBRARY_COPY.emptyCatalogTitle,
    );
    expect(screen.queryByTestId('bootcamp-rolodex-filter-empty')).not.toBeInTheDocument();
    expect(screen.getByTestId('bootcamp-rolodex-retry')).toBeInTheDocument();
  });

  it('offers filter clearing (never a library retry) when filters match nothing', () => {
    const onClearFilters = vi.fn();
    const onRetry = vi.fn();
    renderList({
      exercises: [],
      libraryState: 'filter-empty',
      hasActiveFilters: true,
      onClearFilters,
      onRetry,
    });

    expect(screen.getByTestId('bootcamp-rolodex-filter-empty')).toHaveTextContent(
      'No exercises match your filters.',
    );
    expect(screen.queryByTestId('bootcamp-rolodex-retry')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('bootcamp-rolodex-clear'));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
    // Clearing filters must not add an exercise or trigger a refetch.
    expect(onRetry).not.toHaveBeenCalled();
    expect(baseProps.onAddExercise).not.toHaveBeenCalled();
  });

  it('preserves cached rows and stays quiet while a refresh is in flight', () => {
    renderList({ isLoading: true, libraryState: 'refreshing' });

    expect(screen.getByTestId('bootcamp-rolodex-list')).toBeInTheDocument();
    expect(screen.queryByTestId('bootcamp-rolodex-retry')).not.toBeInTheDocument();
  });

  it('keeps cached rows visible and discloses a failed refresh', () => {
    renderList({
      libraryState: 'stale',
      refreshError: 'The exercise library failed to load.',
    });

    expect(screen.getByTestId('bootcamp-rolodex-list')).toBeInTheDocument();
    expect(screen.getByTestId('bootcamp-rolodex-stale')).toHaveTextContent(LIBRARY_COPY.staleTitle);
    expect(screen.getByTestId('bootcamp-rolodex-retry')).toBeInTheDocument();
    // A usable cache is not a blocking alert.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables retry while a fetch is already in flight', () => {
    const onRetry = vi.fn();
    renderList({ exercises: [], isLoading: true, libraryState: 'stale', onRetry });

    const retry = screen.getByTestId('bootcamp-rolodex-retry');
    expect(retry).toBeDisabled();
    fireEvent.click(retry);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('renders rows and no recovery notice when ready', () => {
    renderList({ libraryState: 'ready' });

    expect(screen.getByTestId('bootcamp-rolodex-list')).toBeInTheDocument();
    expect(screen.queryByTestId('bootcamp-rolodex-retry')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bootcamp-rolodex-stale')).not.toBeInTheDocument();
  });

  it('falls back to a derived state when the caller passes no libraryState', () => {
    renderList({ libraryState: undefined });

    expect(screen.getByTestId('bootcamp-rolodex-list')).toBeInTheDocument();
    expect(screen.queryByTestId('bootcamp-rolodex-retry')).not.toBeInTheDocument();
  });
});
