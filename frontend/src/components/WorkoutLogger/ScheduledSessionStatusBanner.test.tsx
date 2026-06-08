import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ScheduledSessionStatusBanner from './ScheduledSessionStatusBanner';

describe('ScheduledSessionStatusBanner', () => {
  it('stays hidden for normal unscheduled workout logging', () => {
    const { container } = render(
      <ScheduledSessionStatusBanner
        clientSource="swanstudios"
        scheduledSessionCreditHint={1}
        scheduledSessionDate="2026-06-07"
        scheduledSessionId={null}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows schedule-linked paid credit impact before the trainer saves', () => {
    render(
      <ScheduledSessionStatusBanner
        clientSource="swanstudios"
        scheduledSessionCreditHint={2}
        scheduledSessionDate="2026-06-07"
        scheduledSessionId="72"
      />
    );

    expect(screen.getByText('Schedule-linked workout')).toBeInTheDocument();
    expect(screen.getByText('Session date: Jun 7, 2026')).toBeInTheDocument();
    expect(screen.getByText('Will Deduct 2 Session Credits')).toBeInTheDocument();
    expect(screen.getByText('SwanStudios paid client')).toBeInTheDocument();
    expect(screen.getByText(/saving this workout completes the appointment/i)).toBeInTheDocument();
  });

  it('keeps Move Fitness schedule logs visibly free-tracking', () => {
    render(
      <ScheduledSessionStatusBanner
        clientSource=" Move Fitness "
        scheduledSessionCreditHint={2}
        scheduledSessionDate="2026-06-07"
        scheduledSessionId="72"
      />
    );

    expect(screen.getByText('Move Fitness free tracking')).toBeInTheDocument();
    expect(screen.getByText('No Paid Session Deduction')).toBeInTheDocument();
    expect(screen.queryByText(/Will Deduct/i)).toBeNull();
  });
});
