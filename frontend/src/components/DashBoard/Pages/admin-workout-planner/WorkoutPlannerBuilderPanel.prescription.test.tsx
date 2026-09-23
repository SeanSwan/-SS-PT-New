import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BuilderWorkoutContent } from './WorkoutPlannerBuilderPanel.exerciseRows';
import type { PlanExercise } from './WorkoutPlannerTypes';

const exercise = (overrides: Partial<PlanExercise> = {}): PlanExercise => ({
  id: 'row-1',
  exerciseSlim: {
    id: 'front-squat',
    name: 'Front Squat',
    exerciseKey: 'front-squat',
    exerciseType: 'compound',
    bodyPartCategory: 'legs',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: [],
    difficulty: 300,
  },
  sets: 3,
  reps: '8',
  tempo: '2-0-2',
  restSeconds: 0,
  intensityPercent: undefined,
  intensityGuideline: '70-80% 1RM',
  notes: '',
  ...overrides,
});

const renderRow = (planExercise: PlanExercise, onUpdateExercise = vi.fn()) => {
  render(
    <BuilderWorkoutContent
      generating={false}
      planExercises={[planExercise]}
      swapTarget={null}
      onSelectExercise={vi.fn()}
      onUpdateExercise={onUpdateExercise}
      onRemoveExercise={vi.fn()}
      onBeginSwap={vi.fn()}
      onCancelSwap={vi.fn()}
    />,
  );
  return onUpdateExercise;
};

const StatefulBuilderRow = ({ initial }: { initial: PlanExercise }) => {
  const [row, setRow] = useState(initial);
  return (
    <BuilderWorkoutContent
      generating={false}
      planExercises={[row]}
      swapTarget={null}
      onSelectExercise={vi.fn()}
      onUpdateExercise={(_id, field, value) => {
        setRow(previous => ({ ...previous, [field]: value }));
      }}
      onRemoveExercise={vi.fn()}
      onBeginSwap={vi.fn()}
      onCancelSwap={vi.fn()}
    />
  );
};

describe('builder prescription control', () => {
  it('renders a blank accessible intensity editor and the saved legacy text', () => {
    renderRow(exercise());

    const input = screen.queryByLabelText('Intensity for Front Squat');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Saved intensity: 70-80% 1RM')).toBeInTheDocument();
  });

  it('treats a numeric edit as deliberate replacement of legacy text', () => {
    const onUpdateExercise = renderRow(exercise(), vi.fn());
    const input = screen.getByLabelText('Intensity for Front Squat');

    fireEvent.change(input, { target: { value: '83' } });

    expect(onUpdateExercise).toHaveBeenNthCalledWith(1, 'row-1', 'intensityPercent', 83);
    expect(onUpdateExercise).toHaveBeenNthCalledWith(2, 'row-1', 'intensityGuideline', undefined);
  });

  it('persists an edited number and removes the legacy text in component state', () => {
    render(<StatefulBuilderRow initial={exercise()} />);
    fireEvent.change(screen.getByLabelText('Intensity for Front Squat'), {
      target: { value: '83' },
    });

    expect(screen.getByLabelText('Intensity for Front Squat')).toHaveValue(83);
    expect(screen.queryByText('Saved intensity: 70-80% 1RM')).not.toBeInTheDocument();
  });

  it('shows the explicit unspecified state when no saved prescription exists', () => {
    renderRow(exercise({ intensityGuideline: undefined }));

    expect(screen.getByText('Intensity not specified')).toBeInTheDocument();
  });
});
