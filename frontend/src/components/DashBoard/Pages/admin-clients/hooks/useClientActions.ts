/**
 * useClientActions Hook
 * =====================
 * Extracts context-menu action handlers from AdminClientManagementView
 * to reduce monolith size and improve testability.
 */

import { useCallback } from 'react';

interface UseClientActionsParams {
  adminClientService: any;
  toast: (opts: { title: string; description: string; variant?: string }) => void;
  fetchClients: () => void;
  setSelectedClient: (client: any) => void;
  setShowDetailsModal: (show: boolean) => void;
  setShowEditModal: (show: boolean) => void;
  setShowCreateModal: (show: boolean) => void;
  handleMenuClose: () => void;
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
    if (window.confirm(`Are you sure you want to deactivate ${client.firstName} ${client.lastName}?`)) {
      try {
        const response = await adminClientService.deleteClient(client.id);
        if (response) {
          toast({
            title: 'Success',
            description: 'Client deactivated successfully',
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
    }
    handleMenuClose();
  }, [adminClientService, toast, fetchClients, handleMenuClose]);

  const handleResetPassword = useCallback(async (client: any) => {
    const newPassword = prompt('Enter new password for client:');
    if (newPassword && newPassword.length >= 6) {
      try {
        const response = await adminClientService.resetClientPassword(client.id);
        if (response.success) {
          toast({
            title: 'Success',
            description: 'Password reset successfully',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Error',
            description: 'Failed to reset password',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to reset password',
          variant: 'destructive',
        });
      }
    } else if (newPassword !== null) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
    }
    handleMenuClose();
  }, [adminClientService, toast, handleMenuClose]);

  const handleCreateClient = useCallback(async (data: any) => {
    try {
      const response = await adminClientService.createClient(data);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Client created successfully',
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
