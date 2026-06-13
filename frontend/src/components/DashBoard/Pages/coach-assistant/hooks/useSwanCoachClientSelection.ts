import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useGlobalClient } from '../../../../../context/GlobalClientContext';
import type { ClientInfo } from '../../../../AIAssistant/ClientPicker';
import { parseRouteClientId } from '../CoachCommandCenter.routeContext';

type SwanCoachRole = 'admin' | 'trainer' | 'client';
type SelectionAction =
  | { type: 'none' }
  | { type: 'adopt'; client: ClientInfo | null }
  | { type: 'setSelected'; client: ClientInfo };

const noSelectionAction: SelectionAction = { type: 'none' };

function isStaffRole(userRole: SwanCoachRole): boolean {
  return userRole === 'admin' || userRole === 'trainer';
}

function clientListReady(
  fetchStartedRef: MutableRefObject<boolean>,
  loadingClients: boolean,
  clientCount: number,
): boolean {
  if (loadingClients) {
    fetchStartedRef.current = true;
    return false;
  }
  if (clientCount > 0) fetchStartedRef.current = true;
  return fetchStartedRef.current;
}

function toClientInfo(client: {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  photo?: string;
}): ClientInfo {
  return {
    id: client.id,
    firstName: client.firstName || '',
    lastName: client.lastName || '',
    email: client.email || '',
    profileImageUrl: client.photo,
  };
}

function routeClientAction(
  clientIdNumber: number | null,
  clientList: Array<{ id: number; firstName?: string; lastName?: string; email?: string; photo?: string }>,
  selectedClient: ClientInfo | null,
): SelectionAction | null {
  if (clientIdNumber === null) return null;
  return routeClientMatchAction(
    clientIdNumber,
    clientList.find(client => client.id === clientIdNumber) ?? null,
    selectedClient,
  );
}

function routeClientMatchAction(
  clientIdNumber: number,
  found: { id: number; firstName?: string; lastName?: string; email?: string; photo?: string } | null,
  selectedClient: ClientInfo | null,
): SelectionAction {
  if (!found) return { type: 'adopt', client: null };
  return selectedClient?.id === clientIdNumber ? noSelectionAction : { type: 'adopt', client: toClientInfo(found) };
}

function activeClientAction(activeClient: {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  photo?: string;
} | null, selectedClient: ClientInfo | null): SelectionAction {
  return !selectedClient && activeClient
    ? { type: 'setSelected', client: toClientInfo(activeClient) }
    : noSelectionAction;
}

function nextSelectionAction(
  clientIdNumber: number | null,
  clientList: Array<{ id: number; firstName?: string; lastName?: string; email?: string; photo?: string }>,
  selectedClient: ClientInfo | null,
  activeClient: { id: number; firstName?: string; lastName?: string; email?: string; photo?: string } | null,
): SelectionAction {
  return routeClientAction(clientIdNumber, clientList, selectedClient)
    ?? activeClientAction(activeClient, selectedClient);
}

function selectionReady(
  userRole: SwanCoachRole,
  fetchStartedRef: MutableRefObject<boolean>,
  loadingClients: boolean,
  clientCount: number,
): boolean {
  return isStaffRole(userRole) && clientListReady(fetchStartedRef, loadingClients, clientCount);
}

function applySelectionAction(
  action: SelectionAction,
  adoptClient: (client: ClientInfo | null) => void,
  setSelectedClient: (client: ClientInfo) => void,
) {
  if (action.type === 'adopt') adoptClient(action.client);
  if (action.type === 'setSelected') setSelectedClient(action.client);
}

export function useSwanCoachClientSelection(userRole: SwanCoachRole) {
  const { clientList, activeClient, setActiveClient, loadingClients } = useGlobalClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);
  const clientListFetchStartedRef = useRef(false);

  const clientIdNumber = useMemo(() => {
    return parseRouteClientId(searchParams.get('clientId'));
  }, [searchParams]);

  const adoptClient = useCallback((client: ClientInfo | null) => {
    setSelectedClient(client);
    setActiveClient(
      client
        ? {
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            photo: client.profileImageUrl,
          }
        : null,
    );
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (client) {
          next.set('clientId', String(client.id));
        } else {
          next.delete('clientId');
        }
        return next;
      },
      { replace: true },
    );
  }, [setActiveClient, setSearchParams]);

  useEffect(() => {
    if (!selectionReady(userRole, clientListFetchStartedRef, loadingClients, clientList.length)) return;
    const action = nextSelectionAction(clientIdNumber, clientList, selectedClient, activeClient);
    applySelectionAction(action, adoptClient, setSelectedClient);
  }, [clientIdNumber, clientList, loadingClients, activeClient, userRole, selectedClient, adoptClient]);

  return {
    adoptClient,
    searchParams,
    selectedClient,
  };
}
