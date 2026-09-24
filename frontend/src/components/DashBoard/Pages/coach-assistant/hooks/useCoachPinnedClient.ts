/**
 * FILE: useCoachPinnedClient.ts
 * PURPOSE: Keeps the Coach Command Center's main client aligned across global
 * session context, URL deep links, conversation targetUserId, and visible controls.
 *
 * Client changes always start a fresh conversation state. Existing threads are
 * immutable records and are never rebound to a different client.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  /** Round-2 review #2: a client switch clears the on-screen session too. */
  resetSessionLog?: () => void;
  /** The staff selection phase: a clear that fails must let the pin restore resume. */
  selectionPhase?: string;
  /** The target the current admission actually granted (null = unscoped). */
  admittedTargetUserId?: number | null;
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

const CLEAR_FAILED = new Set(['denied', 'invalid', 'unavailable', 'blocked-return']);

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
  resetSessionLog,
  selectionPhase,
  admittedTargetUserId,
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

  // An explicit "No client" is a REQUEST for staff (plan 61): the stored pin only
  // clears once admitted. Until then this restore must not put the old client
  // back into the URL — it did, so "No client (general)" never took (brain-v4).
  const clearingRef = useRef(false);
  useEffect(() => {
    // Round-2 review #3: a clear that is refused (or returned) never commits, so the
    // stored pin stays — the restore must resume or every send is refused.
    // A returned clear puts the client back in the route (round-3 #2).
    if (!storedClientId || routeClientId || (selectionPhase && CLEAR_FAILED.has(selectionPhase))) clearingRef.current = false;
    if (clearingRef.current) return;
    if (!operatorEnabled || routeClientId || routeThreadId || activeThreadClientId || !storedClientId) return;
    setSearchParams(
      buildThreadSelectionSearchParams(searchParams, storedClientId, null),
      { replace: true },
    );
  }, [
    activeThreadClientId,
    selectionPhase,
    operatorEnabled,
    routeClientId,
    routeThreadId,
    searchParams,
    setSearchParams,
    storedClientId,
  ]);

  // Round-3 #1: the status line reports what the admission DID, not what was asked.
  const requestRef = useRef<{ clientId: number | null; label: string; checked: boolean } | null>(null);
  useEffect(() => {
    const request = requestRef.current;
    if (!request || !selectionPhase) return;
    if (!request.checked) request.checked = selectionPhase !== 'ready';
    const settled = CLEAR_FAILED.has(selectionPhase) || (selectionPhase === 'ready' && request.checked);
    if (!settled) return;
    requestRef.current = null;
    // Judge by what the admission GRANTED: a refusal may surface as a failure phase
    // or as a quiet re-admission of the old client.
    if (selectionPhase === 'ready' && (admittedTargetUserId ?? null) === request.clientId) {
      setSelectedStatus(request.clientId === null
        ? 'Main client cleared - new unscoped Coach thread ready'
        : `${request.label} pinned - new client-bound Coach thread ready`);
      return;
    }
    const kept = selectionPhase === 'ready' ? admittedTargetUserId ?? null : storedClientId;
    const keptLabel = kept === null ? '' : clientName(clientList.find((c) => c.id === kept) ?? null) || `Client #${kept}`;
    setSelectedStatus(`Couldn't ${request.clientId === null ? 'clear the main client' : `switch to ${request.label}`}${keptLabel ? ` - still on ${keptLabel}` : ''}`);
  }, [admittedTargetUserId, clientList, selectionPhase, setSelectedStatus, storedClientId]);

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

    clearingRef.current = !client;
    if (client) setActiveClient(client);
    else clearActiveClient();
    chat.newChat();
    // The previous client's questions and replies never stay on screen under the new one.
    resetSessionLog?.();
    setActiveThreadId(null);
    setAutoSelectSuppressed(true);
    setSearchParams(
      buildThreadSelectionSearchParams(searchParams, client?.id ?? null, null),
      { replace: true },
    );
    const label = client ? clientName(client) || `Client #${client.id}` : '';
    requestRef.current = { clientId: client?.id ?? null, label, checked: false };
    setSelectedStatus(client ? `Switching to ${label}...` : 'Clearing the main client...');
  }, [
    chat,
    resetSessionLog,
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
