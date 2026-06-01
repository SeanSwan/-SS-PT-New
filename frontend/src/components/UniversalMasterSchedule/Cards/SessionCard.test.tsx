import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SessionCard from './SessionCard';

describe('SessionCard', () => {
  const mockSession = {
    id: 1,
    sessionDate: new Date().toISOString(),
    duration: 60,
    status: 'scheduled',
    clientName: 'John Doe',
    trainerName: 'Jane Trainer',
    location: 'Main Studio'
  };

  it('renders client name', () => {
    render(<SessionCard session={mockSession} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows reminder indicator when reminder sent', () => {
    render(<SessionCard session={{ ...mockSession, reminderSent: true }} />);
    expect(screen.getByTitle('Reminder sent')).toBeInTheDocument();
  });

  it('shows feedback indicator when feedback provided', () => {
    render(<SessionCard session={{ ...mockSession, feedbackProvided: true }} />);
    expect(screen.getByTitle('Feedback provided')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<SessionCard session={mockSession} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(mockSession);
  });

  it('does not show stale paid-session badges for free-tracking clients', () => {
    render(
      <SessionCard
        session={{
          ...mockSession,
          clientSource: 'move_fitness',
          clientAvailableSessions: 17,
        }}
      />
    );

    expect(screen.queryByTitle('17 sessions remaining')).not.toBeInTheDocument();
    expect(screen.queryByText('17')).not.toBeInTheDocument();
  });

  it('does not show stale paid package copy for free-tracking clients', () => {
    render(
      <SessionCard
        session={{
          ...mockSession,
          clientSource: 'external',
          packageInfo: {
            name: 'Legacy 10 Pack',
            sessionsRemaining: 7,
            sessionsTotal: 10,
          },
        }}
      />
    );

    expect(screen.queryByText(/Legacy 10 Pack/)).not.toBeInTheDocument();
    expect(screen.queryByText(/7 left/)).not.toBeInTheDocument();
  });

  it('normalizes malformed paid-session balances before rendering the badge', () => {
    render(
      <SessionCard
        session={{
          ...mockSession,
          clientAvailableSessions: 'unknown' as any,
        }}
      />
    );

    expect(screen.getByTitle('0 sessions remaining')).toBeInTheDocument();
    expect(screen.queryByText('unknown')).not.toBeInTheDocument();
  });
});
