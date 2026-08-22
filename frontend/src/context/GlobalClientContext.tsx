import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';

export interface ActiveClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  bodyMapHeadPhoto?: string;
  gender?: string;
  role?: string;
  availableSessions?: number;
  clientSource?: 'swanstudios' | 'move_fitness' | 'external';
  membershipLevel?: 'basic' | 'premium' | 'elite';
  totalWorkouts?: number;
  lastWorkoutDate?: string;
  nextSessionDate?: string;
}

export interface GlobalClientContextType {
  activeClient: ActiveClient | null;
  setActiveClient: (client: ActiveClient | null) => void;
  clearActiveClient: () => void;
  clientList: ActiveClient[];
  loadingClients: boolean;
  refreshClients: () => Promise<void>;
}

import {
  LEGACY_ACTIVE_CLIENT_KEY,
  activeClientStorageKey,
  purgeLegacyActiveClient,
  readStoredActiveClientId,
  reconcileActiveClient,
  writeStoredActiveClientId,
} from './globalClientPin';

// Re-exported so existing importers of this module keep working unchanged.
export {
  LEGACY_ACTIVE_CLIENT_KEY,
  activeClientStorageKey,
  purgeLegacyActiveClient,
  readStoredActiveClientId,
  reconcileActiveClient,
  writeStoredActiveClientId,
};
export const ADMIN_CLIENT_LIST_LIMIT = 500;

const optionalGender = (value: unknown) => (value ? { gender: String(value) } : {});

export function normalizeClientListResponse(data: any, role: string): ActiveClient[] {
  if (role === 'admin') {
    const raw = data?.data?.clients ?? (Array.isArray(data?.data) ? data.data : []);
    return raw.map((c: any) => ({
      id: c.id,
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      photo: c.profileImageUrl ?? c.photo,
      bodyMapHeadPhoto: c.bodyMapHeadPhoto ?? undefined,
      ...optionalGender(c.gender),
      role: c.role,
      availableSessions: typeof c.availableSessions === 'number' ? c.availableSessions : undefined,
      clientSource: c.clientSource ?? undefined,
      membershipLevel: c.membershipLevel ?? undefined,
      totalWorkouts: typeof c.totalWorkouts === 'number' ? c.totalWorkouts : undefined,
      lastWorkoutDate: c.lastWorkoutDate ?? c.lastWorkout?.date ?? c.lastWorkout?.sessionDate ?? undefined,
      nextSessionDate: c.nextSessionDate ?? c.nextSession?.sessionDate ?? c.nextSession?.date ?? undefined,
    }));
  }

  const assignments = Array.isArray(data?.assignments)
    ? data.assignments
    : Array.isArray(data?.data)
    ? data.data
    : data?.data?.assignments ?? [];

  return assignments.map((a: any) => {
    const c = a.client ?? a.Client ?? a;
    return {
      id: c.id,
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      photo: c.profileImageUrl ?? c.photo,
      bodyMapHeadPhoto: c.bodyMapHeadPhoto ?? undefined,
      ...optionalGender(c.gender),
      role: c.role,
      availableSessions: typeof c.availableSessions === 'number' ? c.availableSessions : undefined,
      clientSource: c.clientSource ?? undefined,
      totalWorkouts: typeof c.totalWorkouts === 'number' ? c.totalWorkouts : undefined,
      lastWorkoutDate: c.lastWorkoutDate ?? c.lastWorkout?.date ?? c.lastWorkout?.sessionDate ?? undefined,
      nextSessionDate: c.nextSessionDate ?? c.nextSession?.sessionDate ?? c.nextSession?.date ?? undefined,
    };
  });
}

const normalizeClients = normalizeClientListResponse;
const GlobalClientContext = createContext<GlobalClientContextType | null>(null);

