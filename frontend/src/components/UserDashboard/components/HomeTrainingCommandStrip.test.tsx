import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomeTrainingCommandStrip from './HomeTrainingCommandStrip';

describe('HomeTrainingCommandStrip', () => {
  it('keeps training, progress, and coach actions one click from user Home', () => {
    const navigate = vi.fn();
    const onProgress = vi.fn();

    render(
      <HomeTrainingCommandStrip
        coachPath="/dashboard/client/coach-assistant"
        logWorkoutPath="/dashboard/client/log-workout?loadPlan=today"
        onNavigate={navigate}
        onProgress={onProgress}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('aria-label', 'Primary action: Log Workout');
    expect(screen.getByText(/start here/i)).toBeInTheDocument();
    expect(screen.getByText(/save today before memory fades/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /primary action: log workout/i }));
    expect(navigate).toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today');

    fireEvent.click(screen.getByRole('button', { name: /view progress/i }));
    expect(onProgress).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /ask coach/i }));
    expect(navigate).toHaveBeenCalledWith('/dashboard/client/coach-assistant');
  });
});
