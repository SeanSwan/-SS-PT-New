/**
 * FILE: DailyHealthLoop.test.tsx
 * PURPOSE: Locks Home mission behavior for workout fallback and nutrition guidance.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DailyHealthLoop from './DailyHealthLoop';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('DailyHealthLoop', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('promotes a verified nutrition next action without routing to workout logging', async () => {
    const user = userEvent.setup();
    const openNutrition = vi.fn();

    render(
      <DailyHealthLoop
        streakDays={3}
        level={4}
        progressPercent={42}
        tierName="Sapphire Tide"
        logWorkoutPath="/dashboard/client/log-workout"
        nutritionAction={{
          title: 'Add a water check-in before the next meal.',
          copy: '3 of 8 glasses are logged. Hydration is the easiest win to tighten today.',
          label: 'Open Nutrition Today',
        }}
        onOpenNutrition={openNutrition}
      />,
    );

    expect(screen.getByText('Add a water check-in before the next meal.')).toBeInTheDocument();
    expect(screen.getByText(/3 of 8 glasses are logged/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open nutrition today/i }));

    expect(openNutrition).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the workout logging fallback when nutrition guidance is unavailable', async () => {
    const user = userEvent.setup();

    render(
      <DailyHealthLoop
        streakDays={0}
        level={1}
        progressPercent={12}
        tierName="First Flight"
        logWorkoutPath="/dashboard/client/log-workout"
      />,
    );

    await user.click(screen.getByRole('button', { name: /log workout/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout');
  });
});
