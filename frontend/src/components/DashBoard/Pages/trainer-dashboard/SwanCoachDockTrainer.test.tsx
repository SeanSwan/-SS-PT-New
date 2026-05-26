import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SwanCoachDockTrainer from './SwanCoachDockTrainer';

vi.mock('../../../Shared/AICommandBar', () => ({
  AICommandBar: () => <div data-testid="ai-command-bar" />,
}));

describe('SwanCoachDockTrainer workout-first actions', () => {
  it('labels the primary logger route as Log Workout', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <SwanCoachDockTrainer
        trainerName="Coach"
        sessionCount={2}
        level={4}
        onNavigate={onNavigate}
      />
    );

    await user.click(screen.getByRole('button', { name: /^log workout$/i }));

    expect(screen.queryByRole('button', { name: /^log session$/i })).toBeNull();
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/trainer/log-workout');
  });
});
