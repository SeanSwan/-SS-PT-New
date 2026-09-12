/** G04C-T05 — Rolodex recents remain standalone-compatible and memory-only in Coach. */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NASMExerciseRolodex from '../../../WorkoutLogger/NASMExerciseRolodex';
import type { ExerciseSlim } from '../../../WorkoutLogger/useExerciseSearch';

const { mockUseExerciseSearch } = vi.hoisted(() => ({ mockUseExerciseSearch: vi.fn() }));

vi.mock('react-window', () => ({
  useListRef: () => ({ current: { scrollToRow: vi.fn() } }),
  List: ({ rowComponent: RowComponent, rowCount, rowHeight, id, role, 'aria-label': ariaLabel }: any) => (
    <div id={id} role={role} aria-label={ariaLabel} style={{ height: rowHeight }}>
      {Array.from({ length: rowCount }).map((_, index) => <RowComponent key={index} index={index} style={{}} />)}
    </div>
  ),
}));

vi.mock('../../../WorkoutLogger/useExerciseSearch', async () => {
  const actual = await vi.importActual<typeof import('../../../WorkoutLogger/useExerciseSearch')>('../../../WorkoutLogger/useExerciseSearch');
  return { ...actual, useExerciseSearch: () => mockUseExerciseSearch() };
});

const canonical: ExerciseSlim = {
  id: '33333333-3333-4333-8333-333333333333', exerciseKey: 'barbell-bench-press', name: 'Barbell Bench Press',
  exerciseType: 'strength', bodyPartCategory: 'Chest', primaryMuscles: ['Chest'], difficulty: 2, equipment: ['Barbell'],
};

const state = (over: Partial<Record<string, unknown>> = {}) => ({
  results: [canonical], allExercises: [canonical], isSearching: false, isLoading: false, loadError: null,
  setQuery: vi.fn(), setCategory: vi.fn(), query: '', category: null, refresh: vi.fn(), ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
  mockUseExerciseSearch.mockReturnValue(state());
});

describe('G04.1 library picker privacy and compatibility', () => {
  it('G04C-T05 keeps default Rolodex recents behavior for standalone Logger', () => {
    window.localStorage.setItem('ss-workout-logger-recent-exercises', JSON.stringify([{ id: canonical.id, name: canonical.name }]));
    render(<NASMExerciseRolodex isOpen onClose={vi.fn()} onSelectExercise={vi.fn()} />);
    expect(screen.getByTestId('rolodex-recent-row')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Log ${canonical.name} again` })).toBeInTheDocument();
  });

  it('G04C-T05 bypasses both recent reads and writes when memory-only mode is false', () => {
    window.localStorage.setItem('ss-workout-logger-recent-exercises', JSON.stringify([{ id: canonical.id, name: canonical.name }]));
    const getItem = vi.spyOn(window.localStorage, 'getItem');
    const setItem = vi.spyOn(window.localStorage, 'setItem');
    const onSelect = vi.fn();
    render(<NASMExerciseRolodex isOpen onClose={vi.fn()} onSelectExercise={onSelect} persistRecentSelections={false} />);
    expect(getItem).not.toHaveBeenCalled();
    expect(screen.queryByTestId('rolodex-recent-row')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add to Workout' }));
    expect(onSelect).toHaveBeenCalledWith(canonical);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('G04C-T02 surfaces empty, failed, retry and close states without a fabricated selection', () => {
    const refresh = vi.fn();
    const onClose = vi.fn();
    mockUseExerciseSearch.mockReturnValue(state({ results: [], allExercises: [], loadError: 'The exercise library failed to load.', refresh }));
    render(<NASMExerciseRolodex isOpen onClose={onClose} onSelectExercise={vi.fn()} />);
    expect(screen.getByText(/exercise library failed to load/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search exercises' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Add to Workout' })).toBeNull();
  });
});
