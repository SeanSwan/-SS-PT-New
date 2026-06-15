import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import CoachCommandLogEntry, { formatCommandLogBody } from './CoachCommandLogEntry';
import type { CommandLogEntry } from './CoachCommandCenter.data';
import { PENDING_WORKOUT_QUEUE_KEY } from '../../../../utils/parseAIWorkoutPlan';

const baseEntry: CommandLogEntry = {
  id: 'entry-1',
  actor: 'coach',
  label: 'prepared draft',
  body: '',
};

describe('CoachCommandLogEntry', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('switches a dual-mode Coach answer between Science and Keep It 100 without showing both at once', async () => {
    const user = userEvent.setup();
    const entry = {
      ...baseEntry,
      body: [
        '**THE SCIENCE**',
        'Mechanical tension and progressive overload drive the adaptation.',
        '',
        '---',
        '',
        '**KEEPING IT 100**',
        'Use a weight you can control, then add a little when it gets easy.',
      ].join('\n'),
    };

    render(<CoachCommandLogEntry entry={entry} />);

    expect(screen.getByRole('button', { name: 'Science' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Keep It 100' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/Mechanical tension/i)).toBeInTheDocument();
    expect(screen.queryByText(/Use a weight you can control/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep It 100' }));

    expect(screen.getByRole('button', { name: 'Science' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Keep It 100' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(/Mechanical tension/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Use a weight you can control/i)).toBeInTheDocument();
  });

  it('recognizes normal same-line Science and Keep It 100 headings from model output', async () => {
    const user = userEvent.setup();
    const entry = {
      ...baseEntry,
      body: [
        'Science: Muscle protein synthesis is the repair signal after training.',
        '',
        'Keep it 100: Lift clean, eat protein, sleep, and repeat.',
      ].join('\n'),
    };

    render(<CoachCommandLogEntry entry={entry} />);

    expect(screen.getByRole('button', { name: 'Science' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Muscle protein synthesis/i)).toBeInTheDocument();
    expect(screen.queryByText(/Lift clean/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep It 100' }));

    expect(screen.queryByText(/Muscle protein synthesis/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Lift clean/i)).toBeInTheDocument();
  });

  it('formats workout bullets as a readable list instead of flattening them into one paragraph', () => {
    const formatted = formatCommandLogBody([
      'Workout for today:',
      '- Goblet squat: 3 sets x 10 reps',
      '- Push-up: 3 sets x 8 reps',
      '',
      'Keep rest at 60 seconds.',
    ].join('\n'));

    expect(formatted.leadParagraphs).toEqual(['Workout for today:', 'Keep rest at 60 seconds.']);
    expect(formatted.bullets).toEqual([
      'Goblet squat: 3 sets x 10 reps',
      'Push-up: 3 sets x 8 reps',
    ]);
  });

  it('formats plain numbered workout prescriptions as readable workout details', () => {
    const formatted = formatCommandLogBody([
      'Here is the plan:',
      '1. Incline dumbbell press - 3 sets x 10 reps, rest 75 sec',
      '2) Cable row: 4 sets x 8 reps',
      'Coach note: stop every set with clean reps still available.',
    ].join('\n'));

    expect(formatted.leadParagraphs).toEqual([
      'Here is the plan:',
      'Coach note: stop every set with clean reps still available.',
    ]);
    expect(formatted.bullets).toEqual([
      'Incline dumbbell press - 3 sets x 10 reps, rest 75 sec',
      'Cable row: 4 sets x 8 reps',
    ]);
  });

  it('renders workout bullets with list semantics inside the Coach answer', () => {
    render(<CoachCommandLogEntry entry={{
      ...baseEntry,
      body: [
        'Workout for today:',
        '- Goblet squat: 3 sets x 10 reps',
        '- Push-up: 3 sets x 8 reps',
      ].join('\n'),
    }} />);

    const list = screen.getByRole('list', { name: 'Workout details' });
    expect(within(list).getByText('Goblet squat: 3 sets x 10 reps')).toBeInTheDocument();
    expect(within(list).getByText('Push-up: 3 sets x 8 reps')).toBeInTheDocument();
  });

  it('stores a Coach workout draft and routes to the selected client logger for review', async () => {
    const user = userEvent.setup();
    sessionStorage.clear();

    render(
      <MemoryRouter>
        <CoachCommandLogEntry
          entry={{
            ...baseEntry,
            body: [
              'Workout for today:',
              '- Goblet squat: 3 sets x 10 reps',
              '- Push-up: 3 sets x 8 reps',
            ].join('\n'),
          }}
          workoutLoggerRoute="/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today"
          workoutLoggerScopeLabel="Sean Swan"
        />
      </MemoryRouter>
    );

    const reviewLink = screen.getByRole('link', { name: /review 2 exercises in logger/i });
    expect(reviewLink).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today'
    );

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

  it('shows the live command-center workout handoff as a target and date review card', () => {
    render(
      <MemoryRouter>
        <CoachCommandLogEntry
          entry={{
            ...baseEntry,
            body: [
              'Workout for today:',
              '- Goblet squat: 3 sets x 10 reps',
              '- Push-up: 3 sets x 8 reps',
              '- Romanian deadlift: 4 sets x 8 reps',
              '- Plank: 3 sets x 30 reps',
            ].join('\n'),
          }}
          workoutLoggerRoute="/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today"
          workoutLoggerScopeLabel="Sean Swan"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Workout ready for review')).toBeInTheDocument();
    expect(screen.getByText('Sean Swan')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Logger save')).toBeInTheDocument();
    expect(screen.getByText(/nothing logs until you save it/i)).toBeInTheDocument();
    expect(screen.getByText('+1 more ready')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review 4 exercises in logger/i })).toBeInTheDocument();

    const preview = within(screen.getByLabelText('Parsed workout preview'));
    expect(preview.getByText('Goblet squat')).toBeInTheDocument();
    expect(preview.getByText('Romanian deadlift')).toBeInTheDocument();
    expect(preview.queryByText('Plank')).not.toBeInTheDocument();
  });

  it('stops command-center logger navigation when the workout cannot be staged', async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => { throw new Error('storage unavailable'); });

    render(
      <MemoryRouter>
        <CoachCommandLogEntry
          entry={{
            ...baseEntry,
            body: '- Goblet squat: 3 sets x 10 reps',
          }}
          workoutLoggerRoute="/dashboard/client/log-workout?loadPlan=today"
          workoutLoggerScopeLabel="My training"
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

  it('keeps scheduled session date labels stable for date-only logger routes', () => {
    render(
      <MemoryRouter>
        <CoachCommandLogEntry
          entry={{
            ...baseEntry,
            body: '- Goblet squat: 3 sets x 10 reps',
          }}
          workoutLoggerRoute="/dashboard/trainer/log-workout?clientId=42&sessionDate=2026-06-15"
          workoutLoggerScopeLabel="Client #42"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Jun 15')).toBeInTheDocument();
  });
});
