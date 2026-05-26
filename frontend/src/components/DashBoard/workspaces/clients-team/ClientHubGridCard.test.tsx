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
    render(<ClientHubGridCard client={fixtureClient} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /open fixture client/i })).toBeInTheDocument();
    expect(screen.getByText('SwanStudios')).toBeInTheDocument();
    expect(screen.getByText('beginner')).toBeInTheDocument();
    expect(screen.getByText('Strength and mobility')).toBeInTheDocument();
    expect(screen.getByText('7 workouts')).toBeInTheDocument();
    expect(screen.getByText('12 sessions')).toBeInTheDocument();
  });

  it('selects the client from the whole card', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ClientHubGridCard client={fixtureClient} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /open fixture client/i }));

    expect(onSelect).toHaveBeenCalledWith(fixtureClient);
  });
});
