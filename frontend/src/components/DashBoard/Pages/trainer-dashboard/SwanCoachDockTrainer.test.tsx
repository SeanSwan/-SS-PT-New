import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SwanCoachDockTrainer from './SwanCoachDockTrainer';
import {
  TRAINER_HOME_COACH_PATH,
  TRAINER_HOME_LOG_WORKOUT_PATH,
} from './TrainerHomeQuickActions.config';

vi.mock('../../../Shared/AICommandBar', () => ({
  AICommandBar: () => <div data-testid="ai-command-bar" />,
}));

describe('SwanCoachDockTrainer workout-first actions', () => {
  it('routes the primary Log Workout chip straight to the client picker', async () => {
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
    expect(onNavigate).toHaveBeenCalledWith(TRAINER_HOME_LOG_WORKOUT_PATH);
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

  it('renders the trainer profile photo and handle when auth provides them', () => {
    render(
      <SwanCoachDockTrainer
        trainerName="Sean Swan"
        trainerHandle="@sean"
        trainerPhotoUrl="https://sswanstudios.com/uploads/sean.jpg"
        sessionCount={2}
        level={4}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByAltText('Sean Swan profile')).toHaveAttribute(
      'src',
      'https://sswanstudios.com/uploads/sean.jpg',
    );
    expect(screen.getByText('@sean')).toBeInTheDocument();
  });

  it('falls back to trainer initials when the profile photo URL is unsafe', () => {
    render(
      <SwanCoachDockTrainer
        trainerName="Sean Swan"
        trainerHandle="@sean"
        trainerPhotoUrl="javascript:alert(1)"
        sessionCount={2}
        level={4}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.queryByAltText('Sean Swan profile')).toBeNull();
    expect(screen.getByText('SS')).toBeInTheDocument();
  });

  it('uses an ASCII trainer-day separator to avoid encoded bullet artifacts', () => {
    render(
      <SwanCoachDockTrainer
        trainerName="Coach"
        sessionCount={1}
        level={4}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText('1 session today - Lv.4')).toBeInTheDocument();
  });

  it('keeps Log Workout direct even when the parent provides a live Coach path', async () => {
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

    expect(onNavigate).toHaveBeenCalledWith(TRAINER_HOME_LOG_WORKOUT_PATH);
    expect(onNavigate).not.toHaveBeenCalledWith(coachPath);
  });
});
