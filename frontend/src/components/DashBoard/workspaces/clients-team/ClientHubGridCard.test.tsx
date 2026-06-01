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
    expect(screen.getByText('72% onboarded')).toBeInTheDocument();
    expect(screen.getByText(/intake progress/i)).toBeInTheDocument();
    expect(screen.getByText(/deducts when logged/i)).toBeInTheDocument();
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
