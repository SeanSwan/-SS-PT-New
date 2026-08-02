import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import { WorkoutPlannerExerciseRow } from './WorkoutPlannerExerciseRow';

vi.mock('../../../WorkoutLogger/ExerciseMediaPreview', () => ({
  default: () => <div aria-label="Exercise media" />,
}));

const exercise: ExerciseSlim = {
  id: 'bench-press',
  exerciseKey: 'bench-press',
  name: 'Bench Press',
  exerciseType: 'Strength',
  bodyPartCategory: 'Chest',
  primaryMuscles: ['Pectorals'],
  difficulty: 2,
};

const renderRow = (inPlan: boolean, onAdd = vi.fn()) => {
  render(
    <WorkoutPlannerExerciseRow
      exercise={exercise}
      equipmentLabel="Barbell"
      impact="Medium Impact"
      selected={false}
      inPlan={inPlan}
      style={{}}
      onAdd={onAdd}
      onSelect={vi.fn()}
    />,
  );
  return onAdd;
};

describe('WorkoutPlannerExerciseRow in-plan state', () => {
  it('shows a visible badge and blocks both button and double-click duplicate adds', () => {
    const onAdd = renderRow(true);
    const addButton = screen.getByRole('button', { name: 'Bench Press already in plan' });

    expect(screen.getByText('Already in plan')).toBeInTheDocument();
    expect(addButton).toBeDisabled();
    fireEvent.click(addButton);
    fireEvent.doubleClick(screen.getByRole('listitem', { name: 'Bench Press exercise' }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('keeps an available exercise explicitly addable', () => {
    const onAdd = renderRow(false);
    fireEvent.click(screen.getByRole('button', { name: 'Add Bench Press' }));
    expect(onAdd).toHaveBeenCalledWith(exercise);
  });
});
