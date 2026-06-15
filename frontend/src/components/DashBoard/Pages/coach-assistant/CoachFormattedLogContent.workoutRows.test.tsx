import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import CoachCommandLogEntry from './CoachCommandLogEntry';
import type { CommandLogEntry } from './CoachCommandCenter.data';

const entry = (body: string): CommandLogEntry => ({
  id: 'coach-workout-row-test',
  actor: 'coach',
  label: 'workout draft',
  body,
});

describe('CoachFormattedLogContent workout rows', () => {
  it('separates exercise names from prescription details for fast scan reading', () => {
    render(<CoachCommandLogEntry entry={entry([
      'Workout for today:',
      '- Incline dumbbell press - 3 sets x 10 reps, rest 75 sec',
      '- Cable row: 4 sets x 8 reps',
    ].join('\n'))} />);

    const rows = within(screen.getByRole('list', { name: 'Workout details' })).getAllByRole('listitem');

    expect(rows).toHaveLength(2);
    expect(rows[0]?.querySelector('.exercise-name')).toHaveTextContent('Incline dumbbell press');
    expect(rows[0]?.querySelector('.exercise-detail')).toHaveTextContent('3 sets x 10 reps, rest 75 sec');
    expect(rows[1]?.querySelector('.exercise-name')).toHaveTextContent('Cable row');
    expect(rows[1]?.querySelector('.exercise-detail')).toHaveTextContent('4 sets x 8 reps');
  });

  it('keeps sectioned workout answers grouped for fast coach review and logger handoff', () => {
    render(
      <MemoryRouter>
        <CoachCommandLogEntry entry={entry([
          'Here is the workout:',
          'Warm-up:',
          '- Incline walk - 5 minutes',
          'Strength:',
          '- Goblet squat - 3 sets x 10 reps, rest 60 sec',
          '- Cable row: 4 sets x 8 reps',
          'Finisher:',
          '- Bike sprint - 6 rounds x 20 sec',
        ].join('\n'))} workoutLoggerRoute="/dashboard/client/log-workout?loadPlan=today" />
      </MemoryRouter>,
    );

    const warmup = screen.getByRole('region', { name: 'Warm-up workout block' });
    const strength = screen.getByRole('region', { name: 'Strength workout block' });
    const finisher = screen.getByRole('region', { name: 'Finisher workout block' });

    expect(within(warmup).getByText('Incline walk')).toBeInTheDocument();
    expect(within(strength).getByText('Goblet squat')).toBeInTheDocument();
    expect(within(strength).getByText('Cable row')).toBeInTheDocument();
    expect(within(finisher).getByText('Bike sprint')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review 2 exercises in logger/i })).toBeInTheDocument();
  });
});
