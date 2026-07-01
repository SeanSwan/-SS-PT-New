import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CoachMessage } from './CoachMessage';
import type { CoachMessageData } from './SwanCoachTypes';
import { PENDING_WORKOUT_QUEUE_KEY } from '../../../../utils/parseAIWorkoutPlan';

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
    sessionStorage.clear();
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

    const reviewLink = screen.getByRole('link', { name: /review 2 exercises in logger/i });
    expect(reviewLink).toHaveAttribute('href', '/dashboard/client/log-workout?loadPlan=today');
    expect(reviewLink).toHaveTextContent(/review in logger/i);

    expect(screen.getByText('Workout ready for review')).toBeInTheDocument();
    expect(screen.getByText(/nothing logs until you save it/i)).toBeInTheDocument();
    expect(screen.getByText('Active logger')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    const preview = within(screen.getByLabelText('Parsed workout preview'));
    expect(preview.getByText('Goblet squat')).toBeInTheDocument();
    expect(preview.getByText('3 x 10')).toBeInTheDocument();
    expect(preview.getByText('Push-up')).toBeInTheDocument();
    expect(preview.getByText('3 x 8')).toBeInTheDocument();

    await user.click(reviewLink);

    const queued = JSON.parse(sessionStorage.getItem(PENDING_WORKOUT_QUEUE_KEY) || '[]');
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({
      source: 'ai-chat',
      exercises: [
        { exerciseName: 'Goblet squat', sets: 3, reps: 10 },
        { exerciseName: 'Push-up', sets: 3, reps: 8 },
      ],
    });
  });

  it('labels generated workout handoffs with the active client or self logger target', () => {
    render(
      <MemoryRouter>
        <CoachMessage
          message={assistantMessage([
            'Workout for today:',
            '- Goblet squat: 3 sets x 10 reps',
          ].join('\n'))}
          workoutLoggerRoute="/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today"
          workoutLoggerScopeLabel="Sean Swan"
        />
      </MemoryRouter>,
    );

    const target = within(screen.getByLabelText('Workout handoff target'));
    expect(target.getByText('Target')).toBeInTheDocument();
    expect(target.getByText('Sean Swan')).toBeInTheDocument();
    expect(screen.queryByText('Active logger')).not.toBeInTheDocument();
  });

  it('queues multiple generated chat workouts instead of erasing the first one', async () => {
    const user = userEvent.setup();
    sessionStorage.clear();

    const { rerender } = render(
      <MemoryRouter>
        <CoachMessage
          message={assistantMessage('- Goblet squat: 3 sets x 10 reps')}
          workoutLoggerRoute="/dashboard/client/log-workout?loadPlan=today"
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: /review 1 exercise in logger/i }));

    rerender(
      <MemoryRouter>
        <CoachMessage
          message={assistantMessage('- Push-up: 4 sets x 8 reps')}
          workoutLoggerRoute="/dashboard/client/log-workout?loadPlan=today"
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: /review 1 exercise in logger/i }));

    const queued = JSON.parse(sessionStorage.getItem(PENDING_WORKOUT_QUEUE_KEY) || '[]');
    expect(queued.map((plan: { exercises: { exerciseName: string }[] }) => (
      plan.exercises[0]?.exerciseName
    ))).toEqual(['Goblet squat', 'Push-up']);
  });

  it('keeps long generated workouts compact with a three-exercise preview', () => {
    render(
      <MemoryRouter>
        <CoachMessage
          message={assistantMessage([
            '- Goblet squat: 3 sets x 10 reps',
            '- Push-up: 3 sets x 8 reps',
            '- Romanian deadlift: 4 sets x 8 reps @ 135 lbs',
            '- Plank: 3 sets x 30 reps',
          ].join('\n'))}
          workoutLoggerRoute="/dashboard/client/log-workout?loadPlan=today"
        />
      </MemoryRouter>,
    );

    const preview = within(screen.getByLabelText('Parsed workout preview'));
    expect(preview.getByText('Goblet squat')).toBeInTheDocument();
    expect(preview.getByText('Push-up')).toBeInTheDocument();
    expect(preview.getByText('Romanian deadlift')).toBeInTheDocument();
    expect(preview.queryByText('Plank')).not.toBeInTheDocument();
    expect(screen.getByText('+1 more ready')).toBeInTheDocument();
  });

  it('stages duration and round-based visible workout rows for logger review', async () => {
    const user = userEvent.setup();
    sessionStorage.clear();

    render(
      <MemoryRouter>
        <CoachMessage
          message={assistantMessage([
            'Warm-up:',
            '- Incline walk - 5 minutes',
            'Strength:',
            '- Goblet squat: 3 sets x 10 reps',
            'Finisher:',
            '- Bike sprint - 6 rounds x 20 sec',
          ].join('\n'))}
          workoutLoggerRoute="/dashboard/client/log-workout?loadPlan=today"
        />
      </MemoryRouter>,
    );

    const reviewLink = screen.getByRole('link', { name: /review 3 exercises in logger/i });
    const preview = within(screen.getByLabelText('Parsed workout preview'));
    expect(preview.getByText('Incline walk')).toBeInTheDocument();
    expect(preview.getByText('5 minutes')).toBeInTheDocument();
    expect(preview.getByText('Bike sprint')).toBeInTheDocument();
    expect(preview.getByText('6 rounds x 20 sec')).toBeInTheDocument();

    await user.click(reviewLink);

    const queued = JSON.parse(sessionStorage.getItem(PENDING_WORKOUT_QUEUE_KEY) || '[]');
    expect(queued[0].exercises).toEqual([
      expect.objectContaining({ exerciseName: 'Incline walk', sets: 1, reps: 0, notes: '5 minutes' }),
      expect.objectContaining({ exerciseName: 'Goblet squat', sets: 3, reps: 10 }),
      expect.objectContaining({ exerciseName: 'Bike sprint', sets: 6, reps: 0, notes: '6 rounds x 20 sec' }),
    ]);
  });

  it('offers logger review for trainer shorthand generated in Coach chat', async () => {
    const user = userEvent.setup();
    sessionStorage.clear();

    render(
      <MemoryRouter>
        <CoachMessage
          message={assistantMessage([
            'Keep it 100:',
            'A1. DB Romanian deadlift \u2013 4x8 @ 85 lbs, rest 75 sec',
            'A2) TRX row: 3 \u00d7 12',
            '- 1-arm cable row - 3 x 10 reps',
          ].join('\n'))}
          workoutLoggerRoute="/dashboard/trainer/log-workout?clientId=42&source=swan-coach&loadPlan=today"
          workoutLoggerScopeLabel="Client #42"
        />
      </MemoryRouter>,
    );

    const reviewLink = screen.getByRole('link', { name: /review 3 exercises in logger/i });
    const preview = within(screen.getByLabelText('Parsed workout preview'));
    expect(preview.getByText('DB Romanian deadlift')).toBeInTheDocument();
    expect(preview.getByText('4 x 8 @ 85 lbs')).toBeInTheDocument();
    expect(preview.getByText('TRX row')).toBeInTheDocument();
    expect(preview.getByText('1-arm cable row')).toBeInTheDocument();

    await user.click(reviewLink);

    const queued = JSON.parse(sessionStorage.getItem(PENDING_WORKOUT_QUEUE_KEY) || '[]');
    expect(queued[0].targetClientId).toBe(42);
    expect(queued[0].exercises).toEqual([
      expect.objectContaining({ exerciseName: 'DB Romanian deadlift', sets: 4, reps: 8, weight: 85, restTime: 75 }),
      expect.objectContaining({ exerciseName: 'TRX row', sets: 3, reps: 12 }),
      expect.objectContaining({ exerciseName: '1-arm cable row', sets: 3, reps: 10 }),
    ]);
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

    expect(screen.queryByRole('link', { name: /review .* logger/i })).not.toBeInTheDocument();
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

    expect(screen.queryByRole('link', { name: /review .* logger/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep It 100' }));
    await user.click(screen.getByRole('link', { name: /review 2 exercises in logger/i }));

    const queued = JSON.parse(sessionStorage.getItem(PENDING_WORKOUT_QUEUE_KEY) || '[]');
    expect(queued[0].exercises).toEqual([
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

    await user.click(screen.getByRole('link', { name: /review 1 exercise in logger/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/could not stage this workout/i);
    expect(setItem).toHaveBeenCalledWith(
      PENDING_WORKOUT_QUEUE_KEY,
      expect.stringContaining('Goblet squat'),
    );
  });
});
