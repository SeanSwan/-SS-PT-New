import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { useBootcampSlotActions } from './useBootcampSlotActions';

const bootcamp = {
  exercises: [
    { exerciseName: 'Front Squat', board: 'main', stationIndex: 0, sortOrder: 1, durationSec: 35, restSec: 15 },
    { exerciseName: 'Band Chest Press', board: 'main', stationIndex: 1, sortOrder: 1, durationSec: 35, restSec: 15 },
  ],
} as GeneratedBootcamp;

describe('useBootcampSlotActions', () => {
  it('duplicates and moves only the selected main-board draft slot', () => {
    let current = bootcamp;
    const setBootcamp = vi.fn((updater: (value: GeneratedBootcamp | null) => GeneratedBootcamp | null) => {
      current = updater(current) as GeneratedBootcamp;
    });
    const setActiveStation = vi.fn();
    const { result } = renderHook(() => useBootcampSlotActions({ includeStretch: true, setBootcamp, setActiveStation }));

    act(() => result.current.handleDuplicateExercise(0));
    act(() => result.current.handleMoveExercise(1, 1));

    expect(current.exercises.slice(0, 3).map(exercise => [exercise.exerciseName, exercise.stationIndex, exercise.sortOrder])).toEqual([
      ['Front Squat', 0, 1],
      ['Front Squat', 1, 2],
      ['Band Chest Press', 1, 1],
    ]);
    expect(setActiveStation).toHaveBeenCalledWith(1);
  });
});
