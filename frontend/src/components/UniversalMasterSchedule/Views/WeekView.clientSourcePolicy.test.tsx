import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WeekView from './WeekView';

describe('WeekView client source session badge policy', () => {
  it('does not show stale paid-session counts for free-tracking clients', () => {
    const sessionDate = new Date(2026, 4, 26, 9, 0, 0);

    render(
      <WeekView
        date={sessionDate}
        sessions={[
          {
            id: 'free-tracking-session',
            sessionDate,
            duration: 60,
            status: 'scheduled',
            clientName: 'Move Client',
            clientSource: 'move_fitness',
            clientAvailableSessions: 17,
          },
        ]}
      />
    );

    expect(screen.getByText('Move Client')).toBeInTheDocument();
    expect(screen.queryByTitle(/17 left/)).not.toBeInTheDocument();
    expect(screen.queryByText('17')).not.toBeInTheDocument();
  });

  it('normalizes malformed paid-session counts in week cards', () => {
    const sessionDate = new Date(2026, 4, 26, 9, 0, 0);

    render(
      <WeekView
        date={sessionDate}
        sessions={[
          {
            id: 'paid-session-malformed-balance',
            sessionDate,
            duration: 60,
            status: 'scheduled',
            clientName: 'Paid Client',
            clientAvailableSessions: 'unknown',
          },
        ]}
      />
    );

    expect(screen.getByTitle(/0 left/)).toBeInTheDocument();
    expect(screen.queryByTitle(/unknown left/)).not.toBeInTheDocument();
  });
});
