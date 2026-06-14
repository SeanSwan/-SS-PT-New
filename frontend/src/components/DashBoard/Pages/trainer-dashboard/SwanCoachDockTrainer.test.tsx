import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SwanCoachDockTrainer from './SwanCoachDockTrainer';
import { TRAINER_HOME_COACH_PATH } from './TrainerHomeQuickActions.config';

vi.mock('../../../Shared/AICommandBar', () => ({
  AICommandBar: () => <div data-testid="ai-command-bar" />,
}));

describe('SwanCoachDockTrainer workout-first actions', () => {
  it('routes the primary Log Workout chip through Coach Command', async () => {
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
    expect(onNavigate).toHaveBeenCalledWith(TRAINER_HOME_COACH_PATH);
  });

  it('offers a top-dock Ask Coach route with the staged trainer-day prompt', async () => {
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

    await user.click(screen.getByRole('button', { name: /^ask coach$/i }));

    expect(onNavigate).toHaveBeenCalledWith(TRAINER_HOME_COACH_PATH);
  });

  it('uses the live trainer-day Coach path when the parent provides one', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const coachPath = '/dashboard/trainer/coach-assistant?teachPrompt=live-day';

    render(
      <SwanCoachDockTrainer
        trainerName="Coach"
        sessionCount={2}
        level={4}
        coachPath={coachPath}
        onNavigate={onNavigate}
      />
    );

    await user.click(screen.getByRole('button', { name: /^ask coach$/i }));

    expect(onNavigate).toHaveBeenCalledWith(coachPath);
  });

  it('uses the live trainer-day Coach path for Log Workout too', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const coachPath = '/dashboard/trainer/coach-assistant?intent=trainer_daily_command&teachPrompt=live-day';

    render(
      <SwanCoachDockTrainer
        trainerName="Coach"
        sessionCount={2}
        level={4}
        coachPath={coachPath}
        onNavigate={onNavigate}
      />
    );

    await user.click(screen.getByRole('button', { name: /^log workout$/i }));

    expect(onNavigate).toHaveBeenCalledWith(coachPath);
  });
});
