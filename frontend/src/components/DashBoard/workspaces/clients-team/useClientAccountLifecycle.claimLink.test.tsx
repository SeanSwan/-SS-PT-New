import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { useClientAccountLifecycle } from './useClientAccountLifecycle';
import type { ClientOption } from './ClientSelectorDropdown';
import ClientLifecycleConfirmDialog from './ClientLifecycleConfirmDialog';

const claimPath = '/api/claim/generate-token';

const claimPendingClient: ClientOption = {
  id: 7,
  firstName: '',
  lastName: '',
  email: 'fallback.client@example.test',
  clientSource: 'move_fitness',
  accountStatus: 'stub',
  availableSessions: 0,
};

const renderClaimHarness = (
  postMock: ReturnType<typeof vi.fn>,
  toast: ReturnType<typeof vi.fn>,
) => {
  const ClaimHarness = () => {
    const {
      handleGenerateClaimLink,
      deactivationConfirmation,
      closeDeactivationConfirmation,
      passwordResetHandoff,
    } = useClientAccountLifecycle({
      authAxios: { delete: vi.fn(), post: postMock, put: vi.fn() },
      selectedClient: claimPendingClient,
      setClients: vi.fn(),
      setSelectedClient: vi.fn(),
      toast,
    });

    return (
      <>
        <button type="button" onClick={handleGenerateClaimLink}>Open claim dialog</button>
        <ClientLifecycleConfirmDialog
          request={deactivationConfirmation}
          onClose={closeDeactivationConfirmation}
        />
        {passwordResetHandoff && (
          <section aria-label="claim handoff">
            <span>{passwordResetHandoff.credentialMode}</span>
            <span>{passwordResetHandoff.claimUrl}</span>
            <span>{passwordResetHandoff.claimCode}</span>
            <span>{passwordResetHandoff.message}</span>
          </section>
        )}
      </>
    );
  };

  render(<ClaimHarness />);
};

describe('useClientAccountLifecycle claim-link recovery', () => {
  it('generates a selected-client claim link only after branded confirmation', async () => {
    const user = userEvent.setup();
    const claimUrl = 'https://sswanstudios.com/claim/SWAN-ABCD1234';
    const postMock = vi.fn().mockResolvedValue({
      data: {
        success: true,
        message: 'Claim link generated.',
        data: {
          token: 'SWAN-ABCD1234',
          claimUrl,
          expiresAt: '2026-07-01T00:00:00.000Z',
        },
      },
    });
    const toast = vi.fn();

    renderClaimHarness(postMock, toast);

    await user.click(screen.getByRole('button', { name: /open claim dialog/i }));
    expect(postMock).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog', {
      name: /generate claim link for fallback\.client@example\.test\?/i,
    });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/copyable secure claim link or code/i);
    expect(dialog).not.toHaveTextContent(/client will receive/i);

    await user.click(screen.getByRole('button', { name: /^generate claim link$/i }));

    expect(postMock).toHaveBeenCalledWith(claimPath, { clientId: 7 });
    const handoff = await screen.findByRole('region', { name: /claim handoff/i });
    expect(handoff).toHaveTextContent('claim_link_ready');
    expect(handoff).toHaveTextContent(claimUrl);
    expect(handoff).toHaveTextContent('SWAN-ABCD1234');
    expect(handoff).not.toHaveTextContent(/password/i);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Claim link ready',
      description: 'Claim link generated.',
      variant: 'default',
    }));
  });
});