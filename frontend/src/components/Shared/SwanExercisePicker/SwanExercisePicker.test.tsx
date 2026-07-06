/**
 * SwanExercisePicker shell tests (Phase 2.3a)
 *
 * Locks: the always-emit-ExerciseSlim invariant, excludeIds dedupe at the
 * rendered surface, truthful count line + loading/empty states, labeled
 * controls (a11y), an 840-row full-library smoke, and source locks for
 * virtualization + 44px touch targets.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ExerciseSlim } from './types';

/* Repo pattern: react-window is heavy in jsdom — render every row. */
vi.mock('react-window', () => ({
  useListRef: () => ({ current: null }),
  List: ({ rowComponent: RowComponent, rowCount, rowHeight, rowProps, style }: any) => (
    <div style={style} data-testid="swan-picker-virtual-list">
      {Array.from({ length: rowCount }).map((_, index) => (
        <RowComponent key={index} index={index} style={{ height: rowHeight }} {...(rowProps ?? {})} />
      ))}
    </div>
  ),
}));

const makeExercise = (id: number, over: Partial<ExerciseSlim> = {}): ExerciseSlim => ({
  id: String(id),
  name: `Exercise ${id}`,
  exerciseKey: `ex-${id}`,
  exerciseType: 'compound',
  bodyPartCategory: 'Full Body',
  primaryMuscles: ['Quadriceps'],
  secondaryMuscles: [],
  difficulty: 100,
  equipment: [],
  equipmentNeeded: [],
  source: 'swanstudios',
  optPhases: [],
  canBePerformedAtHome: true,
  catalogVideoSample: null,
  ...over,
} as ExerciseSlim);

const searchState = {
  results: [] as ExerciseSlim[],
  allExercises: [] as ExerciseSlim[],
  isLoading: false,
  isSearching: false,
};

vi.mock('../../WorkoutLogger/useExerciseSearch', () => ({
  useExerciseSearch: () => ({
    ...searchState,
    setQuery: vi.fn(),
    setCategory: vi.fn(),
    query: '',
    category: null,
    refresh: vi.fn(),
  }),
}));

/* Preview's lazy cues fetch — not under test here. */
vi.mock('../../../features/teach-mode/hooks/useExerciseTeachData', () => ({
  useExerciseTeachData: () => ({ data: null, isLoading: false, error: null, refetch: vi.fn() }),
}));

import SwanExercisePicker from './SwanExercisePicker';
import { SWAN_PICKER_MODES } from './types';

const setPool = (pool: ExerciseSlim[]) => {
  searchState.results = pool;
  searchState.allExercises = pool;
  searchState.isLoading = false;
};

describe('SwanExercisePicker', () => {
  it('emits the full ExerciseSlim on the row action (always-emit invariant)', () => {
    const pool = [makeExercise(1, { name: 'Barbell Squat' }), makeExercise(2)];
    setPool(pool);
    const onSelect = vi.fn();
    render(<SwanExercisePicker mode="workout-page" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /add barbell squat to workout/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(pool[0]);
  });

  it('hides excluded ids from the rendered list', () => {
    setPool([makeExercise(1, { name: 'Barbell Squat' }), makeExercise(2, { name: 'Plank' })]);
    render(<SwanExercisePicker mode="workout-page" onSelect={vi.fn()} excludeIds={['1']} />);

    expect(screen.queryByText('Barbell Squat')).toBeNull();
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 exercises/i)).toBeInTheDocument();
  });

  it('shows a labeled search input and an honest load-failure state when the library is empty', () => {
    setPool([]);
    render(<SwanExercisePicker mode="workout-page" onSelect={vi.fn()} />);

    expect(screen.getByRole('searchbox', { name: /search exercises/i })).toBeInTheDocument();
    expect(screen.getByText(/couldn't load the exercise library/i)).toBeInTheDocument();
    expect(screen.queryByText(/no exercises found/i)).toBeNull();
  });

  it('shows the filtered-empty state only when the library actually loaded', () => {
    setPool([makeExercise(1), makeExercise(2)]);
    render(<SwanExercisePicker mode="workout-page" onSelect={vi.fn()} excludeIds={['1', '2']} />);

    expect(screen.getByText(/no exercises found/i)).toBeInTheDocument();
    expect(screen.getByText(/0 of 2 exercises/i)).toBeInTheDocument();
  });

  it('shows the loading state while the library fetches', () => {
    setPool([]);
    searchState.isLoading = true;
    render(<SwanExercisePicker mode="workout-page" onSelect={vi.fn()} />);
    expect(screen.getByText(/loading exercises/i)).toBeInTheDocument();
    searchState.isLoading = false;
  });

  it('survives the full 840-exercise library (smoke)', () => {
    setPool(Array.from({ length: 840 }, (_, i) => makeExercise(i + 1)));
    render(<SwanExercisePicker mode="workout-page" onSelect={vi.fn()} />);
    expect(screen.getByText(/840 of 840 exercises/i)).toBeInTheDocument();
    expect(screen.getByTestId('swan-picker-virtual-list')).toBeInTheDocument();
  });

  it('opens the preview sheet from the row details trigger, and adding from it emits + closes (workout-page)', () => {
    const pool = [makeExercise(1, { name: 'Barbell Squat' })];
    setPool(pool);
    const onSelect = vi.fn();
    render(<SwanExercisePicker mode="workout-page" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /preview barbell squat/i }));
    const dialog = screen.getByRole('dialog', { name: /barbell squat/i });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /add barbell squat to workout/i }));
    expect(onSelect).toHaveBeenCalledWith(pool[0]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('locks preview ON for the live workout-page mode and renders row media only when the mode says so', () => {
    expect(SWAN_PICKER_MODES['workout-page'].showPreview).toBe(true);
    setPool([makeExercise(1)]);
    const { unmount } = render(<SwanExercisePicker mode="bootcamp-station" onSelect={vi.fn()} />);
    expect(screen.getByTestId('swan-picker-row-media')).toBeInTheDocument();
    unmount();
    render(<SwanExercisePicker mode="workout-page" onSelect={vi.fn()} />);
    expect(screen.queryByTestId('swan-picker-row-media')).toBeNull();
  });

  it('virtualizes via react-window and keeps 44px touch targets (source locks)', () => {
    const list = readFileSync(resolve(__dirname, 'SwanExercisePickerList.tsx'), 'utf8');
    expect(list).toContain("from 'react-window'");
    const styles = readFileSync(resolve(__dirname, 'styles.ts'), 'utf8');
    expect(styles).toContain('min-height: 44px');
    expect(styles).toContain('min-width: 44px');
  });
});
