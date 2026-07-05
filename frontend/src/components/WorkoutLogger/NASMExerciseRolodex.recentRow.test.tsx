/**
 * NASMExerciseRolodex recent-row — Slice 10 tests
 * ===============================================
 * Locks: chips render from persisted refs resolved against the live catalog
 * (stale ids drop), one-tap pick fires onSelectExercise AND records, the row
 * hides while searching, and selection still records recents.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NASMExerciseRolodex from './NASMExerciseRolodex';
import { readRecentExercises, recordRecentExercise } from './recentExercises';
import type { ExerciseSlim } from './useExerciseSearch';

const { mockUseExerciseSearch, mockScrollToRow, mockSetQuery } = vi.hoisted(() => ({
  mockUseExerciseSearch: vi.fn(),
  mockScrollToRow: vi.fn(),
  mockSetQuery: vi.fn(),
}));

vi.mock('react-window', () => ({
  useListRef: () => ({ current: { scrollToRow: mockScrollToRow } }),
  List: ({ rowComponent: RowComponent, rowCount, rowHeight, style, id, role, 'aria-label': ariaLabel }: any) => (
    <div id={id} role={role} aria-label={ariaLabel} style={style}>
      {Array.from({ length: rowCount }).map((_, index) => (
        <RowComponent key={index} index={index} style={{ height: rowHeight, top: index * rowHeight }} />
      ))}
    </div>
  ),
}));

vi.mock('./useExerciseSearch', async () => {
  const actual = await vi.importActual<typeof import('./useExerciseSearch')>('./useExerciseSearch');
  return { ...actual, useExerciseSearch: () => mockUseExerciseSearch() };
});

const exercises: ExerciseSlim[] = [
  { id: 'push-up', exerciseKey: 'push-up', name: 'Push-Up', exerciseType: 'strength', bodyPartCategory: 'Chest', primaryMuscles: ['Chest'], equipment: [], difficulty: 1 },
  { id: 'dumbbell-row', exerciseKey: 'dumbbell-row', name: 'Dumbbell Row', exerciseType: 'strength', bodyPartCategory: 'Back', primaryMuscles: ['Back'], equipment: ['Dumbbell'], difficulty: 1 },
];

const searchState = (over: Record<string, unknown> = {}) => ({
  results: exercises,
  allExercises: exercises,
  isSearching: false,
  isLoading: false,
  setQuery: mockSetQuery,
  setCategory: vi.fn(),
  query: '',
  category: 'All',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mockUseExerciseSearch.mockReturnValue(searchState());
});

describe('NASMExerciseRolodex recent row', () => {
  it('renders chips for stored recents, dropping ids missing from the catalog', () => {
    recordRecentExercise({ id: 'dumbbell-row', name: 'Dumbbell Row' });
    recordRecentExercise({ id: 'deleted-exercise', name: 'Ghost' });
    render(<NASMExerciseRolodex onSelectExercise={vi.fn()} isOpen onClose={vi.fn()} />);
    expect(screen.getByTestId('rolodex-recent-row')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Dumbbell Row again' })).toBeInTheDocument();
    expect(screen.queryByText('Ghost')).not.toBeInTheDocument();
  });

  it('one-tap pick selects the exercise and moves it to the front of recents', () => {
    recordRecentExercise({ id: 'push-up', name: 'Push-Up' });
    recordRecentExercise({ id: 'dumbbell-row', name: 'Dumbbell Row' });
    const onSelect = vi.fn();
    render(<NASMExerciseRolodex onSelectExercise={onSelect} isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Log Push-Up again' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'push-up' }));
    expect(readRecentExercises()[0].id).toBe('push-up');
  });

  it('hides the row while a query is active', () => {
    recordRecentExercise({ id: 'push-up', name: 'Push-Up' });
    mockUseExerciseSearch.mockReturnValue(searchState({ query: 'row' }));
    render(<NASMExerciseRolodex onSelectExercise={vi.fn()} isOpen onClose={vi.fn()} />);
    expect(screen.queryByTestId('rolodex-recent-row')).not.toBeInTheDocument();
  });

  it('renders nothing extra when no recents exist (empty-state unchanged)', () => {
    render(<NASMExerciseRolodex onSelectExercise={vi.fn()} isOpen onClose={vi.fn()} />);
    expect(screen.queryByTestId('rolodex-recent-row')).not.toBeInTheDocument();
  });

  it('selecting from the main list (double-click) records the exercise into recents', () => {
    const onSelect = vi.fn();
    render(<NASMExerciseRolodex onSelectExercise={onSelect} isOpen onClose={vi.fn()} />);
    fireEvent.doubleClick(screen.getByRole('option', { name: /push-up/i }));
    expect(onSelect).toHaveBeenCalled();
    expect(readRecentExercises()[0]).toEqual({ id: 'push-up', name: 'Push-Up' });
  });
});
