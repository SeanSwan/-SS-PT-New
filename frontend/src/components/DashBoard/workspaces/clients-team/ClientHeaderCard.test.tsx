import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ClientHeaderCard from './ClientHeaderCard';

const source = readFileSync(resolve(__dirname, 'ClientHeaderCard.tsx'), 'utf8');

const baseClient = {
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

describe('ClientHeaderCard', () => {
  it('shows SwanStudios paid-session deduction context in the selected-client header', () => {
    render(<ClientHeaderCard client={baseClient} />);

    expect(screen.getByText('SwanStudios')).toBeInTheDocument();
    expect(screen.getByText('12 paid sessions')).toBeInTheDocument();
    expect(screen.getByText(/deducts when logged/i)).toBeInTheDocument();
  });

  it('flags low SwanStudios paid-session inventory in the selected-client header', () => {
    render(<ClientHeaderCard client={{ ...baseClient, availableSessions: 1 }} />);

    expect(screen.getByText('1 paid session')).toBeInTheDocument();
    expect(screen.getByText(/refill soon/i)).toBeInTheDocument();
  });

  it('shows Move Fitness as free tracking with no session deduction', () => {
    render(
      <ClientHeaderCard
        client={{
          ...baseClient,
          clientSource: 'move_fitness',
          availableSessions: 0,
        }}
      />
    );

    expect(screen.getByText('Move Fitness')).toBeInTheDocument();
    expect(screen.getByText('free tracking')).toBeInTheDocument();
    expect(screen.getByText(/no deduction/i)).toBeInTheDocument();
    expect(screen.queryByText(/sessions left/i)).not.toBeInTheDocument();
  });

  it('shows external clients as free tracking instead of SwanStudios paid clients', () => {
    render(
      <ClientHeaderCard
        client={{
          ...baseClient,
          clientSource: 'external',
          availableSessions: 0,
        }}
      />
    );

    expect(screen.getByText('External')).toBeInTheDocument();
    expect(screen.queryByText('SwanStudios')).not.toBeInTheDocument();
    expect(screen.getByText('free tracking')).toBeInTheDocument();
    expect(screen.getByText(/no deduction/i)).toBeInTheDocument();
  });

  it('falls back to email identity when the selected client name is blank', () => {
    render(
      <ClientHeaderCard
        client={{
          ...baseClient,
          firstName: '',
          lastName: '',
        }}
      />
    );

    expect(screen.getByRole('heading', { name: /fixture.client@example.test/i })).toBeInTheDocument();
    expect(screen.getByText('FI')).toBeInTheDocument();
  });

  it('does not render impossible ages from future date-of-birth data', () => {
    render(
      <ClientHeaderCard
        client={{
          ...baseClient,
          dateOfBirth: '2999-01-01',
        }}
      />
    );

    expect(screen.queryByText(/-\d+ years old/i)).not.toBeInTheDocument();
  });

  it('uses normalized client source tone for selected-client avatar and badge visuals', () => {
    expect(source).toContain('const sourceTone = getClientSourceTone(client.clientSource)');
    expect(source).toContain('<AvatarLarge $source={sourceTone}>');
    expect(source).not.toContain('<AvatarLarge $source={client.clientSource}>');
    expect(source).toContain("$source === 'mf'");
    expect(source).not.toContain("$source === 'move_fitness'");
  });
});
