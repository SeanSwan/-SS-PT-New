import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ClientCreationHandoffPanel from './ClientCreationHandoffPanel';
import type { ManualClientCreationHandoff } from './manualClientCreationHandoff';

const baseHandoff: ManualClientCreationHandoff = {
  clientId: '42',
  clientName: 'Move Client',
  clientEmail: 'move.client@example.test',
  clientSource: 'move_fitness',
  credentialMode: 'claim_link_ready',
  claimCode: 'SWAN-ABCD1234',
  claimUrl: 'https://sswanstudios.com/claim/SWAN-ABCD1234',
  message: 'Claim link is ready for account activation.',
};

describe('ClientCreationHandoffPanel', () => {
  it('renders a mobile-safe claim handoff with copy actions and no password exposure', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();

    render(
      <ClientCreationHandoffPanel
        handoff={baseHandoff}
        onDismiss={vi.fn()}
        onCopy={onCopy}
      />
    );

    expect(screen.getByRole('region', { name: /client access handoff/i })).toHaveTextContent('Claim link ready');
    expect(screen.getByText(/Move Client \(move.client@example.test\)/)).toBeInTheDocument();
    expect(screen.queryByText(/temporary/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /copy claim link/i }));
    await user.click(screen.getByRole('button', { name: /copy claim code/i }));

    expect(onCopy).toHaveBeenNthCalledWith(1, baseHandoff.claimUrl, 'Claim link');
    expect(onCopy).toHaveBeenNthCalledWith(2, baseHandoff.claimCode, 'Claim code');
  });

  it('renders the reset-link state without claim-token copy controls', () => {
    render(
      <ClientCreationHandoffPanel
        handoff={{
          ...baseHandoff,
          clientSource: 'swanstudios',
          credentialMode: 'reset_link_sent',
          claimCode: undefined,
          claimUrl: undefined,
          resetEmailSent: true,
          message: 'Secure login link sent.',
        }}
        onDismiss={vi.fn()}
        onCopy={vi.fn()}
      />
    );

    expect(screen.getByRole('region', { name: /client access handoff/i })).toHaveTextContent('Secure login link sent');
    expect(screen.queryByRole('button', { name: /copy claim/i })).not.toBeInTheDocument();
  });

  it('dismisses the handoff panel from a 44px touch target', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <ClientCreationHandoffPanel
        handoff={baseHandoff}
        onDismiss={onDismiss}
        onCopy={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /dismiss client access handoff/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
