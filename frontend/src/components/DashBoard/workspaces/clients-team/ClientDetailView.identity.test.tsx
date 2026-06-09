import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ClientDetailView from './ClientDetailView';

describe('ClientDetailView identity fallback', () => {
  it('uses email identity and initials when selected client names are blank', () => {
    render(
      <ClientDetailView
        client={{
          id: 7,
          firstName: '',
          lastName: '',
          email: 'fallback.client@example.test',
          status: 'active',
          tier: 'premium',
          sessionsLeft: 2,
          workoutCount: 5,
        }}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /fallback.client@example.test/i })).toBeInTheDocument();
    expect(screen.getByText('FA')).toBeInTheDocument();
  });

  it('keeps selected-client navigation controls as explicit non-submit buttons', () => {
    render(
      <ClientDetailView
        client={{
          id: 7,
          firstName: 'Fixture',
          lastName: 'Client',
          email: 'fixture.client@example.test',
          status: 'active',
          tier: 'premium',
          sessionsLeft: 2,
          workoutCount: 5,
        }}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/back to client list/i)).toHaveAttribute('type', 'button');
    screen.getAllByRole('tab').forEach((tab) => {
      expect(tab).toHaveAttribute('type', 'button');
    });
  });

  it('renders selected-client subtext with ASCII separators and safe fallbacks', () => {
    render(
      <ClientDetailView
        client={{
          id: 7,
          firstName: 'Fixture',
          lastName: 'Client',
          email: '',
          status: 'active',
          tier: '',
          sessionsLeft: 2,
          workoutCount: 5,
        }}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByLabelText('No email on file / active / Bronze Forge')).toBeInTheDocument();
    expect(screen.getByText('No email on file')).toBeInTheDocument();
    expect(screen.getByText('Bronze Forge')).toBeInTheDocument();
  });
});
