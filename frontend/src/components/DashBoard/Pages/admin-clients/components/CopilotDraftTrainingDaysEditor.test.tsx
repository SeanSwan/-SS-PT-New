import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkoutPlan } from './copilot-types';
import CopilotDraftTrainingDaysEditor from './CopilotDraftTrainingDaysEditor';

const draftPlan: WorkoutPlan = {
  planName: 'Strength Draft',
  durationWeeks: 4,
  summary: 'Build strength.',
  days: [
    {
      dayNumber: 1,
      name: 'Push',
      focus: 'Chest',
      exercises: [
        {
          name: 'Bench Press',
          setScheme: '4x8',
          restPeriod: 90,
          tempo: '3-1-1',
          intensityGuideline: 'RPE 7',
          notes: 'Control descent.',
        },
      ],
    },
  ],
};

describe('CopilotDraftTrainingDaysEditor', () => {
  it('keeps day and exercise editing callbacks wired', () => {
    const toggleDay = vi.fn();
    const updateDay = vi.fn();
    const updateExercise = vi.fn();
    const addExercise = vi.fn();
    const removeExercise = vi.fn();

    render(
      <CopilotDraftTrainingDaysEditor
        days={draftPlan.days}
        expandedDays={new Set([0])}
        toggleDay={toggleDay}
        updateDay={updateDay}
        updateExercise={updateExercise}
        addExercise={addExercise}
        removeExercise={removeExercise}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /day 1: push/i }));
    expect(toggleDay).toHaveBeenCalledWith(0);

    fireEvent.change(screen.getByLabelText(/day name/i), {
      target: { value: 'Push Strength' },
    });
    expect(updateDay).toHaveBeenCalledWith(0, 'name', 'Push Strength');

    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'Incline Press' },
    });
    expect(updateExercise).toHaveBeenCalledWith(0, 0, 'name', 'Incline Press');

    fireEvent.click(screen.getByRole('button', { name: /remove bench press/i }));
    expect(removeExercise).toHaveBeenCalledWith(0, 0);

    fireEvent.click(screen.getByRole('button', { name: /add exercise/i }));
    expect(addExercise).toHaveBeenCalledWith(0);
  });
});
