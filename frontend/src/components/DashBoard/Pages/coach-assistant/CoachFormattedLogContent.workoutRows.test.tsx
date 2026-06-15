import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
});
