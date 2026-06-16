import { fireEvent, render, screen, within } from '@testing-library/react';
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
    fitnessGoal: 'Strength and mobility',
    trainingExperience: 'beginner',
    onboardingCompletionPercentage: 67,
    onboardingStatus: 'in_progress',
    totalSessionsCompleted: 3,
    lastSessionDate: '2026-05-20T12:00:00.000Z',
    nextSessionDate: '2026-06-12T12:00:00.000Z',
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

  it('shows a labeled trainer command rail with 44px touch targets', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TrainerClientCard assignment={assignment} index={0} {...handlers} />);

    const commandRail = screen.getByRole('group', {
      name: 'Accessible Client trainer commands',
    });
    const expectedLabels = ['Log Today', 'Plan', 'Progress', 'Schedule', 'Message'];

    expect(within(commandRail).getAllByRole('button').map((button) => button.textContent)).toEqual(expectedLabels);

    for (const label of expectedLabels) {
      const button = within(commandRail).getByRole('button', { name: new RegExp(label, 'i') });

      expect(button).not.toHaveAttribute('variant');
      expect(button).toHaveTextContent(label);
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

    fireEvent.click(screen.getByRole('button', { name: /log today/i }));
    expect(handlers.onLogWorkout).toHaveBeenCalledWith('91');
    expect(handlers.onOpenClient).toHaveBeenCalledTimes(1);
  });

  it('keeps the daily trainer actions visible without requiring hover', () => {
    render(<TrainerClientCard assignment={assignment} index={0} {...handlers} />);

    const actionRail = screen.getByRole('group', {
      name: 'Accessible Client trainer commands',
    });

    expect(actionRail).toHaveStyle({
      opacity: '1',
      transform: 'none',
    });
  });

  it('surfaces paid-client readiness details before the trainer clicks into the client', () => {
    render(<TrainerClientCard assignment={assignment} index={0} {...handlers} />);

    expect(screen.getByText('SwanStudios paid')).toBeInTheDocument();
    expect(screen.getByText('beginner')).toBeInTheDocument();
    expect(screen.getByText('Strength and mobility')).toBeInTheDocument();
    expect(screen.getByText('Next session: Jun 12')).toBeInTheDocument();
    expect(screen.getByText('Intake 67%')).toBeInTheDocument();
    expect(screen.getByText('Active client')).toBeInTheDocument();
    expect(screen.getAllByText('4 paid sessions')).toHaveLength(1);
    expect(screen.getAllByText('deducts when logged')).toHaveLength(1);
  });

  it('marks the email row for compact mobile ellipsis while preserving the full value', () => {
    render(<TrainerClientCard assignment={assignment} index={0} {...handlers} />);

    const email = screen.getByText('accessible@example.com');
    expect(email).toHaveAttribute('data-swan-trainer-email', 'true');
    expect(email.parentElement).toHaveAttribute('title', 'accessible@example.com');
    expect(email.parentElement).toHaveAttribute('aria-label', 'accessible@example.com');
  });

  it('distinguishes Move Fitness tracking clients from paid SwanStudios session clients', () => {
    const moveFitnessAssignment: ClientAssignment = {
      ...assignment,
      client: {
        ...assignment.client,
        id: '92',
        clientSource: ' Move Fitness ' as any,
        availableSessions: 0,
        nextSessionDate: undefined,
      },
    };

    render(<TrainerClientCard assignment={moveFitnessAssignment} index={0} {...handlers} />);

    expect(screen.getByText('Move Fitness tracking')).toBeInTheDocument();
    expect(screen.getByText('Next session unavailable')).toBeInTheDocument();
    expect(screen.getAllByText('free tracking').length).toBeGreaterThan(0);
    expect(screen.getAllByText('no deduction').length).toBeGreaterThan(0);
  });
});
