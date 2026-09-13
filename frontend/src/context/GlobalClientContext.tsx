import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useClientReference } from './useClientReference';
import { useClientRoster } from './useClientRoster';
import type { ActiveClient, GlobalClientContextType } from './globalClientTypes';
import { ADMIN_CLIENT_LIST_LIMIT, normalizeClientListResponse } from './globalClientNormalize';

// Extracted for the Rule 4 cap, re-exported so every existing import path keeps
// working unchanged.
export { ADMIN_CLIENT_LIST_LIMIT, normalizeClientListResponse };
export type { ActiveClient, GlobalClientContextType };

import {
  LEGACY_ACTIVE_CLIENT_KEY,
  activeClientStorageKey,
  purgeLegacyActiveClient,
  readStoredActiveClientId,
  reconcileActiveClient,
  writeStoredActiveClientId,
  type ClientReferenceCommit,
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
// Plan 55 C1 reference contract, re-exported so the adapter imports one module.
export { isAdmissibleClientReference } from './globalClientPin';
export type {
  ClientReferenceCommit,
  ClientReferenceOrigin,
  SelectionCandidate,
  SelectionCandidateOrigin,
  SelectionInterceptor,
} from './globalClientPin';

const GlobalClientContext = createContext<GlobalClientContextType | null>(null);

export const GlobalClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authAxios } = useAuth();
  // The selected client is stored WITH the actor it belongs to, and the exposed
  // value is derived at RENDER time from that stamp. Clearing it in an effect is
  // not enough: effects run after commit, so the first render following an actor
  // change still paints the previous actor's client for one frame. On a shared
  // kiosk that frame is the disclosure. A render-time derivation cannot have a
  // transient — there is no commit in which the stamp and the actor disagree.
  // Stamped for the same reason activeClient is: the roster is the OTHER door to
  // the same one-frame disclosure. Its state, fetch and stale-response guard now
  // live in useClientRoster, composed below once the actor key exists.
  const [activeClientState, setActiveClientRaw] = useState<{ actorKey: string | null; client: ActiveClient | null }>(
    { actorKey: null, client: null },
  );

  // The pin is now an ID only; the record is re-derived from the roster below.
  // Plan 55 C1: the reference API (actor stamp, actor generation, single
  // selection interceptor, validated commit port) is composed from
  // useClientReference further down, once the actor key it stamps against exists.

  // One-time: drop any pre-SWA-192 unscoped record (it held client PII).
  useEffect(() => {
    purgeLegacyActiveClient(sessionStorage);
  }, []);

  // ACTOR CHANGE. Runs on mount and whenever the authenticated actor or role
  // changes — including logout (user becomes null). Everything client-bound is
  // dropped immediately, then the pin for the NEW actor is read from their own
  // namespaced key. This is the shared-kiosk path: Trainer A logs out, Trainer B
  // logs in on the same tab, and B starts with no client selected.
  /** Stable identity for the current actor; also the stamp carried by a roster. */
  const currentActorKey = activeClientStorageKey(user?.id, user?.role);

  /**
   * RENDER-TIME derivation. A selection stamped for a different actor is simply
   * not visible — no effect has to run first, so there is no frame in which the
   * previous actor's client is on screen.
   */
  // `currentActorKey` is null for an unusable actor. Without this explicit
  // check, `null === null` would MATCH — recreating in memory the shared
  // fallback key that activeClientStorageKey deliberately refuses to create.
  const actorIsUsable = currentActorKey !== null;
  const activeClient = actorIsUsable && activeClientState.actorKey === currentActorKey
    ? activeClientState.client
    : null;
  // The roster concern (fetch, its actor stamp and its stale-response guard) is
  // composed here, and re-exposed below so the provider's surface is unchanged.
  const { clientList, loadingClients, rosterActorKey, refreshClients, setClientList, syncActor, resetRoster } =
    useClientRoster({ user, authAxios, currentActorKey, actorIsUsable });

  // Plan 55 C1 — composed HERE because it stamps against `currentActorKey`: the
  // reference retires synchronously with the actor rather than surviving until an
  // effect runs, the same one-frame disclosure this provider already closes for
  // the profile and the roster.
  const {
    pinnedClientId,
    referenceOrigin,
    actorGeneration,
    advanceActorEpoch,
    setPinnedReference,
    requestSelectionChange,
    commitReference,
    registerSelectionInterceptor,
  } = useClientReference({ actorKey: currentActorKey, actorIsUsable });

  /** Writes always carry the current actor's stamp. */
  const setActiveClientState = useCallback(
    (next: ActiveClient | null | ((current: ActiveClient | null) => ActiveClient | null)) => {
      setActiveClientRaw((prev) => {
        const prevClient = prev.actorKey === currentActorKey ? prev.client : null;
        const resolved = typeof next === 'function'
          ? (next as (c: ActiveClient | null) => ActiveClient | null)(prevClient)
          : next;
        return { actorKey: currentActorKey, client: resolved };
      });
    },
    [currentActorKey],
  );

  useEffect(() => {
    syncActor(user?.id, user?.role);
    // Plan 55 C1: every actor epoch gets a distinct generation, so a callback or
    // commit minted in an earlier epoch can be recognised and refused.
    advanceActorEpoch();
    setActiveClientState(null);
    resetRoster();
    setPinnedReference(readStoredActiveClientId(sessionStorage, user?.id, user?.role), 'stored-pin');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

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
    // NOTE: there is deliberately no `clientList.length === 0` guard here.
    // An earlier draft had one, to stop a mount-time or failed-fetch empty list
    // being misread as "not authorised" — but it also meant a roster that
    // genuinely loads empty (every assignment ended) kept the pin forever,
    // contradicting this change's own invariant. Two seats attacked it from
    // opposite sides and both were right about the real gap: what was missing
    // was a signal for "loaded SUCCESSFULLY for this actor". `rosterActorKey`
    // is exactly that signal — it is stamped only in the fetch success path —
    // so the guard above subsumes both cases and this one can go:
    //   mount            -> stamp is null        -> returned above
    //   fetch failed     -> stamp never set      -> returned above
    //   genuinely empty  -> stamp matches        -> falls through, pin dropped

    const resolved = reconcileActiveClient(pinnedClientId, clientList);
    if (!resolved) {
      // Plan 55 §4: an explicitly ADMITTED reference that the roster does not
      // contain stays PENDING as an id (activeClient null) instead of being
      // auto-cleared on every refresh. Ordinary restored pins keep the existing
      // drop rule, because for them absence from the authorised roster means the
      // assignment is gone.
      if (referenceOrigin === 'admitted-reference') {
        setActiveClientState(null);
        return;
      }
      setPinnedReference(null, 'stored-pin');
      setActiveClientState(null);
      writeStoredActiveClientId(sessionStorage, user?.id, user?.role, null);
      return;
    }
    setActiveClientState((current) => (
      JSON.stringify(current) === JSON.stringify(resolved) ? current : resolved
    ));
  }, [pinnedClientId, referenceOrigin, clientList, loadingClients, rosterActorKey, currentActorKey, setPinnedReference, user?.id, user?.role]);

  const setActiveClient = useCallback((client: ActiveClient | null) => {
    const nextId = client ? Number(client.id) : null;
    // 'stale' = a callback minted in an earlier actor epoch: do nothing at all.
    // 'intercepted' = a live adapter owns the request and will commit it.
    if (requestSelectionChange('picker', nextId) !== 'direct') return;
    setPinnedReference(nextId, 'stored-pin');
    setActiveClientState(client);
    writeStoredActiveClientId(sessionStorage, user?.id, user?.role, nextId);
  }, [requestSelectionChange, setPinnedReference, user?.id, user?.role]);

  const clearActiveClient = useCallback(() => {
    // An explicit unscoped candidate — first-class, not a missing value.
    if (requestSelectionChange('clear', null) !== 'direct') return;
    setPinnedReference(null, 'stored-pin');
    setActiveClientState(null);
    writeStoredActiveClientId(sessionStorage, user?.id, user?.role, null);
  }, [requestSelectionChange, setPinnedReference, user?.id, user?.role]);

  /**
   * Plan 55 §3 C1 — the adapter's validated commit port, and the ONLY path that
   * bypasses the interceptor (so a decision cannot re-enter its own request).
   * Fail-closed: a stale/malformed commit changes nothing. It is ID-only and
   * never synthesizes an ActiveClient — the roster hydration effect does that.
   */
  const commitClientReference = useCallback((commit: ClientReferenceCommit): boolean => {
    if (!commitReference(commit)) return false;
    writeStoredActiveClientId(sessionStorage, user?.id, user?.role, commit.targetUserId);
    return true;
  }, [commitReference, user?.id, user?.role]);

  const value = useMemo<GlobalClientContextType>(() => ({
    activeClient,
    setActiveClient,
    clearActiveClient,
    clientList,
    loadingClients,
    refreshClients,
    pinnedClientId,
    referenceOrigin,
    actorGeneration,
    commitClientReference,
    registerSelectionInterceptor,
  }), [activeClient, setActiveClient, clearActiveClient, clientList, loadingClients, refreshClients,
    pinnedClientId, referenceOrigin, actorGeneration, commitClientReference, registerSelectionInterceptor]);

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
