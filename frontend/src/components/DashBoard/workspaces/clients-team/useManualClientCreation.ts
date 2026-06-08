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
import { normalizeClientSource } from './clientSessionSignal';
import {
  buildManualClientCreationHandoff,
  getCreatedClient,
  toClientId,
  type ManualClientCreationHandoff,
} from './manualClientCreationHandoff';

interface UseManualClientCreationParams {
  onClientsChanged: () => Promise<unknown> | unknown;
}

type ManualClientService = ReturnType<typeof createAdminClientService>;

const isExternalClientSource = (data: CreateClientRequest): boolean => (
  normalizeClientSource(data.clientSource) !== 'swanstudios'
);

const createManualClient = (
  manualClientService: ManualClientService,
  data: CreateClientRequest,
) => (
  isExternalClientSource(data)
    ? manualClientService.createExternalClient(data)
    : manualClientService.createClient(data)
);

const createSucceeded = (response: any): boolean => response?.success === true;

const createFailureMessage = (response: any): string => (
  typeof response?.message === 'string' && response.message.trim()
    ? response.message
    : 'Failed to create client'
);

const throwIfCreateFailed = (response: any): void => {
  if (createSucceeded(response)) return;
  throw new Error(createFailureMessage(response));
};

const canSendLoginReset = (
  manualClientService: ManualClientService,
  clientId: string | null,
): boolean => (
  Boolean(clientId) && typeof manualClientService.sendClientPasswordReset === 'function'
);

const resetSucceeded = (response: any): boolean => response?.success !== false;

const sendLoginResetIfAvailable = async (
  manualClientService: ManualClientService,
  clientId: string | null,
): Promise<boolean> => {
  if (!canSendLoginReset(manualClientService, clientId)) return false;
  if (!clientId) return false;

  try {
    const resetResponse = await manualClientService.sendClientPasswordReset(clientId);
    return resetSucceeded(resetResponse);
  } catch {
    return false;
  }
};

const resolveResetEmailSent = async (
  manualClientService: ManualClientService,
  data: CreateClientRequest,
  clientId: string | null,
): Promise<boolean | null> => {
  if (isExternalClientSource(data)) return null;
  return sendLoginResetIfAvailable(manualClientService, clientId);
};

const toastVariantForHandoff = (handoff: ManualClientCreationHandoff): 'default' | 'destructive' => (
  handoff.credentialMode.endsWith('_needed') ? 'destructive' : 'default'
);

const buildCreatedToastDescription = (handoff: ManualClientCreationHandoff): string => (
  `${handoff.clientName} is ready in Client Hub. ${handoff.message}`
);

const buildCreationHandoff = async (
  manualClientService: ManualClientService,
  data: CreateClientRequest,
  response: any,
): Promise<ManualClientCreationHandoff> => {
  const clientId = toClientId(getCreatedClient(response).id);
  const resetEmailSent = await resolveResetEmailSent(manualClientService, data, clientId);
  return buildManualClientCreationHandoff({ data, response, resetEmailSent });
};

export function useManualClientCreation({
  onClientsChanged,
}: UseManualClientCreationParams) {
  const { authAxios } = useAuth() as any;
  const { toast } = useToast();
  const [manualCreateOpen, setManualCreateOpen] = useState(false);
  const [manualCreateTrainers, setManualCreateTrainers] = useState<AssignableTrainer[]>([]);
  const [creationHandoff, setCreationHandoff] = useState<ManualClientCreationHandoff | null>(null);

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

    const response = await createManualClient(manualClientService, data);
    throwIfCreateFailed(response);

    const handoff = await buildCreationHandoff(manualClientService, data, response);
    setCreationHandoff(handoff);
    toast({
      title: 'Client created',
      description: buildCreatedToastDescription(handoff),
      variant: toastVariantForHandoff(handoff),
    });
    await onClientsChanged();
  };

  return {
    manualCreateOpen,
    manualCreateTrainers,
    creationHandoff,
    openManualCreate,
    closeManualCreate: () => setManualCreateOpen(false),
    clearCreationHandoff: () => setCreationHandoff(null),
    handleManualCreate,
  };
}
