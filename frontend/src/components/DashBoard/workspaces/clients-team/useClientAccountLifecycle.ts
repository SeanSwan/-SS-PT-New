import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { ClientOption } from './ClientSelectorDropdown';
import { getClientDisplayName } from './clientIdentity';
import type { ClientLifecycleConfirmRequest } from './ClientLifecycleConfirmDialog';

type ClientHubToast = (opts: {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}) => void;

interface UseClientAccountLifecycleParams {
  authAxios: any;
  selectedClient: ClientOption | null;
  setClients: Dispatch<SetStateAction<ClientOption[]>>;
  setSelectedClient: Dispatch<SetStateAction<ClientOption | null>>;
  toast: ClientHubToast;
}

export const useClientAccountLifecycle = ({
  authAxios,
  selectedClient,
  setClients,
  setSelectedClient,
  toast,
}: UseClientAccountLifecycleParams) => {
  const [deactivationConfirmation, setDeactivationConfirmation] =
    useState<ClientLifecycleConfirmRequest | null>(null);

  const deactivateSelectedClient = useCallback(async () => {
    if (!authAxios || !selectedClient) return;

    try {
      const response = await authAxios.delete(`/api/admin/clients/${selectedClient.id}`, {
        data: { softDelete: true },
      });
      const message = response.data?.message || 'Client deactivated successfully. Records are retained for 6 months.';
      setClients(prev => prev.filter(client => client.id !== selectedClient.id));
      setSelectedClient(prev =>
        prev?.id === selectedClient.id ? null : prev
      );
      toast({
        title: 'Client deactivated',
        description: message,
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Client deactivation failed',
        description: error?.response?.data?.message || error?.message || 'Unable to deactivate this client.',
        variant: 'destructive',
      });
    }
  }, [authAxios, selectedClient, setClients, setSelectedClient, toast]);

  const handleDeactivateClient = useCallback(() => {
    if (!authAxios || !selectedClient) return;

    const clientName = getClientDisplayName(selectedClient);
    setDeactivationConfirmation({
      title: `Deactivate ${clientName}?`,
      message: 'This is a soft delete. Login access stops immediately, future scheduled sessions are cancelled, and profile, workout history, payments, and remaining session credits are retained for 6 months.',
      confirmLabel: 'Deactivate client',
      onConfirm: deactivateSelectedClient,
    });
  }, [authAxios, deactivateSelectedClient, selectedClient]);

  const closeDeactivationConfirmation = useCallback(() => {
    setDeactivationConfirmation(null);
  }, []);

  const handleReactivateClient = useCallback(async () => {
    if (!authAxios || !selectedClient) return;

    try {
      const response = await authAxios.put(`/api/admin/clients/${selectedClient.id}/restore`, {});
      const message = response.data?.message || 'Client reactivated successfully. Login access restored.';
      setClients(prev => prev.map(client =>
        client.id === selectedClient.id ? { ...client, isActive: true } : client
      ));
      setSelectedClient(prev =>
        prev?.id === selectedClient.id ? { ...prev, isActive: true } : prev
      );
      toast({
        title: 'Client reactivated',
        description: message,
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Client reactivation failed',
        description: error?.response?.data?.message || error?.message || 'Unable to reactivate this client.',
        variant: 'destructive',
      });
    }
  }, [authAxios, selectedClient, setClients, setSelectedClient, toast]);

  const sendSelectedClientPasswordReset = useCallback(async () => {
    if (!authAxios || !selectedClient) return;

    try {
      const response = await authAxios.post(`/api/admin/clients/${selectedClient.id}/send-password-reset`, {});
      toast({
        title: 'Reset link sent',
        description: response.data?.message || 'Password reset email sent.',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Reset link failed',
        description: error?.response?.data?.message || error?.message || 'Unable to send password reset email.',
        variant: 'destructive',
      });
    }
  }, [authAxios, selectedClient, toast]);

  const handleSendPasswordReset = useCallback(() => {
    if (!authAxios || !selectedClient) return;

    const clientName = getClientDisplayName(selectedClient);
    setDeactivationConfirmation({
      title: `Send password reset link to ${clientName}?`,
      message: 'The client will receive a secure reset link by email. No password is generated, shown, dictated, or stored in the admin interface.',
      confirmLabel: 'Send reset link',
      onConfirm: sendSelectedClientPasswordReset,
    });
  }, [authAxios, selectedClient, sendSelectedClientPasswordReset]);

  return {
    handleDeactivateClient,
    handleReactivateClient,
    handleSendPasswordReset,
    deactivationConfirmation,
    closeDeactivationConfirmation,
  };
};
