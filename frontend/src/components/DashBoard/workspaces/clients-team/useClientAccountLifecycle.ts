import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { ClientOption } from './ClientSelectorDropdown';
import { getClientDisplayName } from './clientIdentity';
import type { ClientLifecycleConfirmRequest } from './ClientLifecycleConfirmDialog';
import type { ManualClientCreationHandoff } from './manualClientCreationHandoff';
import { buildClaimLinkHandoff, buildClaimLinkToast, buildPasswordResetHandoff, buildPasswordResetToast, toRecord } from './clientAccessHandoffBuilders';

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

const asDeactivatedClient = (client: ClientOption): ClientOption => ({
  ...client,
  isActive: false,
});

const retainDeactivatedClient = (
  clients: ClientOption[],
  selectedClient: ClientOption
): ClientOption[] => {
  const deactivatedClient = asDeactivatedClient(selectedClient);
  const hasSelectedClient = clients.some(client => client.id === selectedClient.id);
  if (!hasSelectedClient) return [deactivatedClient, ...clients];

  return clients.map(client =>
    client.id === selectedClient.id ? asDeactivatedClient(client) : client
  );
};

const retainSelectedDeactivatedClient = (
  currentClient: ClientOption | null,
  selectedClientId: number
): ClientOption | null =>
  currentClient?.id === selectedClientId
    ? asDeactivatedClient(currentClient)
    : currentClient;

const asReactivatedClient = (client: ClientOption): ClientOption => ({
  ...client,
  isActive: true,
});

const retainReactivatedClient = (
  clients: ClientOption[],
  selectedClient: ClientOption
): ClientOption[] => {
  const reactivatedClient = asReactivatedClient(selectedClient);
  const hasSelectedClient = clients.some(client => client.id === selectedClient.id);
  if (!hasSelectedClient) return [reactivatedClient, ...clients];

  return clients.map(client =>
    client.id === selectedClient.id ? asReactivatedClient(client) : client
  );
};

const retainSelectedReactivatedClient = (
  currentClient: ClientOption | null,
  selectedClientId: number
): ClientOption | null =>
  currentClient?.id === selectedClientId
    ? asReactivatedClient(currentClient)
    : currentClient;

const hasLifecycleTarget = (
  authAxios: any,
  selectedClient: ClientOption | null
): selectedClient is ClientOption =>
  Boolean(authAxios && selectedClient);

const getResponseMessage = (data: any, fallback: string): string => {
  const message = data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
};

const getLifecycleErrorMessage = (error: any, fallback: string): string =>
  getResponseMessage(error?.response?.data, error?.message || fallback);

export const useClientAccountLifecycle = ({
  authAxios,
  selectedClient,
  setClients,
  setSelectedClient,
  toast,
}: UseClientAccountLifecycleParams) => {
  const [deactivationConfirmation, setDeactivationConfirmation] =
    useState<ClientLifecycleConfirmRequest | null>(null);
  const [passwordResetHandoff, setPasswordResetHandoff] =
    useState<ManualClientCreationHandoff | null>(null);

  const deactivateSelectedClient = useCallback(async () => {
    if (!hasLifecycleTarget(authAxios, selectedClient)) return;

    try {
      const response = await authAxios.delete(`/api/admin/clients/${selectedClient.id}`, {
        data: { softDelete: true },
      });
      const message = getResponseMessage(
        response.data,
        'Client deactivated successfully. Records are retained for 6 months.'
      );
      setClients(prev => retainDeactivatedClient(prev, selectedClient));
      setSelectedClient(prev =>
        retainSelectedDeactivatedClient(prev, selectedClient.id)
      );
      toast({
        title: 'Client deactivated',
        description: message,
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Client deactivation failed',
        description: getLifecycleErrorMessage(error, 'Unable to deactivate this client.'),
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
    if (!hasLifecycleTarget(authAxios, selectedClient)) return;

    try {
      const response = await authAxios.put(`/api/admin/clients/${selectedClient.id}/restore`, {});
      const message = getResponseMessage(
        response.data,
        'Client reactivated successfully. Login access restored.'
      );
      setClients(prev => retainReactivatedClient(prev, selectedClient));
      setSelectedClient(prev =>
        retainSelectedReactivatedClient(prev, selectedClient.id)
      );
      toast({
        title: 'Client reactivated',
        description: message,
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Client reactivation failed',
        description: getLifecycleErrorMessage(error, 'Unable to reactivate this client.'),
        variant: 'destructive',
      });
    }
  }, [authAxios, selectedClient, setClients, setSelectedClient, toast]);

  const sendSelectedClientPasswordReset = useCallback(async () => {
    if (!authAxios || !selectedClient) return;

    try {
      const response = await authAxios.post(`/api/admin/clients/${selectedClient.id}/send-password-reset`, {});
      const fallbackData = /password reset email sent|reset email sent/i.test(response.data?.message || '') ? { resetEmailSent: true } : response.data;
      const handoff = buildPasswordResetHandoff(selectedClient, response.data?.data ?? fallbackData);
      setPasswordResetHandoff(handoff);
      toast(buildPasswordResetToast(handoff, getResponseMessage(response.data, handoff.message)));
    } catch (error: any) {
      const errorData = error?.response?.data?.data ?? error?.response?.data;
      const errorRecord = toRecord(errorData);
      if (errorRecord.credentialIssue === 'reset_link_unavailable' || errorRecord.credentialMode === 'reset_link_unavailable' || errorRecord.error === 'reset_link_unavailable') {
        const handoff = buildPasswordResetHandoff(selectedClient, errorData);
        setPasswordResetHandoff(handoff);
        toast(buildPasswordResetToast(handoff, getLifecycleErrorMessage(error, handoff.message)));
        return;
      }
      setPasswordResetHandoff(null);
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

  const generateSelectedClientClaimLink = useCallback(async () => {
    if (!authAxios || !selectedClient) return;

    try {
      const response = await authAxios.post('/api/claim/generate-token', { clientId: selectedClient.id });
      const handoff = buildClaimLinkHandoff(selectedClient, response.data?.data ?? response.data);
      setPasswordResetHandoff(handoff);
      toast(buildClaimLinkToast(handoff, getResponseMessage(response.data, handoff.message)));
    } catch (error: any) {
      setPasswordResetHandoff(null);
      toast({
        title: 'Claim link failed',
        description: error?.response?.data?.message || error?.message || 'Unable to generate a claim link.',
        variant: 'destructive',
      });
    }
  }, [authAxios, selectedClient, toast]);

  const handleGenerateClaimLink = useCallback(() => {
    if (!authAxios || !selectedClient) return;

    const clientName = getClientDisplayName(selectedClient);
    setDeactivationConfirmation({
      title: `Generate claim link for ${clientName}?`,
      message: 'This creates a copyable secure claim link or code for account activation. Send it to the client by approved email or text. No password is generated, shown, dictated, or stored in the admin interface.',
      confirmLabel: 'Generate claim link',
      onConfirm: generateSelectedClientClaimLink,
    });
  }, [authAxios, generateSelectedClientClaimLink, selectedClient]);

  const activePasswordResetHandoff = selectedClient && passwordResetHandoff?.clientId === String(selectedClient.id)
    ? passwordResetHandoff
    : null;

  const clearPasswordResetHandoff = useCallback(() => setPasswordResetHandoff(null), []);

  return {
    handleDeactivateClient,
    handleReactivateClient,
    handleSendPasswordReset,
    handleGenerateClaimLink,
    deactivationConfirmation,
    closeDeactivationConfirmation,
    passwordResetHandoff: activePasswordResetHandoff,
    clearPasswordResetHandoff,
  };
};