export const GlobalClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authAxios } = useAuth();
  const [activeClient, setActiveClientState] = useState<ActiveClient | null>(null);
  const [clientList, setClientList] = useState<ActiveClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // The pin is now an ID only; the record is re-derived from the roster below.
  const [pinnedClientId, setPinnedClientId] = useState<number | null>(null);

  // One-time: drop any pre-SWA-192 unscoped record (it held client PII).
  useEffect(() => {
    purgeLegacyActiveClient(sessionStorage);
  }, []);

  // ACTOR CHANGE. Runs on mount and whenever the authenticated actor or role
  // changes — including logout (user becomes null). Everything client-bound is
  // dropped immediately, then the pin for the NEW actor is read from their own
  // namespaced key. This is the shared-kiosk path: Trainer A logs out, Trainer B
  // logs in on the same tab, and B starts with no client selected.
  // Who the provider currently believes the actor is. Read by in-flight roster
  // requests so a response that outlived its actor can be discarded. A ref, not
  // state, because the check must see the CURRENT actor at await-resolution
  // time, not the one captured when the request started.
  const actorRef = useRef<{ id: unknown; role: unknown }>({ id: user?.id, role: user?.role });

  /** Stable identity for the current actor; also the stamp carried by a roster. */
  const currentActorKey = activeClientStorageKey(user?.id, user?.role);

  // Which actor the roster in `clientList` was fetched for. Any roster whose
  // stamp does not match the current actor is treated as not-yet-loaded.
  const [rosterActorKey, setRosterActorKey] = useState<string | null>(null);

  useEffect(() => {
    actorRef.current = { id: user?.id, role: user?.role };
    setActiveClientState(null);
    setClientList([]);
    setRosterActorKey(null);
    setLoadingClients(false);
    setPinnedClientId(readStoredActiveClientId(sessionStorage, user?.id, user?.role));
  }, [user?.id, user?.role]);

  const refreshClients = useCallback(async () => {
    if (!user || !authAxios || (user.role !== 'admin' && user.role !== 'trainer')) return;

    // STALE-RESPONSE GUARD. This callback closes over `user`. On a shared
    // kiosk, Trainer A can log out and Trainer B log in while A's roster
    // request is still in flight — and without this guard A's response would
    // resolve and write A's clients into B's list. That is the very leak the
    // actor-scoped key above exists to prevent, arriving by a different door.
    // Capture the actor this request belongs to and discard the response if the
    // actor has changed by the time it lands.
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
      setClientList(normalizeClients(response.data, requestActorRole));
      // Stamp the roster with the actor it was fetched for, so the rehydrate
      // effect can refuse to reconcile a pin against someone else's roster.
      setRosterActorKey(activeClientStorageKey(requestActorId, requestActorRole));
    } catch (err) {
      console.error('[GlobalClientContext] Failed to fetch clients:', err);
    } finally {
      if (actorRef.current.id === requestActorId && actorRef.current.role === requestActorRole) {
        setLoadingClients(false);
      }
    }
  }, [user, authAxios]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'trainer')) refreshClients();
  }, [user?.id, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // REHYDRATE FROM THE AUTHORISED ROSTER ONLY.
  // Guarded on loadingClients so an empty roster mid-fetch is never mistaken for
  // "not authorised". Once the roster has landed, a pin that is not on it is
  // DROPPED — the previous effect returned early here, which is precisely what
  // let an unassigned client stay pinned.
  useEffect(() => {
    // ACTOR BINDING. Effects in a single commit see that render's values, so on
    // an A->B switch the actor-change effect above queues a clear while THIS
    // effect — running in the same pass — still holds A's pin and A's roster,
    // and would queue A's client straight back in. Last write wins, and A's
    // client renders under B until B's roster lands: exactly the shared-kiosk
    // disclosure this whole change exists to close. Binding the roster to the
    // actor that produced it makes that interleaving inert, because a roster
    // stamped for A can never be reconciled while B is the actor.
    if (rosterActorKey !== currentActorKey) return;
    if (loadingClients) return;
    if (!pinnedClientId) {
      setActiveClientState(null);
      return;
    }
    if (clientList.length === 0) return;

    const resolved = reconcileActiveClient(pinnedClientId, clientList);
    if (!resolved) {
      setPinnedClientId(null);
      setActiveClientState(null);
      writeStoredActiveClientId(sessionStorage, user?.id, user?.role, null);
      return;
    }
    setActiveClientState((current) => (
      JSON.stringify(current) === JSON.stringify(resolved) ? current : resolved
    ));
  }, [pinnedClientId, clientList, loadingClients, rosterActorKey, currentActorKey, user?.id, user?.role]);

  const setActiveClient = useCallback((client: ActiveClient | null) => {
    const nextId = client ? Number(client.id) : null;
    setPinnedClientId(nextId);
    setActiveClientState(client);
    writeStoredActiveClientId(sessionStorage, user?.id, user?.role, nextId);
  }, [user?.id, user?.role]);

  const clearActiveClient = useCallback(() => {
    setPinnedClientId(null);
    setActiveClientState(null);
    writeStoredActiveClientId(sessionStorage, user?.id, user?.role, null);
  }, [user?.id, user?.role]);

  const value = useMemo<GlobalClientContextType>(() => ({
    activeClient,
    setActiveClient,
    clearActiveClient,
    clientList,
    loadingClients,
    refreshClients,
  }), [activeClient, setActiveClient, clearActiveClient, clientList, loadingClients, refreshClients]);

  return <GlobalClientContext.Provider value={value}>{children}</GlobalClientContext.Provider>;
};

export function useGlobalClient() {
  const context = useContext(GlobalClientContext);
  if (!context) throw new Error('useGlobalClient must be used within GlobalClientProvider');
  return context;
}

/**
 * Non-throwing variant of {@link useGlobalClient}. Returns null when rendered
 * outside a GlobalClientProvider, so fail-safe read-only callers (e.g. resolving
 * a client's PDF brand identity from the roster, or an isolated test harness)
 * degrade gracefully instead of crashing the tree.
 */
export function useOptionalGlobalClient(): GlobalClientContextType | null {
  return useContext(GlobalClientContext);
}

export default GlobalClientContext;
