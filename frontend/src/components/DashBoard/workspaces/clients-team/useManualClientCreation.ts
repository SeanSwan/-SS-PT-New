/**
 * HOOK: useManualClientCreation
 * PURPOSE: Shared manual client creation boundary for the canonical Client Hub.
 */

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import {
  createAdminClientService,
  type AssignableTrainer,
  type CreateClientRequest,
} from '../../../../services/adminClientService';
import { getClientDisplayName } from './clientIdentity';
import { normalizeClientSource } from './clientSessionSignal';

interface UseManualClientCreationParams {
  onClientsChanged: () => Promise<unknown> | unknown;
}

export function useManualClientCreation({
  onClientsChanged,
}: UseManualClientCreationParams) {
  const { authAxios } = useAuth() as any;
  const { toast } = useToast();
  const [manualCreateOpen, setManualCreateOpen] = useState(false);
  const [manualCreateTrainers, setManualCreateTrainers] = useState<AssignableTrainer[]>([]);

  const manualClientService = useMemo(
    () => (authAxios ? createAdminClientService(authAxios) : null),
    [authAxios]
  );

  const loadManualCreateTrainers = useCallback(async () => {
    if (!manualClientService) {
      setManualCreateTrainers([]);
      return;
    }

    try {
      setManualCreateTrainers(await manualClientService.getAssignableTrainers());
    } catch {
      setManualCreateTrainers([]);
      toast({
        title: 'Trainer list unavailable',
        description: 'Create the client now, then assign a trainer from Trainer Assignments.',
        variant: 'destructive',
      });
    }
  }, [manualClientService, toast]);

  const openManualCreate = useCallback(() => {
    setManualCreateOpen(true);
    void loadManualCreateTrainers();
  }, [loadManualCreateTrainers]);

  const handleManualCreate = async (data: CreateClientRequest) => {
    if (!manualClientService) throw new Error('Admin session unavailable');

    const isExternal = normalizeClientSource(data.clientSource) !== 'swanstudios';
    const response = isExternal
      ? await manualClientService.createExternalClient(data)
      : await manualClientService.createClient(data);

    if (!response?.success) {
      throw new Error(response?.message || 'Failed to create client');
    }

    const client = response.data?.client;
    const clientName = getClientDisplayName({
      id: client?.id,
      firstName: client?.firstName || data.firstName,
      lastName: client?.lastName || data.lastName,
      email: client?.email || data.email,
      username: client?.username || data.username,
    });

    toast({
      title: 'Client created',
      description: `${clientName} is ready in Client Hub.`,
      variant: 'default',
    });
    await onClientsChanged();
  };

  return {
    manualCreateOpen,
    manualCreateTrainers,
    openManualCreate,
    closeManualCreate: () => setManualCreateOpen(false),
    handleManualCreate,
  };
}
