import { fireEvent, render, screen, within } from '@testing-library/react';
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

    const flow = screen.getByRole('list', { name: /user training today flow/i });
    const steps = within(flow).getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(within(steps[0]).getByText(/step 1/i)).toBeInTheDocument();
    expect(within(steps[1]).getByText(/step 2/i)).toBeInTheDocument();
    expect(within(steps[2]).getByText(/step 3/i)).toBeInTheDocument();
    expect(within(steps[0]).getByRole('button', { name: /log workout/i }))
      .toHaveAttribute('aria-label', 'Step 1: Log Workout');
    expect(screen.getByText(/save today before memory fades/i)).toBeInTheDocument();

    fireEvent.click(within(steps[0]).getByRole('button', { name: /log workout/i }));
    expect(navigate).toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today');

    fireEvent.click(within(steps[1]).getByRole('button', { name: /view progress/i }));
    expect(onProgress).toHaveBeenCalledTimes(1);

    fireEvent.click(within(steps[2]).getByRole('button', { name: /ask coach/i }));
    expect(navigate).toHaveBeenCalledWith('/dashboard/client/coach-assistant');
  });
});
