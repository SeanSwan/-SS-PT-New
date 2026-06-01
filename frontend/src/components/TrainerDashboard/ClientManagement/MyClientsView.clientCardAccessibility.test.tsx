import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TrainerClientCard } from './MyClientsView.clientCard';
import type { ClientAssignment } from './MyClientsView.types';

const assignment: ClientAssignment = {
  id: 'assignment-1',
  assignedAt: '2026-05-01T12:00:00.000Z',
  isActive: true,
  client: {
    id: '91',
    firstName: 'Accessible',
    lastName: 'Client',
    email: 'accessible@example.com',
    availableSessions: 4,
    clientSource: 'swanstudios',
    totalSessionsCompleted: 3,
    lastSessionDate: '2026-05-20T12:00:00.000Z',
    status: 'active',
    goals: { current: 1, completed: 2 },
    progress: {
      overallProgress: 0,
      recentTrend: 'stable',
    },
    membershipLevel: 'basic',
    joinDate: '2026-04-01T12:00:00.000Z',
  },
};

const handlers = {
  onOpenClient: vi.fn(),
  onLogWorkout: vi.fn(),
  onScheduleSession: vi.fn(),
  onMessageClient: vi.fn(),
  onViewProgress: vi.fn(),
  onOpenCopilot: vi.fn(),
};

describe('TrainerClientCard accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives every icon-only action an explicit label and 44px touch target', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TrainerClientCard assignment={assignment} index={0} {...handlers} />);

    for (const label of [
      'Log Workout',
      'Schedule Session',
      'Message Client',
      'View Progress',
      'Workout Intelligence',
    ]) {
      const button = screen.getByRole('button', { name: label });

      expect(button).toHaveAttribute('aria-label', label);
      expect(button).not.toHaveAttribute('variant');
      expect(button).toHaveStyle({
        minWidth: '44px',
        minHeight: '44px',
      });
    }

    expect(screen.getByText('AC')).not.toHaveAttribute('status');

    const leakedMembershipPropWarning = consoleError.mock.calls.some((call) =>
      call.some((part) => String(part).includes('membershipColor'))
    );
    expect(leakedMembershipPropWarning).toBe(false);
  });

  it('lets keyboard users open the client workspace from the name without nesting action buttons inside a button card', () => {
    render(<TrainerClientCard assignment={assignment} index={0} {...handlers} />);

    const openWorkspaceButton = screen.getByRole('button', {
      name: 'Open Accessible Client client workspace',
    });

    expect(openWorkspaceButton.tagName).toBe('BUTTON');

    fireEvent.click(openWorkspaceButton);
    expect(handlers.onOpenClient).toHaveBeenCalledWith('91');

    fireEvent.click(screen.getByRole('button', { name: 'Log Workout' }));
    expect(handlers.onLogWorkout).toHaveBeenCalledWith('91');
    expect(handlers.onOpenClient).toHaveBeenCalledTimes(1);
  });

  it('keeps the daily trainer actions visible without requiring hover', () => {
    render(<TrainerClientCard assignment={assignment} index={0} {...handlers} />);

    const actionRail = screen.getByRole('button', { name: 'Log Workout' }).parentElement;

    expect(actionRail).toHaveStyle({
      opacity: '1',
      transform: 'none',
    });
  });
});
