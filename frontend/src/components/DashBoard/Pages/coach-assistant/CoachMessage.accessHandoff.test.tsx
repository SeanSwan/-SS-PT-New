import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { CoachMessage } from './CoachMessage';
import type { CoachMessageData } from './SwanCoachTypes';

function assistantResetResult(resetUrl: string): CoachMessageData {
  return {
    id: 'msg-reset-handoff',
    role: 'assistant',
    content: 'Reset link ready for Ava.',
    timestamp: '2026-06-30T15:30:00.000Z',
    metadata: {
      commandResult: {
        command: 'reset_client_password',
        client: { id: 42, firstName: 'Ava' },
        result: {
          credentialAction: 'reset_link_ready',
          resetEmailSent: false,
          emailSent: false,
          resetUrl,
        },
      },
    },
  };
}

describe('CoachMessage access handoff', () => {
  it('renders reset-link copy controls for confirmed reset commands in the assistant chat path', () => {
    const resetUrl = 'https://sswanstudios.com/reset-password/manual-token';

    render(
      <MemoryRouter>
        <CoachMessage message={assistantResetResult(resetUrl)} />
      </MemoryRouter>,
    );

    const handoff = screen.getByRole('region', { name: /client access handoff/i });
    expect(handoff).toHaveTextContent(/reset link ready/i);
    expect(handoff).toHaveTextContent(/Ava/i);
    expect(within(handoff).getByRole('button', { name: /copy reset link/i })).toBeInTheDocument();
    expect(within(handoff).getByRole('link', { name: /open reset link/i })).toHaveAttribute('href', resetUrl);
  });
});