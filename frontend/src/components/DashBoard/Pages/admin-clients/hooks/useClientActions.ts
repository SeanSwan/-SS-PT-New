/**
 * useClientActions Hook
 * =====================
 * Extracts context-menu action handlers from AdminClientManagementView
 * to reduce monolith size and improve testability.
 */

import { useCallback } from 'react';
import { normalizeClientSource } from '../../../workspaces/clients-team/clientSessionSignal';

export interface ClientActionConfirmationRequest {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: 'danger' | 'warning';
  onConfirm: () => Promise<void>;
}

interface UseClientActionsParams {
  adminClientService: any;
  toast: (opts: { title: string; description: string; variant?: string }) => void;
  fetchClients: () => void;
  setSelectedClient: (client: any) => void;
  setShowDetailsModal: (show: boolean) => void;
  setShowEditModal: (show: boolean) => void;
  setShowCreateModal: (show: boolean) => void;
  handleMenuClose: () => void;
  requestConfirmation: (request: ClientActionConfirmationRequest) => void;
}

export function useClientActions({
  adminClientService,
  toast,
  fetchClients,
  setSelectedClient,
  setShowDetailsModal,
  setShowEditModal,
  setShowCreateModal,
  handleMenuClose,
  requestConfirmation,
}: UseClientActionsParams) {
  const handleViewDetails = useCallback(async (client: any) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
    handleMenuClose();
  }, [setSelectedClient, setShowDetailsModal, handleMenuClose]);

  const handleEdit = useCallback((client: any) => {
    setSelectedClient(client);
    setShowEditModal(true);
    handleMenuClose();
  }, [setSelectedClient, setShowEditModal, handleMenuClose]);

  const handleDelete = useCallback(async (client: any) => {
    const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'this client';
    requestConfirmation({
      title: `Deactivate ${clientName}?`,
      message: 'This is a soft delete. Login access stops immediately, future scheduled sessions are cancelled, and profile, workout history, payments, and remaining session credits are retained for 6 months.',
      confirmLabel: 'Deactivate client',
      cancelLabel: 'Keep client',
      tone: 'danger',
      onConfirm: async () => {
        try {
          const response = await adminClientService.deleteClient(client.id);
          if (response) {
            toast({
              title: 'Client deactivated',
              description: response.message || 'Client deactivated successfully. Records are retained for 6 months.',
              variant: 'default',
            });
            fetchClients();
          } else {
            toast({
              title: 'Error',
              description: 'Failed to deactivate client',
              variant: 'destructive',
            });
          }
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error.message || 'Failed to deactivate client',
            variant: 'destructive',
          });
        }
      },
    });
    handleMenuClose();
  }, [adminClientService, toast, fetchClients, handleMenuClose, requestConfirmation]);

  const handleResetPassword = useCallback(async (client: any) => {
    const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'this client';
    requestConfirmation({
      title: `Send reset link to ${clientName}?`,
      message: 'This emails a password reset link to the client without changing their account, workouts, or session credits.',
      confirmLabel: 'Send reset link',
      cancelLabel: 'Do not send',
      tone: 'warning',
      onConfirm: async () => {
        try {
          const response = await adminClientService.sendClientPasswordReset(client.id);
          toast({
            title: response?.success ? 'Reset link sent' : 'Error',
            description: response?.message || 'Password reset email sent.',
            variant: response?.success ? 'default' : 'destructive',
          });
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error.message || 'Failed to send password reset email',
            variant: 'destructive',
          });
        }
      },
    });
    handleMenuClose();
  }, [adminClientService, toast, handleMenuClose, requestConfirmation]);

  const handleCreateClient = useCallback(async (data: any) => {
    try {
      const normalizedClientSource = normalizeClientSource(data.clientSource);
      const isExternal = normalizedClientSource !== 'swanstudios';
      const response = isExternal
        ? await adminClientService.createExternalClient(data)
        : await adminClientService.createClient(data);
      if (response.success) {
        const sourceLabel = isExternal ? ` (${normalizedClientSource})` : '';
        toast({
          title: 'Success',
          description: `Client created successfully${sourceLabel}`,
          variant: 'default',
        });
        setShowCreateModal(false);
        fetchClients();
      } else {
        throw new Error(response.message || 'Failed to create client');
      }
    } catch (error: any) {
      console.error('Error creating client:', error);
      throw error;
    }
  }, [adminClientService, toast, setShowCreateModal, fetchClients]);

  return {
    handleViewDetails,
    handleEdit,
    handleDelete,
    handleResetPassword,
    handleCreateClient,
  };
}
