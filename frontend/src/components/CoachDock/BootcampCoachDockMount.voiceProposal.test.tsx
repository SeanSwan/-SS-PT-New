import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BootcampCoachDockMount from './BootcampCoachDockMount';
import { AI_BOOTCAMP_PLACE_EXERCISE, dispatchAIWorkoutEvent } from '../../utils/aiWorkoutEvents';

const exercise = { id: '1', name: 'Goblet Squat', exerciseKey: 'goblet-squat', exerciseType: 'strength', bodyPartCategory: 'Legs', primaryMuscles: ['Quadriceps'], secondaryMuscles: [], difficulty: 3, equipment: ['Dumbbell'], equipmentNeeded: ['Dumbbell'], source: 'swanstudios' };

vi.mock('./SurfaceCoachDock', () => ({ default: () => <div data-testid="coach-dock" /> }));
vi.mock('./useSurfaceCoachDock', () => ({
  pushSurfaceCoachReceipt: vi.fn(),
  useSurfaceCoachDock: () => ({}),
}));
vi.mock('../WorkoutLogger/useExerciseSearch', () => ({
  useExerciseSearch: () => ({ allExercises: [exercise], isLoading: false, loadError: null }),
}));

describe('BootcampCoachDockMount voice proposal integration', () => {
  it('keeps dictation inert until Apply, then uses the exact Rolodex exercise and requested station', () => {
    const onAddExercise = vi.fn();
    render(<BootcampCoachDockMount structureSummary="3 stations × 3 · 30 min" onAddExercise={onAddExercise} aiHandlers={{ setStationCount: vi.fn(), setExercisesPerStation: vi.fn(), setTargetDuration: vi.fn(), setOptPhase: vi.fn() }} />);

    act(() => expect(dispatchAIWorkoutEvent(AI_BOOTCAMP_PLACE_EXERCISE, { exerciseName: 'Goblet Squat', stationIndex: 1 })).toBe(true));
    expect(onAddExercise).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /apply goblet squat/i }));
    expect(onAddExercise).toHaveBeenCalledWith(exercise, 1);
  });
});
