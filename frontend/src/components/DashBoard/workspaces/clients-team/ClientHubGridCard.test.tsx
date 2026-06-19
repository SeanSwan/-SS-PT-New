import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText('Strength and mobility')).toBeInTheDocument();
    expect(screen.getByText('7 workouts')).toBeInTheDocument();
    expect(screen.getByText('12 paid sessions')).toBeInTheDocument();
    expect(screen.getByText('Next session')).toBeInTheDocument();
    expect(screen.getByText('check schedule')).toBeInTheDocument();
    expect(screen.getByText('Workout Proof')).toBeInTheDocument();
    expect(screen.getByText('7 logged')).toBeInTheDocument();
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

    expect(onSelect).not.toHaveBeenCalled();
    expect(onQuickAction).toHaveBeenNthCalledWith(1, fixtureClient, 'log');
    expect(onQuickAction).toHaveBeenNthCalledWith(2, fixtureClient, 'plan');
    expect(onQuickAction).toHaveBeenNthCalledWith(3, fixtureClient, 'progress');
    expect(onQuickAction).toHaveBeenNthCalledWith(4, fixtureClient, 'coach');
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
