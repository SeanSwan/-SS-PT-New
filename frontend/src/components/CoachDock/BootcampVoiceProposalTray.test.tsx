import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BootcampVoiceProposalTray from './BootcampVoiceProposalTray';

const hookState = vi.hoisted(() => ({
  allExercises: [] as Array<{ id: string; name: string; exerciseKey: string; exerciseType: string; bodyPartCategory: string; primaryMuscles: string[]; secondaryMuscles: string[]; difficulty: number; equipment: string[]; equipmentNeeded: string[]; source: string }>,
  isLoading: false,
  loadError: null as string | null,
}));

vi.mock('../WorkoutLogger/useExerciseSearch', () => ({
  useExerciseSearch: () => hookState,
}));

describe('BootcampVoiceProposalTray', () => {
  it('only applies an exact Rolodex match after the trainer confirms', () => {
    const exercise = { id: '1', name: 'Goblet Squat', exerciseKey: 'goblet-squat', exerciseType: 'strength', bodyPartCategory: 'Legs', primaryMuscles: ['Quadriceps'], secondaryMuscles: [], difficulty: 3, equipment: ['Dumbbell'], equipmentNeeded: ['Dumbbell'], source: 'swanstudios' };
    hookState.allExercises = [exercise];
    const onApplyExercise = vi.fn();
    render(<BootcampVoiceProposalTray proposal={{ exerciseName: 'goblet squat', stationIndex: 2 }} onApplyExercise={onApplyExercise} onDismiss={vi.fn()} />);

    expect(screen.getByText(/class has not changed/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /apply goblet squat/i }));
    expect(onApplyExercise).toHaveBeenCalledWith(exercise, 2);
  });

  it('never offers Apply when the spoken name is absent from the canonical Rolodex', () => {
    hookState.allExercises = [];
    render(<BootcampVoiceProposalTray proposal={{ exerciseName: 'Invented Burpee' }} onApplyExercise={vi.fn()} onDismiss={vi.fn()} />);

    expect(screen.getByText(/could not find an exact Rolodex match/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply invented burpee/i })).toBeDisabled();
  });
});
