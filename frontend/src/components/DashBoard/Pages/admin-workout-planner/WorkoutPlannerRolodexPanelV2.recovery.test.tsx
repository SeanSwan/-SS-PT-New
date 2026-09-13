/**
 * WorkoutPlannerRolodexPanelV2 recovery states — S04b-2c / R-H13 (Planner V2)
 * ==========================================================================
 * s04-architecture.md: "V2 fixtures use PlannerDataContext.Provider and
 * PlannerActionsContext.Provider in plannerContexts, with minimal typed
 * rolodex/local/pageActions data."
 *
 * DISCLOSURE: the two context values are minimal synthetic fixtures cast to the
 * real context types. Full authenticated planner orchestration (roster fetch,
 * generation, save) is NOT covered here and is not claimed.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkoutPlannerRolodexPanelV2 from './WorkoutPlannerRolodexPanelV2';
import { PlannerDataContext } from './plannerContexts/PlannerDataContext';
import { PlannerActionsContext } from './plannerContexts/PlannerActionsContext';
import type {
  PlannerActionsValue,
  PlannerDataValue,
} from './plannerContexts/WorkoutPlannerProvider';
import { LIBRARY_COPY } from '../../../WorkoutLogger/exerciseSearchLibraryState';

vi.mock('react-window', () => ({
  List: ({ rowCount }: any) => <div data-testid="planner-rolodex-v2-list">{rowCount} rows</div>,
}));

const noop = () => {};

const buildRolodex = (over: Record<string, unknown> = {}) => ({
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
  exercisesLoadState: 'ready',
  exercisesLoadError: null,
  exercisesRefreshError: null,
  exerciseCatalogCount: 12,
  exercisesSearching: false,
  refreshExercises: vi.fn(),
  setSearchQuery: vi.fn(),
  setFilterCategory: vi.fn(),
  setSourceFilter: vi.fn(),
  setExerciseTypeFilter: vi.fn(),
  setEquipmentFilter: vi.fn(),
  setImpactFilter: vi.fn(),
  clearRolodexFilters: vi.fn(),
  ...over,
});

const removeExercise = vi.fn();

const renderV2 = (rolodexOver: Record<string, unknown> = {}) => {
  const rolodex = buildRolodex(rolodexOver);
  const data = {
    rolodex,
    local: { planExercises: [], generatedPlan: null },
  } as unknown as PlannerDataValue;
  const actions = {
    rolodex,
    pageActions: { removeExercise },
  } as unknown as PlannerActionsValue;

  return render(
    <PlannerDataContext.Provider value={data}>
      <PlannerActionsContext.Provider value={actions}>
        <WorkoutPlannerRolodexPanelV2 />
      </PlannerActionsContext.Provider>
    </PlannerDataContext.Provider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WorkoutPlannerRolodexPanelV2 recovery states', () => {
  it('shows the shared loading skeleton and never claims nothing matched', () => {
    renderV2({ exercisesLoadState: 'loading', exercisesLoading: true, filteredExerciseCount: 0, exerciseCatalogCount: 0 });

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.queryByText('No exercises match this training stack.')).not.toBeInTheDocument();
    expect(screen.queryByText(LIBRARY_COPY.emptyCatalogTitle)).not.toBeInTheDocument();
  });

  it('uses the shared PlannerError for an initial load failure and retries once', () => {
    const refreshExercises = vi.fn();
    renderV2({
      exercisesLoadState: 'error',
      exercisesLoadError: 'The exercise library failed to load.',
      filteredExerciseCount: 0,
      exerciseCatalogCount: 0,
      refreshExercises,
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The exercise library failed to load.');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refreshExercises).toHaveBeenCalledTimes(1);
  });

  it('distinguishes an empty catalog from empty filters', () => {
    const refreshExercises = vi.fn();
    renderV2({
      exercisesLoadState: 'empty',
      filteredExerciseCount: 0,
      exerciseCatalogCount: 0,
      refreshExercises,
    });

    expect(screen.getByText(LIBRARY_COPY.emptyCatalogTitle)).toBeInTheDocument();
    expect(screen.queryByText('No exercises match this training stack.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refreshExercises).toHaveBeenCalledTimes(1);
  });

  it('offers filter clearing (never a library retry) when filters match nothing', () => {
    const refreshExercises = vi.fn();
    const clearRolodexFilters = vi.fn();
    renderV2({
      exercisesLoadState: 'ready',
      filteredExerciseCount: 0,
      exerciseCatalogCount: 12,
      activeFilterCount: 2,
      refreshExercises,
      clearRolodexFilters,
    });

    expect(screen.getByText('No exercises match this training stack.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: LIBRARY_COPY.clearFilters }));
    expect(clearRolodexFilters).toHaveBeenCalledTimes(1);
    expect(refreshExercises).not.toHaveBeenCalled();
    expect(removeExercise).not.toHaveBeenCalled();
  });

  it('preserves cached rows and stays quiet while a refresh is in flight', () => {
    renderV2({ exercisesLoadState: 'ready', exercisesLoading: true });

    expect(screen.getByTestId('planner-rolodex-v2-list')).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('keeps cached rows visible and discloses a failed refresh', () => {
    renderV2({ exercisesLoadState: 'stale' });

    expect(screen.getByTestId('planner-rolodex-v2-list')).toBeInTheDocument();
    expect(screen.getByText(LIBRARY_COPY.staleTitle)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: LIBRARY_COPY.retry })).toBeInTheDocument();
    // A usable cache is not a blocking alert.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('withholds retry while a fetch is already in flight', () => {
    const refreshExercises = vi.fn();
    renderV2({
      exercisesLoadState: 'stale',
      exercisesLoading: true,
      filteredExerciseCount: 0,
      exerciseCatalogCount: 12,
      refreshExercises,
    });

    expect(screen.queryByRole('button', { name: LIBRARY_COPY.retryBusy })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: LIBRARY_COPY.retry })).not.toBeInTheDocument();
    expect(refreshExercises).not.toHaveBeenCalled();
  });

  it('shows the searching status instead of a final count while a search is pending', () => {
    renderV2({ exercisesSearching: true });

    const count = screen.getByTestId('planner-rolodex-v2-count');
    expect(count).toHaveAttribute('aria-busy', 'true');
    expect(count).toHaveTextContent(LIBRARY_COPY.searchPending);
    expect(count).not.toHaveTextContent('4 results');
  });

  it('renders the list and no recovery notice when ready', () => {
    renderV2();

    expect(screen.getByTestId('planner-rolodex-v2-list')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.queryByText(LIBRARY_COPY.staleTitle)).not.toBeInTheDocument();
    expect(noop).toBeTypeOf('function');
  });
});
