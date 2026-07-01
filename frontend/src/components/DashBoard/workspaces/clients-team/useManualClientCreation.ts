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

const responseData = (response: any): Record<string, unknown> => (
  typeof response?.data === 'object' && response.data !== null && !Array.isArray(response.data)
    ? response.data
    : {}
);

const responseResetEmailSent = (response: any): boolean | null => {
  const data = responseData(response);
  const credentialState = data.credentialMode || data.credentialAction;
  if (data.resetEmailSent === true) return true;
  if (data.resetEmailSent === false) return false;
  if (credentialState === 'reset_link_sent' || credentialState === 'reset_email_sent') return true;
  if (
    credentialState === 'reset_link_ready'
    || credentialState === 'reset_link_needed'
    || credentialState === 'reset_email_needed'
    || credentialState === 'reset_link_unavailable'
  ) return false;
  return null;
};

const resolveResetEmailSent = (
  data: CreateClientRequest,
  response: any,
): boolean | null => {
  if (isExternalClientSource(data)) return null;
  return responseResetEmailSent(response);
};

const toastVariantForHandoff = (handoff: ManualClientCreationHandoff): 'default' | 'destructive' => (
  handoff.credentialMode.endsWith('_needed') || handoff.credentialMode === 'reset_link_unavailable' ? 'destructive' : 'default'
);

const buildCreatedToastDescription = (handoff: ManualClientCreationHandoff): string => (
  `${handoff.clientName} is ready in Client Hub. ${handoff.message}`
);

const buildCreationHandoff = (
  data: CreateClientRequest,
  response: any,
): ManualClientCreationHandoff => {
  const resetEmailSent = resolveResetEmailSent(data, response);
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

    const handoff = buildCreationHandoff(data, response);
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
