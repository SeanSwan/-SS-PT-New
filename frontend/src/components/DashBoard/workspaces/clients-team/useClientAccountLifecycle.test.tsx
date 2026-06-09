import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { useClientAccountLifecycle } from './useClientAccountLifecycle';
import type { ClientOption } from './ClientSelectorDropdown';
import ClientLifecycleConfirmDialog from './ClientLifecycleConfirmDialog';

const blankNameClient: ClientOption = {
  id: 7,
  firstName: '',
  lastName: '',
  email: 'fallback.client@example.test',
  clientSource: 'swanstudios',
  availableSessions: 2,
};

const Harness = ({ selectedClient }: { selectedClient: ClientOption }) => {
  const {
    handleDeactivateClient,
    deactivationConfirmation,
    closeDeactivationConfirmation,
  } = useClientAccountLifecycle({
    authAxios: { delete: vi.fn(), put: vi.fn() },
    selectedClient,
    setClients: vi.fn(),
    setSelectedClient: vi.fn(),
    toast: vi.fn(),
  });

  return (
    <>
      <button type="button" onClick={handleDeactivateClient}>
        Deactivate
      </button>
      <ClientLifecycleConfirmDialog
        request={deactivationConfirmation}
        onClose={closeDeactivationConfirmation}
      />
    </>
  );
};

describe('useClientAccountLifecycle', () => {
  it('uses fallback identity in the soft-delete confirmation dialog', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(<Harness selectedClient={blankNameClient} />);

    await user.click(screen.getByRole('button', { name: /deactivate/i }));

    expect(await screen.findByRole('dialog', {
      name: /deactivate fallback\.client@example\.test\?/i,
    })).toBeInTheDocument();
    expect(screen.getByText(/retained for 6 months/i)).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('keeps the destructive action behind the dialog confirm button', async () => {
    const user = userEvent.setup();
    const deleteMock = vi.fn().mockResolvedValue({
      data: { message: 'Client deactivated successfully. Records are retained for 6 months.' },
    });
    const setClients = vi.fn();
    const setSelectedClient = vi.fn();
    const toast = vi.fn();

    const ActionHarness = () => {
      const {
        handleDeactivateClient,
        deactivationConfirmation,
        closeDeactivationConfirmation,
      } = useClientAccountLifecycle({
        authAxios: { delete: deleteMock, post: vi.fn(), put: vi.fn() },
        selectedClient: blankNameClient,
        setClients,
        setSelectedClient,
        toast,
      });

      return (
        <>
          <button type="button" onClick={handleDeactivateClient}>Deactivate</button>
          <ClientLifecycleConfirmDialog
            request={deactivationConfirmation}
            onClose={closeDeactivationConfirmation}
          />
        </>
      );
    };

    render(<ActionHarness />);

    await user.click(screen.getByRole('button', { name: /deactivate/i }));
    expect(deleteMock).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: /deactivate client/i }));

    expect(deleteMock).toHaveBeenCalledWith(
      '/api/admin/clients/7',
      { data: { softDelete: true } }
    );
    const updateClients = setClients.mock.calls.at(-1)?.[0];
    const updateSelectedClient = setSelectedClient.mock.calls.at(-1)?.[0];

    expect(updateClients([
      blankNameClient,
      { ...blankNameClient, id: 9, email: 'active.client@example.test' },
    ])).toEqual([
      { ...blankNameClient, isActive: false },
      { ...blankNameClient, id: 9, email: 'active.client@example.test' },
    ]);
    expect(updateSelectedClient(blankNameClient)).toEqual({
      ...blankNameClient,
      isActive: false,
    });
  });

  it('sends password reset email only after branded confirmation', async () => {
    const user = userEvent.setup();
    const postMock = vi.fn().mockResolvedValue({
      data: { message: 'Password reset email sent.' },
    });
    const toast = vi.fn();

    const ActionHarness = () => {
      const {
        handleSendPasswordReset,
        deactivationConfirmation,
        closeDeactivationConfirmation,
      } = useClientAccountLifecycle({
        authAxios: { delete: vi.fn(), post: postMock, put: vi.fn() },
        selectedClient: blankNameClient,
        setClients: vi.fn(),
        setSelectedClient: vi.fn(),
        toast,
      });

      return (
        <>
          <button type="button" onClick={handleSendPasswordReset}>Open reset dialog</button>
          <ClientLifecycleConfirmDialog
            request={deactivationConfirmation}
            onClose={closeDeactivationConfirmation}
          />
        </>
      );
    };

    render(<ActionHarness />);

    await user.click(screen.getByRole('button', { name: /open reset dialog/i }));
    expect(postMock).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog', {
      name: /send password reset link to fallback\.client@example\.test\?/i,
    })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(postMock).toHaveBeenCalledWith('/api/admin/clients/7/send-password-reset', {});
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Reset link sent',
    }));
  });

  it('keeps a directly loaded inactive client in the local list after reactivation', async () => {
    const putMock = vi.fn().mockResolvedValue({
      data: { message: 'Client reactivated successfully. Login access restored.' },
    });
    const setClients = vi.fn();
    const setSelectedClient = vi.fn();
    const inactiveClient = { ...blankNameClient, isActive: false };

    const ActionHarness = () => {
      const { handleReactivateClient } = useClientAccountLifecycle({
        authAxios: { delete: vi.fn(), post: vi.fn(), put: putMock },
        selectedClient: inactiveClient,
        setClients,
        setSelectedClient,
        toast: vi.fn(),
      });

      return (
        <button type="button" onClick={handleReactivateClient}>
          Reactivate
        </button>
      );
    };

    render(<ActionHarness />);

    await userEvent.click(screen.getByRole('button', { name: /reactivate/i }));

    const updateClients = setClients.mock.calls.at(-1)?.[0];
    const updateSelectedClient = setSelectedClient.mock.calls.at(-1)?.[0];

    expect(updateClients([])).toEqual([{ ...inactiveClient, isActive: true }]);
    expect(updateSelectedClient(inactiveClient)).toEqual({
      ...inactiveClient,
      isActive: true,
    });
  });
});
