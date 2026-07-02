import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authAxios: {},
  createClient: vi.fn(),
  createExternalClient: vi.fn(),
  sendClientPasswordReset: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mocks.authAxios }),
}));

vi.mock('../../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../../../services/adminClientService', () => ({
  createAdminClientService: () => ({
    createClient: mocks.createClient,
    createExternalClient: mocks.createExternalClient,
    sendClientPasswordReset: mocks.sendClientPasswordReset,
  }),
}));

import { useManualClientCreation } from './useManualClientCreation';

const Harness = ({ onClientsChanged }: { onClientsChanged: () => void }) => {
  const { creationHandoff, handleManualCreate } = useManualClientCreation({ onClientsChanged });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void handleManualCreate({
            firstName: '',
            lastName: '',
            email: 'created.client@example.test',
            username: 'created-client',
            password: 'TempPass123!',
            clientSource: 'swanstudios',
          });
        }}
      >
        Create Swan
      </button>
      <button
        type="button"
        onClick={() => {
          void handleManualCreate({
            firstName: 'Move',
            lastName: 'Client',
            email: 'move.client@example.test',
            username: '',
            password: '',
            clientSource: 'move_fitness',
          });
        }}
      >
        Create Move
      </button>
      {creationHandoff && (
        <output data-testid="creation-handoff">
          {creationHandoff.clientName} {creationHandoff.credentialMode} {creationHandoff.claimUrl || creationHandoff.resetUrl || ''}
          {'temporaryPassword' in creationHandoff ? ' password leaked' : ''}
        </output>
      )}
    </>
  );
};

describe('useManualClientCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses fallback identity in the created-client toast', async () => {
    const user = userEvent.setup();
    const onClientsChanged = vi.fn();
    mocks.createClient.mockResolvedValue({
      success: true,
      data: {
        client: {
          id: 7,
          firstName: '',
          lastName: '',
          email: 'created.client@example.test',
        },
      },
    });

    render(<Harness onClientsChanged={onClientsChanged} />);

    await user.click(screen.getByRole('button', { name: /create swan/i }));

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
        description: expect.stringContaining('created.client@example.test'),
      }));
    });
    expect(onClientsChanged).toHaveBeenCalledTimes(1);
  });

  it('does not send a duplicate reset email when create response lacks reset handoff status', async () => {
    const user = userEvent.setup();
    const onClientsChanged = vi.fn();
    mocks.createClient.mockResolvedValue({
      success: true,
      data: {
        client: {
          id: 7,
          firstName: 'Login',
          lastName: 'Needs Review',
          email: 'login.needs.review@example.test',
        },
      },
    });

    render(<Harness onClientsChanged={onClientsChanged} />);

    await user.click(screen.getByRole('button', { name: /create swan/i }));

    await waitFor(() => {
      expect(mocks.createClient).toHaveBeenCalledTimes(1);
    });
    expect(mocks.sendClientPasswordReset).not.toHaveBeenCalled();
    expect(await screen.findByTestId('creation-handoff')).toHaveTextContent('reset_link_needed');
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
    }));
  });
  it('uses the backend reset handoff without sending a duplicate reset email', async () => {
    const user = userEvent.setup();
    const onClientsChanged = vi.fn();
    mocks.createClient.mockResolvedValue({
      success: true,
      data: {
        client: {
          id: 7,
          firstName: 'Backend',
          lastName: 'Reset',
          email: 'backend.reset@example.test',
        },
        credentialAction: 'reset_link_sent',
        resetEmailSent: true,
      },
    });

    render(<Harness onClientsChanged={onClientsChanged} />);

    await user.click(screen.getByRole('button', { name: /create swan/i }));

    await waitFor(() => {
      expect(mocks.createClient).toHaveBeenCalledTimes(1);
    });
    expect(mocks.sendClientPasswordReset).not.toHaveBeenCalled();
    expect(await screen.findByTestId('creation-handoff')).toHaveTextContent('reset_link_sent');
  });
  it('uses the backend manual reset link without sending a duplicate reset email', async () => {
    const user = userEvent.setup();
    const onClientsChanged = vi.fn();
    mocks.createClient.mockResolvedValue({
      success: true,
      data: {
        client: {
          id: 7,
          firstName: 'Manual',
          lastName: 'Fallback',
          email: 'manual.fallback@example.test',
        },
        credentialAction: 'reset_link_ready',
        resetEmailSent: false,
        resetUrl: 'https://sswanstudios.com/reset-password/raw-token',
        expiresInMinutes: 60,
      },
    });

    render(<Harness onClientsChanged={onClientsChanged} />);

    await user.click(screen.getByRole('button', { name: /create swan/i }));

    await waitFor(() => {
      expect(mocks.createClient).toHaveBeenCalledTimes(1);
    });
    expect(mocks.sendClientPasswordReset).not.toHaveBeenCalled();
    const handoff = await screen.findByTestId('creation-handoff');
    expect(handoff).toHaveTextContent('reset_link_ready');
    expect(handoff).toHaveTextContent('https://sswanstudios.com/reset-password/raw-token');
  });
  it('uses backend credentialMode reset-link-sent without downgrading the handoff', async () => {
    const user = userEvent.setup();
    const onClientsChanged = vi.fn();
    mocks.createClient.mockResolvedValue({
      success: true,
      data: {
        client: {
          id: 7,
          firstName: 'Mode',
          lastName: 'Sent',
          email: 'mode.sent@example.test',
        },
        credentialMode: 'reset_link_sent',
      },
    });

    render(<Harness onClientsChanged={onClientsChanged} />);

    await user.click(screen.getByRole('button', { name: /create swan/i }));

    await waitFor(() => {
      expect(mocks.createClient).toHaveBeenCalledTimes(1);
    });
    expect(mocks.sendClientPasswordReset).not.toHaveBeenCalled();
    expect(await screen.findByTestId('creation-handoff')).toHaveTextContent('reset_link_sent');
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'default',
    }));
  });
  it('keeps Move Fitness manual creation on the claim-link activation path', async () => {
    const user = userEvent.setup();
    const onClientsChanged = vi.fn();
    mocks.createExternalClient.mockResolvedValue({
      success: true,
      data: {
        client: {
          id: 11,
          firstName: 'Move',
          lastName: 'Client',
          email: 'move.client@example.test',
        },
        temporaryPassword: 'NeverRender123!',
        claimToken: 'SWAN-ABCD1234',
        claimUrl: 'https://sswanstudios.com/claim/SWAN-ABCD1234',
      },
    });

    render(<Harness onClientsChanged={onClientsChanged} />);

    await user.click(screen.getByRole('button', { name: /create move/i }));

    await waitFor(() => {
      expect(mocks.createExternalClient).toHaveBeenCalledTimes(1);
    });
    expect(mocks.sendClientPasswordReset).not.toHaveBeenCalled();
    const handoff = await screen.findByTestId('creation-handoff');
    expect(handoff).toHaveTextContent('claim_link_ready');
    expect(handoff).toHaveTextContent('https://sswanstudios.com/claim/SWAN-ABCD1234');
    expect(handoff).not.toHaveTextContent('password leaked');
  });
});
