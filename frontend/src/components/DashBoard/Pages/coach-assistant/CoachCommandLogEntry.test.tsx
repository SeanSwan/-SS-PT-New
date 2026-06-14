import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import CoachCommandLogEntry, { formatCommandLogBody } from './CoachCommandLogEntry';
import type { CommandLogEntry } from './CoachCommandCenter.data';

const baseEntry: CommandLogEntry = {
  id: 'entry-1',
  actor: 'coach',
  label: 'prepared draft',
  body: '',
};

describe('CoachCommandLogEntry', () => {
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
});
