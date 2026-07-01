import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CoachCommandLogEntry from './CoachCommandLogEntry';
import type { CommandLogEntry } from './CoachCommandCenter.data';

const baseEntry: CommandLogEntry = { id: 'access-entry-1', actor: 'coach', label: 'created client', body: '' };

describe('CoachCommandLogEntry access handoff status copy', () => {
  it('does not offer a direct reset-link handoff when only the reset email was sent', () => {
    render(<CoachCommandLogEntry entry={{
      ...baseEntry,
      accessHandoff: {
        credentialMode: 'reset_link_sent',
        resetEmailSent: true,
        clientName: 'Ava Stone',
        clientSource: 'swanstudios',
      },
    }} />);

    const handoff = screen.getByRole('region', { name: /client access handoff/i });

    expect(handoff).toHaveTextContent(/secure login link sent/i);
    expect(handoff).toHaveTextContent(/secure login link was sent to the client/i);
    expect(handoff).toHaveTextContent(/no password is shown in this command log/i);
    expect(handoff).not.toHaveTextContent(/copy this secure reset link/i);
    expect(within(handoff).queryByRole('button', { name: /copy reset link/i })).not.toBeInTheDocument();
    expect(within(handoff).queryByRole('link', { name: /open reset link/i })).not.toBeInTheDocument();
  });

  it('renders a copyable reset-link handoff from a confirmed reset command result', () => {
    const resetUrl = 'https://sswanstudios.com/reset-password/manual-token';
    render(<CoachCommandLogEntry entry={{
      ...baseEntry,
      commandResult: {
        command: 'reset_client_password',
        client: { firstName: 'Ava' },
        result: {
          credentialAction: 'reset_link_ready',
          resetEmailSent: false,
          emailSent: false,
          resetUrl,
        },
      },
    }} />);

    const handoff = screen.getByRole('region', { name: /client access handoff/i });

    expect(handoff).toHaveTextContent(/reset link ready/i);
    expect(handoff).toHaveTextContent(/copy this secure reset link/i);
    expect(handoff).toHaveTextContent(/Ava/i);
    expect(within(handoff).getByRole('button', { name: /copy reset link/i })).toBeInTheDocument();
    expect(within(handoff).getByRole('link', { name: /open reset link/i })).toHaveAttribute('href', resetUrl);
  });
  it('renders reset-link-unavailable command results without copy/open controls', () => {
    render(<CoachCommandLogEntry entry={{
      ...baseEntry,
      commandResult: {
        command: 'reset_client_password',
        client: { firstName: 'Ava' },
        result: {
          credentialAction: 'reset_link_needed',
          credentialIssue: 'reset_link_unavailable',
          resetEmailSent: false,
          emailSent: false,
        },
      },
    }} />);

    const handoff = screen.getByRole('region', { name: /client access handoff/i });

    expect(handoff).toHaveTextContent(/reset link unavailable/i);
    expect(handoff).toHaveTextContent(/reset link could not be generated/i);
    expect(handoff).toHaveTextContent(/use send reset link after the account issue is resolved/i);
    expect(handoff).not.toHaveTextContent(/temporary password/i);
    expect(within(handoff).queryByRole('button', { name: /copy reset link/i })).not.toBeInTheDocument();
    expect(within(handoff).queryByRole('link', { name: /open reset link/i })).not.toBeInTheDocument();
  });
  it('renders backend reset-link-unavailable credential modes without copy/open controls', () => {
    render(<CoachCommandLogEntry entry={{
      ...baseEntry,
      commandResult: {
        command: 'reset_client_password',
        client: { firstName: 'Ava' },
        result: {
          credentialMode: 'reset_link_unavailable',
          resetEmailSent: false,
          emailSent: false,
        },
      },
    }} />);

    const handoff = screen.getByRole('region', { name: /client access handoff/i });

    expect(handoff).toHaveTextContent(/reset link unavailable/i);
    expect(handoff).toHaveTextContent(/reset link could not be generated/i);
    expect(handoff).toHaveTextContent(/use send reset link after the account issue is resolved/i);
    expect(handoff).not.toHaveTextContent(/temporary password/i);
    expect(within(handoff).queryByRole('button', { name: /copy reset link/i })).not.toBeInTheDocument();
    expect(within(handoff).queryByRole('link', { name: /open reset link/i })).not.toBeInTheDocument();
  });
});
