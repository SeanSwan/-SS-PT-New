import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CoachMessage } from './CoachMessage';
import type { CoachMessageData } from './SwanCoachTypes';
import { PENDING_WORKOUT_KEY } from '../../../../utils/parseAIWorkoutPlan';

function assistantMessage(content: string): CoachMessageData {
  return {
    id: 'msg-logger-handoff',
    role: 'assistant',
    content,
    timestamp: '2026-06-14T15:40:00.000Z',
  };
}

describe('CoachMessage logger handoff', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores a generated chat workout and routes to the active logger for review', async () => {
    const user = userEvent.setup();
    sessionStorage.clear();

    render(
      <MemoryRouter>
        <CoachMessage
          message={assistantMessage([
            'Workout for today:',
            '- Goblet squat: 3 sets x 10 reps',
            '- Push-up: 3 sets x 8 reps',
          ].join('\n'))}
          workoutLoggerRoute="/dashboard/client/log-workout?loadPlan=today"
        />
      </MemoryRouter>,
    );

    const sendLink = screen.getByRole('link', { name: /send 2 exercises to logger/i });
    expect(sendLink).toHaveAttribute('href', '/dashboard/client/log-workout?loadPlan=today');

    await user.click(sendLink);

    const stored = JSON.parse(sessionStorage.getItem(PENDING_WORKOUT_KEY) || '{}');
    expect(stored).toMatchObject({
      source: 'ai-chat',
      exercises: [
        { exerciseName: 'Goblet squat', sets: 3, reps: 10 },
        { exerciseName: 'Push-up', sets: 3, reps: 8 },
      ],
    });
  });

  it('does not show a logger action when Coach has no route client or workout draft', () => {
    render(
      <MemoryRouter>
        <CoachMessage
          message={assistantMessage('Keep training clean today and log your best set.')}
          workoutLoggerRoute={null}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /send .* logger/i })).not.toBeInTheDocument();
  });

  it('stages only the visible answer style when a dual-mode workout answer is switched', async () => {
    const user = userEvent.setup();
    sessionStorage.clear();

    render(
      <MemoryRouter>
        <CoachMessage
          message={assistantMessage([
            "Science: Keep today's session submaximal and preserve clean positions.",
            '',
            'Keep it 100:',
            '- Goblet squat: 3 sets x 10 reps',
            '- Push-up: 3 sets x 8 reps',
          ].join('\n'))}
          workoutLoggerRoute="/dashboard/client/log-workout?loadPlan=today"
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /send .* logger/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep It 100' }));
    await user.click(screen.getByRole('link', { name: /send 2 exercises to logger/i }));

    const stored = JSON.parse(sessionStorage.getItem(PENDING_WORKOUT_KEY) || '{}');
    expect(stored.exercises).toEqual([
      expect.objectContaining({ exerciseName: 'Goblet squat' }),
      expect.objectContaining({ exerciseName: 'Push-up' }),
    ]);
  });

  it('does not navigate silently when the generated workout cannot be staged', async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => { throw new Error('storage unavailable'); });

    render(
      <MemoryRouter>
        <CoachMessage
          message={assistantMessage([
            'Workout for today:',
            '- Goblet squat: 3 sets x 10 reps',
          ].join('\n'))}
          workoutLoggerRoute="/dashboard/client/log-workout?loadPlan=today"
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: /send 1 exercise to logger/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/could not stage this workout/i);
    expect(setItem).toHaveBeenCalledWith(
      PENDING_WORKOUT_KEY,
      expect.stringContaining('Goblet squat'),
    );

  });
});
