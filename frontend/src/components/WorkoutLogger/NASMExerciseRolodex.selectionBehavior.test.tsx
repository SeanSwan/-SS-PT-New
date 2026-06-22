import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NASMExerciseRolodex from './NASMExerciseRolodex';
import type { ExerciseSlim } from './useExerciseSearch';

const { mockUseExerciseSearch, mockScrollToRow } = vi.hoisted(() => ({
  mockUseExerciseSearch: vi.fn(),
  mockScrollToRow: vi.fn(),
}));

vi.mock('react-window', () => ({
  useListRef: () => ({ current: { scrollToRow: mockScrollToRow } }),
  List: ({ rowComponent: RowComponent, rowCount, rowHeight, style, id, role, 'aria-label': ariaLabel }: any) => (
    <div id={id} role={role} aria-label={ariaLabel} style={style}>
      {Array.from({ length: rowCount }).map((_, index) => (
        <RowComponent
          key={index}
          index={index}
          style={{ height: rowHeight, top: index * rowHeight }}
        />
      ))}
    </div>
  ),
}));

vi.mock('./useExerciseSearch', async () => {
  const actual = await vi.importActual<typeof import('./useExerciseSearch')>('./useExerciseSearch');
  return {
    ...actual,
    useExerciseSearch: () => mockUseExerciseSearch(),
  };
});

const exercises: ExerciseSlim[] = [
  {
    id: 'push-up',
    name: 'Push-Up',
    exerciseType: 'strength',
    bodyPartCategory: 'Chest',
    primaryMuscles: ['Chest'],
    equipment: [],
  },
  {
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    exerciseType: 'strength',
    bodyPartCategory: 'Back',
    primaryMuscles: ['Back'],
    equipment: ['Dumbbell'],
  },
];

describe('NASMExerciseRolodex selection behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    mockUseExerciseSearch.mockReturnValue({
      results: exercises,
      allExercises: exercises,
      isSearching: false,
      isLoading: false,
      setQuery: vi.fn(),
      setCategory: vi.fn(),
      query: '',
      category: null,
      refresh: vi.fn(),
    });
  });

  it('previews an exercise on single click and adds it only on double click', () => {
    const onSelectExercise = vi.fn();

    render(
      <NASMExerciseRolodex
        isOpen
        onClose={vi.fn()}
        onSelectExercise={onSelectExercise}
      />
    );

    const row = screen.getByRole('option', { name: /dumbbell row/i });

    fireEvent.click(row);
    expect(onSelectExercise).not.toHaveBeenCalled();
    expect(screen.getByText(/previewing Dumbbell Row/i)).toBeTruthy();

    fireEvent.doubleClick(screen.getByRole('option', { name: /dumbbell row/i }));
    expect(onSelectExercise).toHaveBeenCalledTimes(1);
    expect(onSelectExercise).toHaveBeenCalledWith(expect.objectContaining({
      id: 'dumbbell-row',
      name: 'Dumbbell Row',
    }));
  });
});
