import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useGlobalClient } from '../../../../../context/GlobalClientContext';
import type { ClientInfo } from '../../../../AIAssistant/ClientPicker';
import { parseRouteClientId } from '../CoachCommandCenter.logic';

type SwanCoachRole = 'admin' | 'trainer' | 'client';

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
    if (userRole !== 'admin' && userRole !== 'trainer') return;

    if (loadingClients) {
      clientListFetchStartedRef.current = true;
      return;
    }

    if (!clientListFetchStartedRef.current && clientList.length > 0) {
      clientListFetchStartedRef.current = true;
    }

    if (!clientListFetchStartedRef.current) return;

    if (clientIdNumber !== null) {
      const found = clientList.find(client => client.id === clientIdNumber);

      if (found) {
        if (selectedClient?.id === clientIdNumber) return;
        adoptClient({
          id: found.id,
          firstName: found.firstName,
          lastName: found.lastName,
          email: found.email,
          profileImageUrl: found.photo,
        });
        return;
      }

      adoptClient(null);
      return;
    }

    if (!selectedClient && activeClient) {
      setSelectedClient({
        id: activeClient.id,
        firstName: activeClient.firstName,
        lastName: activeClient.lastName,
        email: activeClient.email,
        profileImageUrl: activeClient.photo,
      });
    }
  }, [clientIdNumber, clientList, loadingClients, activeClient, userRole, selectedClient, adoptClient]);

  return {
    adoptClient,
    searchParams,
    selectedClient,
  };
}

export default useSwanCoachClientSelection;
