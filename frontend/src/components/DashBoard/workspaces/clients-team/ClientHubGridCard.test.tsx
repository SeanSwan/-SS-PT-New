import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ClientHubGridCard from './ClientHubGridCard';

const fixtureClient = {
  id: 424242,
  firstName: 'Fixture',
  lastName: 'Client',
  email: 'fixture.client@example.test',
  clientSource: 'swanstudios',
  isActive: true,
  availableSessions: 12,
  workoutCount: 7,
  lastSessionDate: '2026-05-20T12:00:00.000Z',
  assignedAt: '2026-05-22T12:00:00.000Z',
  fitnessGoal: 'Strength and mobility',
  trainingExperience: 'beginner',
};

describe('ClientHubGridCard', () => {
  it('shows the training facts needed before opening a client', () => {
    render(
      <ClientHubGridCard
        client={{
          ...fixtureClient,
          onboardingPct: 72,
        }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /open fixture client/i })).toBeInTheDocument();
    expect(screen.getByText('SwanStudios')).toBeInTheDocument();
    expect(screen.getByText('beginner')).toBeInTheDocument();
    expect(screen.getByText(/Assigned (Today|Yesterday|\d+ (days|weeks|months) ago)/i)).toBeInTheDocument();
    const goal = screen.getByText('Strength and mobility');
    expect(goal).toBeInTheDocument();
    expect(goal).toHaveAttribute('title', 'Strength and mobility');
    expect(goal).toHaveAccessibleName('Goal: Strength and mobility');
    expect(screen.getByText('7 workouts')).toBeInTheDocument();
    expect(screen.getByText('12 paid sessions')).toBeInTheDocument();
    expect(screen.getByText('Next session')).toBeInTheDocument();
    expect(screen.getByText('check schedule')).toBeInTheDocument();
    expect(screen.getByText('Workout Proof')).toBeInTheDocument();
    expect(screen.getByText('7 logged')).toBeInTheDocument();
    expect(screen.getByText('Last logged: May 20')).toBeInTheDocument();
    expect(screen.getByText('72% onboarded')).toBeInTheDocument();
    expect(screen.getByText(/intake progress/i)).toBeInTheDocument();
    expect(screen.getByText(/deducts when logged/i)).toBeInTheDocument();
  });

  it('uses native controls and semantic groups for the card command surface', () => {
    render(
      <ClientHubGridCard
        client={{
          ...fixtureClient,
          onboardingPct: 72,
        }}
        onSelect={vi.fn()}
      />
    );

    const openButton = screen.getByRole('button', { name: /open fixture client/i });

    expect(openButton.tagName).toBe('BUTTON');
    expect(openButton.querySelector('div')).toBeNull();
    expect(screen.getByRole('group', { name: /fixture client readiness/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /fixture client workout proof/i })).toBeInTheDocument();
  });

  it('labels Move Fitness clients as free tracking instead of paid session inventory', () => {
    render(
      <ClientHubGridCard
        client={{
          ...fixtureClient,
          clientSource: 'move_fitness',
          availableSessions: 0,
        }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Move Fitness')).toBeInTheDocument();
    expect(screen.getByText('free tracking')).toBeInTheDocument();
    expect(screen.getByText(/no deduction/i)).toBeInTheDocument();
    expect(screen.queryByText('0 sessions')).not.toBeInTheDocument();
  });

  it('labels external clients as external free tracking, not SwanStudios', () => {
    render(
      <ClientHubGridCard
        client={{
          ...fixtureClient,
          clientSource: 'external',
          availableSessions: 0,
        }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('External')).toBeInTheDocument();
    expect(screen.queryByText('SwanStudios')).not.toBeInTheDocument();
    expect(screen.getByText('free tracking')).toBeInTheDocument();
    expect(screen.getByText(/no deduction/i)).toBeInTheDocument();
  });

  it('flags SwanStudios clients who need a session refill soon', () => {
    render(
      <ClientHubGridCard
        client={{
          ...fixtureClient,
          availableSessions: 1,
        }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('1 paid session')).toBeInTheDocument();
    expect(screen.getByText(/refill soon/i)).toBeInTheDocument();
  });

  it('normalizes malformed workout counts before rendering proof copy', () => {
    render(
      <ClientHubGridCard
        client={{
          ...fixtureClient,
          workoutCount: -3.8,
        }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('0 workouts')).toBeInTheDocument();
    expect(screen.getByText('No logs yet')).toBeInTheDocument();
    expect(screen.getByText('log first session')).toBeInTheDocument();
    expect(screen.queryByText('-3.8 workouts')).not.toBeInTheDocument();
    expect(screen.queryByText('-3.8 logged')).not.toBeInTheDocument();
  });

  it('selects the client from the whole card', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ClientHubGridCard client={fixtureClient} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /open fixture client/i }));

    expect(onSelect).toHaveBeenCalledWith(fixtureClient);
  });

  it('selects the client with keyboard activation', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ClientHubGridCard client={fixtureClient} onSelect={onSelect} />);

    screen.getByRole('button', { name: /open fixture client/i }).focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith(fixtureClient);
  });

  it('offers one-tap daily actions without selecting the client first', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onQuickAction = vi.fn();

    render(
      <ClientHubGridCard
        client={fixtureClient}
        onSelect={onSelect}
        onQuickAction={onQuickAction}
      />
    );

    await user.click(screen.getByRole('button', { name: /log fixture client workout/i }));
    await user.click(screen.getByRole('button', { name: /plan fixture client workout/i }));
    await user.click(screen.getByRole('button', { name: /view fixture client progress/i }));
    await user.click(screen.getByRole('button', { name: /open swan coach for fixture client/i }));

    const quickActions = screen.getByRole('group', { name: /fixture client quick actions/i });
    expect(quickActions).toHaveAttribute('data-swan-card-section', 'admin-actions');
    within(quickActions).getAllByRole('button').forEach((button) => {
      expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });

    expect(onSelect).not.toHaveBeenCalled();
    expect(onQuickAction).toHaveBeenNthCalledWith(1, fixtureClient, 'log');
    expect(onQuickAction).toHaveBeenNthCalledWith(2, fixtureClient, 'plan');
    expect(onQuickAction).toHaveBeenNthCalledWith(3, fixtureClient, 'progress');
    expect(onQuickAction).toHaveBeenNthCalledWith(4, fixtureClient, 'coach');
  });

  it('shows real next-session and account readiness when the data is present', () => {
    const nextSessionDate = new Date(Date.now() + 6 * 86400000).toISOString();
    const expectedDay = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(nextSessionDate));

    render(
      <ClientHubGridCard
        client={{ ...fixtureClient, nextSessionDate, accountStatus: 'active' }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText(expectedDay)).toBeInTheDocument();
    expect(screen.queryByText('check schedule')).not.toBeInTheDocument();
    expect(screen.getByText('login ready')).toBeInTheDocument();
  });

  it('shows an honest empty state when no session is booked', () => {
    render(
      <ClientHubGridCard
        client={{ ...fixtureClient, nextSessionDate: null }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('none booked')).toBeInTheDocument();
  });

  it('surfaces claim-pending accounts so admins stop guessing login readiness', () => {
    render(
      <ClientHubGridCard
        client={{ ...fixtureClient, accountStatus: 'stub' }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('invite pending')).toBeInTheDocument();
  });

  it('badges deactivated clients on the identity line and readiness strip', () => {
    render(
      <ClientHubGridCard
        client={{ ...fixtureClient, isActive: false }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getAllByText(/deactivated/i).length).toBeGreaterThanOrEqual(2);
  });

  it('renders the client photo when one exists', () => {
    const { container } = render(
      <ClientHubGridCard
        client={{ ...fixtureClient, photo: 'https://cdn.example.test/client-42.jpg' }}
        onSelect={vi.fn()}
      />
    );

    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    expect(image).toHaveAttribute('src', 'https://cdn.example.test/client-42.jpg');
    expect(screen.queryByText('FI')).not.toBeInTheDocument();
  });

  it('falls back to email identity when client names are not captured yet', () => {
    render(
      <ClientHubGridCard
        client={{
          ...fixtureClient,
          firstName: '',
          lastName: '',
        }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /open fixture.client@example.test/i })).toBeInTheDocument();
    expect(screen.getByText('fixture.client@example.test')).toBeInTheDocument();
    expect(screen.getByText('FI')).toBeInTheDocument();
  });
});
