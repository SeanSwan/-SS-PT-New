import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ExecutionResultCard } from './CoachExecutionResultCard';

describe('CoachExecutionResultCard access handoff', () => {
  it('renders copyable reset-link controls for confirmed reset commands', () => {
    const resetUrl = 'https://sswanstudios.com/reset-password/manual-token';

    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="reset_client_password"
          client={{ id: 42, firstName: 'Ava' }}
          result={{
            credentialAction: 'reset_link_ready',
            resetEmailSent: false,
            emailSent: false,
            resetUrl,
          }}
        />
      </MemoryRouter>,
    );

    const handoff = screen.getByRole('region', { name: /client access handoff/i });
    expect(handoff).toHaveTextContent(/reset link ready/i);
    expect(handoff).toHaveTextContent(/copy this secure reset link/i);
    expect(handoff).toHaveTextContent(/Ava/i);
    expect(within(handoff).getByRole('button', { name: /copy reset link/i })).toBeInTheDocument();
    expect(within(handoff).getByRole('link', { name: /open reset link/i })).toHaveAttribute('href', resetUrl);
  });

  it('does not offer a direct reset-link control when only reset email was sent', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="reset_client_password"
          client={{ id: 42, firstName: 'Ava' }}
          result={{
            credentialMode: 'reset_link_sent',
            resetEmailSent: true,
            emailSent: true,
          }}
        />
      </MemoryRouter>,
    );

    const handoff = screen.getByRole('region', { name: /client access handoff/i });
    expect(handoff).toHaveTextContent(/secure login link sent/i);
    expect(handoff).toHaveTextContent(/no password is shown/i);
    expect(within(handoff).queryByRole('button', { name: /copy reset link/i })).not.toBeInTheDocument();
    expect(within(handoff).queryByRole('link', { name: /open reset link/i })).not.toBeInTheDocument();
  });
});