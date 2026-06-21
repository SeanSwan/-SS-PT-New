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
  onPlanWorkout: vi.fn(),
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

  it('uses the same Clients & Team card chrome and action vocabulary', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TrainerClientCard assignment={assignment} {...handlers} />);

    const card = document.querySelector('[data-swan-client-card="admin"]');
    expect(card).toBeInTheDocument();
    expect(card).not.toHaveAttribute('data-swan-client-card', 'trainer');

    const commandRail = screen.getByLabelText('Accessible Client quick actions');
    const expectedLabels = ['Log', 'Plan', 'Charts', 'Coach', 'Schedule', 'Message'];

    expect(within(commandRail).getAllByRole('button').map((button) => button.textContent)).toEqual(expectedLabels);

    for (const label of expectedLabels) {
      const button = within(commandRail).getByText(label).closest('button');

      expect(button).toBeInTheDocument();
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
    render(<TrainerClientCard assignment={assignment} {...handlers} />);

    const openWorkspaceButton = screen.getByRole('button', {
      name: 'Open Accessible Client',
    });

    expect(openWorkspaceButton.tagName).toBe('BUTTON');

    fireEvent.click(openWorkspaceButton);
    expect(handlers.onOpenClient).toHaveBeenCalledWith('91');

    fireEvent.click(screen.getByRole('button', { name: /log accessible client workout/i }));
    expect(handlers.onLogWorkout).toHaveBeenCalledWith('91');
    expect(handlers.onOpenClient).toHaveBeenCalledTimes(1);
  });

  it('routes the admin-style quick actions through trainer handlers', () => {
    render(<TrainerClientCard assignment={assignment} {...handlers} />);

    fireEvent.click(screen.getByRole('button', { name: /plan accessible client workout/i }));
    expect(handlers.onPlanWorkout).toHaveBeenCalledWith('91');

    fireEvent.click(screen.getByRole('button', { name: /schedule accessible client session/i }));
    expect(handlers.onScheduleSession).toHaveBeenCalledWith('91');

    fireEvent.click(screen.getByRole('button', { name: /message accessible client/i }));
    expect(handlers.onMessageClient).toHaveBeenCalledWith('91');

    fireEvent.click(screen.getByRole('button', { name: /view accessible client progress/i }));
    expect(handlers.onViewProgress).toHaveBeenCalledWith('91');

    fireEvent.click(screen.getByRole('button', { name: /open swan coach for accessible client/i }));
    expect(handlers.onOpenCopilot).toHaveBeenCalledWith('91', 'Accessible Client');
  });

  it('does not normalize malformed assignment ids into a different trainer route target', () => {
    const malformedAssignment: ClientAssignment = {
      ...assignment,
      client: {
        ...assignment.client,
        id: 'not-a-client-id',
      },
    };

    render(<TrainerClientCard assignment={malformedAssignment} {...handlers} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Accessible Client' }));
    expect(handlers.onOpenClient).toHaveBeenCalledWith('not-a-client-id');

    fireEvent.click(screen.getByRole('button', { name: /log accessible client workout/i }));
    expect(handlers.onLogWorkout).toHaveBeenCalledWith('not-a-client-id');
    expect(handlers.onLogWorkout).not.toHaveBeenCalledWith('0');
  });

  it('keeps the daily trainer actions visible without requiring hover', () => {
    render(<TrainerClientCard assignment={assignment} {...handlers} />);

    const actionRail = screen.getByLabelText('Accessible Client quick actions');
    const buttons = within(actionRail).getAllByRole('button');

    expect(buttons).toHaveLength(6);
    for (const button of buttons) {
      expect(button).toBeVisible();
    }
  });

  it('announces readiness and workout proof as named card groups', () => {
    render(<TrainerClientCard assignment={assignment} {...handlers} />);

    expect(screen.getByRole('group', { name: /accessible client readiness/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /accessible client workout proof/i })).toBeInTheDocument();
  });

  it('uses the same stretchable card contract as the admin client grid', () => {
    render(<TrainerClientCard assignment={assignment} {...handlers} />);

    const card = document.querySelector('[data-swan-client-card="admin"]');

    expect(card).toBeInTheDocument();
    expect(card).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    });
  });

  it('surfaces paid-client readiness details before the trainer clicks into the client', () => {
    render(<TrainerClientCard assignment={assignment} {...handlers} />);

    expect(screen.getByText('SwanStudios source')).toBeInTheDocument();
    expect(screen.getByText('beginner')).toBeInTheDocument();
    expect(screen.getByText('Strength and mobility')).toBeInTheDocument();
    expect(screen.getByText('check schedule')).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getAllByText('4 paid sessions')).toHaveLength(1);
    expect(screen.getAllByText('deducts when logged')).toHaveLength(1);
  });

  it('uses the admin card contact line for email identity', () => {
    render(<TrainerClientCard assignment={assignment} {...handlers} />);

    const email = screen.getByText('accessible@example.com');
    expect(email.closest('[data-swan-card-section="admin-identity"]')).toBeInTheDocument();
  });

  it('distinguishes Move Fitness tracking clients from paid SwanStudios session clients', () => {
    const moveFitnessAssignment: ClientAssignment = {
      ...assignment,
      client: {
        ...assignment.client,
        id: '92',
        clientSource: 'move_fitness',
        availableSessions: 0,
        nextSessionDate: undefined,
      },
    };

    render(<TrainerClientCard assignment={moveFitnessAssignment} {...handlers} />);

    expect(screen.getByText('Move Fitness source')).toBeInTheDocument();
    expect(screen.getByText('check schedule')).toBeInTheDocument();
    expect(screen.getAllByText('free tracking').length).toBeGreaterThan(0);
    expect(screen.getAllByText('no deduction').length).toBeGreaterThan(0);
  });
});
