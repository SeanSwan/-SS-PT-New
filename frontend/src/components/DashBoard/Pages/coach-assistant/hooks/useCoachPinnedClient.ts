/**
 * FILE: useCoachPinnedClient.ts
 * PURPOSE: Keeps the Coach Command Center's main client aligned across global
 * session context, URL deep links, conversation targetUserId, and visible controls.
 *
 * Client changes always start a fresh conversation state. Existing threads are
 * immutable records and are never rebound to a different client.
 */
import { useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  useGlobalClient,
  type ActiveClient,
} from '../../../../../context/GlobalClientContext';
import { buildThreadSelectionSearchParams } from '../CoachCommandCenter.routeContext';
import type { CoachCommandRole } from '../CoachCommandCenter.roleConfig';

type SearchParamSetter = (
  nextInit: URLSearchParams,
  navigateOptions?: { replace?: boolean },
) => void;

type PinnedClientChat = {
  newChat: () => void;
};

type UseCoachPinnedClientParams = {
  activeThreadClientId: number | null;
  chat: PinnedClientChat;
  routeClientId: number | null;
  routeThreadId: number | null;
  searchParams: URLSearchParams;
  setActiveThreadId: Dispatch<SetStateAction<number | null>>;
  setAutoSelectSuppressed: Dispatch<SetStateAction<boolean>>;
  setSearchParams: SearchParamSetter;
  setSelectedStatus: Dispatch<SetStateAction<string>>;
  userRole: CoachCommandRole;
};

export type CoachPinnedClientBarProps = {
  clients: Array<{ id: number; label: string }>;
  loadingClients: boolean;
  onSelectClient: (clientId: number | null) => void;
  selectedClientId: number | null;
};

function clientName(client?: ActiveClient | null): string | null {
  if (!client) return null;
  return [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || `Client #${client.id}`;
}

export function useCoachPinnedClient({
  activeThreadClientId,
  chat,
  routeClientId,
  routeThreadId,
  searchParams,
  setActiveThreadId,
  setAutoSelectSuppressed,
  setSearchParams,
  setSelectedStatus,
  userRole,
}: UseCoachPinnedClientParams) {
  const {
    activeClient,
    clearActiveClient,
    clientList,
    loadingClients,
    setActiveClient,
  } = useGlobalClient();
  const operatorEnabled = userRole !== 'client';
  const storedClientId = operatorEnabled ? activeClient?.id ?? null : null;
  const effectiveClientId = operatorEnabled
    ? routeClientId || activeThreadClientId || (!routeThreadId ? storedClientId : null)
    : routeClientId || activeThreadClientId;
  const selectedClient = useMemo(
    () => clientList.find((client) => client.id === effectiveClientId)
      || (activeClient?.id === effectiveClientId ? activeClient : null),
    [activeClient, clientList, effectiveClientId],
  );

  useEffect(() => {
    if (!operatorEnabled || routeClientId || routeThreadId || activeThreadClientId || !storedClientId) return;
    setSearchParams(
      buildThreadSelectionSearchParams(searchParams, storedClientId, null),
      { replace: true },
    );
  }, [
    activeThreadClientId,
    operatorEnabled,
    routeClientId,
    routeThreadId,
    searchParams,
    setSearchParams,
    storedClientId,
  ]);

  useEffect(() => {
    if (!operatorEnabled || !effectiveClientId) return;
    const freshClient = clientList.find((client) => client.id === effectiveClientId);
    if (freshClient && activeClient?.id !== freshClient.id) setActiveClient(freshClient);
  }, [activeClient?.id, clientList, effectiveClientId, operatorEnabled, setActiveClient]);

  const onSelectClient = useCallback((clientId: number | null) => {
    if (!operatorEnabled) return;
    const client = clientId == null
      ? null
      : clientList.find((candidate) => candidate.id === clientId) || null;
    if (clientId != null && !client) return;

    if (client) setActiveClient(client);
    else clearActiveClient();
    chat.newChat();
    setActiveThreadId(null);
    setAutoSelectSuppressed(true);
    setSearchParams(
      buildThreadSelectionSearchParams(searchParams, client?.id ?? null, null),
      { replace: true },
    );
    setSelectedStatus(client
      ? `${clientName(client)} pinned - new client-bound Coach thread ready`
      : 'Main client cleared - new unscoped Coach thread ready');
  }, [
    chat,
    clearActiveClient,
    clientList,
    operatorEnabled,
    searchParams,
    setActiveClient,
    setActiveThreadId,
    setAutoSelectSuppressed,
    setSearchParams,
    setSelectedStatus,
  ]);

  const barProps: CoachPinnedClientBarProps = {
    clients: operatorEnabled
      ? clientList.map((client) => ({ id: client.id, label: clientName(client) || `Client #${client.id}` }))
      : [],
    loadingClients: operatorEnabled && loadingClients,
    onSelectClient,
    selectedClientId: operatorEnabled ? effectiveClientId : null,
  };

  return {
    barProps,
    effectiveClientId,
    selectedClientName: clientName(selectedClient),
  };
}
