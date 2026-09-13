/**
 * ============================================================================
 * FILE: useClientRoster.ts
 * PURPOSE: The authorised-roster concern of the GlobalClientProvider.
 * ============================================================================
 * Extracted from GlobalClientContext.tsx (Rule 4 cap). The provider composes
 * this and re-exposes `clientList`, `loadingClients` and `refreshClients`, so
 * its public surface is unchanged.
 *
 * The two guards that live here are the shared-kiosk ones and must not be
 * weakened:
 *  - the roster is STAMPED with the actor it was fetched for, and a roster whose
 *    stamp does not match the current actor is not visible at all. Clearing it
 *    only in an effect leaves one commit in which the previous actor's full
 *    roster — names and emails — reaches the client switcher.
 *  - the fetch carries its OWN actor identity and discards a response that
 *    outlived that actor, so a late response cannot be written into the next
 *    actor's list.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveClient } from './globalClientTypes';
import { ADMIN_CLIENT_LIST_LIMIT, normalizeClientListResponse } from './globalClientNormalize';
import { activeClientStorageKey } from './globalClientPin';

type RosterActor = { id?: unknown; role?: unknown } | null | undefined;

type RosterHttpClient = {
  get: (url: string, config?: { params?: Record<string, unknown> }) => Promise<{ data: unknown }>;
};

export function useClientRoster(params: {
  user: RosterActor;
  authAxios: RosterHttpClient | null | undefined;
  currentActorKey: string | null;
  actorIsUsable: boolean;
}) {
  const { user, authAxios, currentActorKey, actorIsUsable } = params;
  const [clientListState, setClientListRaw] = useState<{ actorKey: string | null; items: ActiveClient[] }>(
    { actorKey: null, items: [] },
  );
  const [loadingClients, setLoadingClients] = useState(false);
  // Which actor the roster in `clientList` was fetched for. Any roster whose
  // stamp does not match the current actor is treated as not-yet-loaded.
  const [rosterActorKey, setRosterActorKey] = useState<string | null>(null);
  // Who the provider currently believes the actor is. Read by in-flight roster
  // requests so a response that outlived its actor can be discarded. A ref, not
  // state, because the check must see the CURRENT actor at await-resolution
  // time, not the one captured when the request started.
  const actorRef = useRef<{ id: unknown; role: unknown }>({ id: user?.id, role: user?.role });

  const clientList = actorIsUsable && clientListState.actorKey === currentActorKey
    ? clientListState.items
    : [];

  /** Writes always carry the current actor's stamp. */
  const setClientList = useCallback((items: ActiveClient[]) => {
    setClientListRaw({ actorKey: currentActorKey, items });
  }, [currentActorKey]);

  const syncActor = useCallback((id: unknown, role: unknown) => {
    actorRef.current = { id, role };
  }, []);

  /** Actor change: drop the roster and its loading state together. */
  const resetRoster = useCallback(() => {
    setClientListRaw({ actorKey: currentActorKey, items: [] });
    setRosterActorKey(null);
    setLoadingClients(false);
  }, [currentActorKey]);

  const refreshClients = useCallback(async () => {
    if (!user || !authAxios || (user.role !== 'admin' && user.role !== 'trainer')) return;

    // STALE-RESPONSE GUARD. This callback closes over `user`. On a shared kiosk,
    // Trainer A can log out and Trainer B log in while A's roster request is
    // still in flight — and without this guard A's response would resolve and
    // write A's clients into B's list. That is the very leak the actor-scoped
    // key exists to prevent, arriving by a different door.
    const requestActorId = user.id;
    const requestActorRole = user.role;

    setLoadingClients(true);
    try {
      const endpoint = requestActorRole === 'admin'
        ? '/api/admin/clients'
        : `/api/client-trainer-assignments/trainer/${requestActorId}`;
      const config = requestActorRole === 'admin' ? { params: { limit: ADMIN_CLIENT_LIST_LIMIT } } : undefined;
      const response = await authAxios.get(endpoint, config);

      if (actorRef.current.id !== requestActorId || actorRef.current.role !== requestActorRole) {
        return; // actor changed mid-flight — this roster belongs to someone else
      }
      setClientList(normalizeClientListResponse(response.data, String(requestActorRole)));
      // Stamp the roster with the actor it was fetched for, so the rehydrate
      // effect can refuse to reconcile a pin against someone else's roster.
      setRosterActorKey(activeClientStorageKey(requestActorId as number, String(requestActorRole)));
    } catch (err) {
      console.error('[GlobalClientContext] Failed to fetch clients:', err);
    } finally {
      if (actorRef.current.id === requestActorId && actorRef.current.role === requestActorRole) {
        setLoadingClients(false);
      }
    }
  }, [user, authAxios, setClientList]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'trainer')) refreshClients();
  }, [user?.id, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  return { clientList, loadingClients, rosterActorKey, refreshClients, setClientList, syncActor, resetRoster };
}

export default useClientRoster;
