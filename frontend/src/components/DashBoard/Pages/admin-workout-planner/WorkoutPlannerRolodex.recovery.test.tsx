/**
 * WorkoutPlannerRolodexPanel recovery states — S04b-2b / R-H13 (Planner V1)
 * ========================================================================
 * Locks the Planner V1 rolodex's visible answer for every library state.
 *
 * This panel is presentational, so it is mounted directly with explicit props —
 * no planner context fixture is needed, and the assertions stay about the
 * surface rather than about orchestration (which
 * useWorkoutPlannerRolodexState.recovery.test.tsx covers separately).
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkoutPlannerRolodexPanel from './WorkoutPlannerRolodexPanel';
import { LIBRARY_COPY } from '../../../WorkoutLogger/exerciseSearchLibraryState';

vi.mock('react-window', () => ({
  List: ({ rowCount, id, role, 'aria-label': ariaLabel }: any) => (
    <div id={id} role={role} aria-label={ariaLabel} data-testid="planner-rolodex-list">
      {rowCount} rows
    </div>
  ),
}));

const baseProps = {
  filteredExerciseCount: 4,
  activeFilterCount: 0,
  exercisesLoading: false,
  searchQuery: '',
  filterCategory: null,
  sourceFilter: null,
  exerciseTypeFilter: null,
  equipmentFilter: null,
  impactFilter: null,
  exerciseRowRenderer: (() => null) as any,
  onSearchQueryChange: vi.fn(),
  onFilterCategoryChange: vi.fn(),
  onSourceFilterChange: vi.fn(),
  onExerciseTypeFilterChange: vi.fn(),
  onEquipmentFilterChange: vi.fn(),
  onImpactFilterChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetryExercises: vi.fn(),
};

const renderPanel = (over: Record<string, unknown> = {}) =>
  render(<WorkoutPlannerRolodexPanel {...baseProps} {...over} />);

describe('WorkoutPlannerRolodexPanel recovery states', () => {
  it('shows a loading status and never claims the pool is empty', () => {
    renderPanel({
      exercisesLoadState: 'loading',
      exercisesLoading: true,
      filteredExerciseCount: 0,
      exerciseCatalogCount: 0,
    });

    expect(screen.getByText(LIBRARY_COPY.loading)).toBeInTheDocument();
    expect(screen.queryByText(LIBRARY_COPY.filterEmptyBody)).not.toBeInTheDocument();
    expect(screen.queryByText(LIBRARY_COPY.emptyCatalogTitle)).not.toBeInTheDocument();
  });

  it('names an initial load failure honestly and retries once per click', () => {
    const onRetryExercises = vi.fn();
    renderPanel({
      exercisesLoadState: 'error',
      exercisesLoadError: 'The exercise library failed to load.',
      filteredExerciseCount: 0,
      exerciseCatalogCount: 0,
      onRetryExercises,
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(LIBRARY_COPY.errorTitle);
    expect(alert).toHaveTextContent('The exercise library failed to load.');

    const retry = screen.getByTestId('planner-rolodex-retry');
    expect(retry).toBeEnabled();
    fireEvent.click(retry);
    expect(onRetryExercises).toHaveBeenCalledTimes(1);
  });

  it('distinguishes an empty catalog from empty filters', () => {
    renderPanel({
      exercisesLoadState: 'empty',
      filteredExerciseCount: 0,
      exerciseCatalogCount: 0,
    });

    expect(screen.getByTestId('planner-rolodex-empty-catalog')).toHaveTextContent(
      LIBRARY_COPY.emptyCatalogTitle,
    );
    expect(screen.queryByTestId('planner-rolodex-filter-empty')).not.toBeInTheDocument();
    expect(screen.getByTestId('planner-rolodex-retry')).toBeInTheDocument();
  });

  it('offers filter clearing (never a library retry) when filters match nothing', () => {
    const onClearFilters = vi.fn();
    const onRetryExercises = vi.fn();
    renderPanel({
      exercisesLoadState: 'ready',
      filteredExerciseCount: 0,
      exerciseCatalogCount: 12,
      activeFilterCount: 2,
      onClearFilters,
      onRetryExercises,
    });

    expect(screen.getByTestId('planner-rolodex-filter-empty')).toHaveTextContent(
      'No exercises match this training stack.',
    );
    expect(screen.queryByTestId('planner-rolodex-retry')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Exercise Rolodex filters' }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
    // Clearing filters must not trigger a library refetch.
    expect(onRetryExercises).not.toHaveBeenCalled();
  });

  it('preserves cached rows and stays quiet while a refresh is in flight', () => {
    renderPanel({
      exercisesLoadState: 'ready',
      exercisesLoading: true,
      filteredExerciseCount: 4,
      exerciseCatalogCount: 12,
    });

    // A usable catalog must never be replaced by skeletons.
    expect(screen.getByTestId('planner-rolodex-list')).toBeInTheDocument();
    expect(screen.queryByText(LIBRARY_COPY.loading)).not.toBeInTheDocument();
    expect(screen.queryByTestId('planner-rolodex-retry')).not.toBeInTheDocument();
  });

  it('keeps cached rows visible and discloses a failed refresh', () => {
    renderPanel({
      exercisesLoadState: 'stale',
      filteredExerciseCount: 4,
      exerciseCatalogCount: 12,
    });

    expect(screen.getByTestId('planner-rolodex-list')).toBeInTheDocument();
    expect(screen.getByTestId('planner-rolodex-stale')).toHaveTextContent(LIBRARY_COPY.staleTitle);
    expect(screen.getByTestId('planner-rolodex-retry')).toBeInTheDocument();
    // A usable cache is not a blocking alert.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables retry while a fetch is already in flight', () => {
    const onRetryExercises = vi.fn();
    renderPanel({
      exercisesLoadState: 'stale',
      exercisesLoading: true,
      filteredExerciseCount: 0,
      exerciseCatalogCount: 12,
      onRetryExercises,
    });

    const retry = screen.getByTestId('planner-rolodex-retry');
    expect(retry).toBeDisabled();
    fireEvent.click(retry);
    expect(onRetryExercises).not.toHaveBeenCalled();
  });

  it('marks the status rail busy while a search is pending', () => {
    renderPanel({ exercisesSearching: true });

    const status = screen.getByTestId('planner-rolodex-status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent(LIBRARY_COPY.searchPending);
  });

  it('renders the list and no recovery notice when ready', () => {
    renderPanel({ exercisesLoadState: 'ready' });

    expect(screen.getByTestId('planner-rolodex-list')).toBeInTheDocument();
    expect(screen.queryByTestId('planner-rolodex-retry')).not.toBeInTheDocument();
    expect(screen.queryByTestId('planner-rolodex-stale')).not.toBeInTheDocument();
  });
});
