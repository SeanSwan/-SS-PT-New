/**
 * ============================================================================
 * FILE: useClientReference.ts
 * PURPOSE: Plan 55 §3 C1 — the ID-only Coach selection reference API.
 * ============================================================================
 *
 * Extracted from GlobalClientContext.tsx (which was over the Rule 4 cap) so the
 * provider composes this rather than inlining it. The provider's PUBLIC surface
 * is unchanged: it re-exposes every member returned here.
 *
 * WHAT THIS OWNS
 *  - An actor-STAMPED reference id, derived at render time. A reference stamped
 *    for a different actor is simply not visible, so retirement is synchronous
 *    with the actor rather than deferred to an effect.
 *  - A monotonic per-actor-epoch generation. A callback minted in an earlier
 *    epoch is recognised and refused instead of writing into the new actor's
 *    key — the other door to the shared-kiosk disclosure.
 *  - At most ONE live selection request interceptor, held in a lifecycle ref so
 *    registering cannot re-render a draft. Ordinary setter calls become
 *    candidate REQUESTS while one is live, and mutate nothing.
 *  - The adapter's validated commit port, and the only path that bypasses its
 *    own interceptor (so a decision cannot re-enter its own request).
 *
 * WHAT THIS DOES NOT OWN: storage. The provider performs the existing
 * actor-scoped id write, so persistence stays in one place.
 */
import { useCallback, useRef, useState } from 'react';
import {
  isAdmissibleClientReference,
  type ClientReferenceCommit,
  type ClientReferenceOrigin,
  type SelectionCandidateOrigin,
  type SelectionInterceptor,
} from './globalClientPin';

/**
 * What `requestSelectionChange` decided. `intercepted` means a live interceptor
 * now owns the request and the caller MUST NOT mutate; `stale` means the calling
 * callback belongs to an earlier actor epoch and must do nothing at all.
 */
export type SelectionSetterOutcome = 'intercepted' | 'stale' | 'direct';

export type ClientReferenceApi = {
  pinnedClientId: number | null;
  referenceOrigin: ClientReferenceOrigin | null;
  actorGeneration: number;
  /** Called by the provider on every actor change. Monotonic, never reset. */
  advanceActorEpoch: () => void;
  setPinnedReference: (id: number | null, origin: ClientReferenceOrigin) => void;
  requestSelectionChange: (
    origin: SelectionCandidateOrigin,
    targetUserId: number | null,
  ) => SelectionSetterOutcome;
  commitReference: (commit: ClientReferenceCommit) => boolean;
  registerSelectionInterceptor: (interceptor: SelectionInterceptor) => () => void;
};

export function useClientReference(params: {
  actorKey: string | null;
  actorIsUsable: boolean;
}): ClientReferenceApi {
  const { actorKey, actorIsUsable } = params;
  const [pinnedRefState, setPinnedRefState] = useState<{
    actorKey: string | null;
    id: number | null;
    origin: ClientReferenceOrigin;
  }>({ actorKey: null, id: null, origin: 'stored-pin' });
  // A ref, because stale setters must compare against the CURRENT epoch at call
  // time, not the one captured when the callback was created.
  const generationRef = useRef(1);
  const [actorGeneration, setActorGeneration] = useState(1);
  const selectionInterceptorRef = useRef<SelectionInterceptor | null>(null);

  // `actorIsUsable` is explicit: without it, `null === null` would MATCH and
  // recreate in memory the shared fallback key that activeClientStorageKey
  // deliberately refuses to create.
  const referenceIsCurrent = actorIsUsable && pinnedRefState.actorKey === actorKey;
  const pinnedClientId = referenceIsCurrent ? pinnedRefState.id : null;
  const referenceOrigin = referenceIsCurrent ? pinnedRefState.origin : null;

  const setPinnedReference = useCallback((id: number | null, origin: ClientReferenceOrigin) => {
    setPinnedRefState({ actorKey, id, origin });
  }, [actorKey]);

  const advanceActorEpoch = useCallback(() => {
    generationRef.current += 1;
    setActorGeneration(generationRef.current);
  }, []);

  const registerSelectionInterceptor = useCallback((interceptor: SelectionInterceptor) => {
    selectionInterceptorRef.current = interceptor;
    let detached = false;
    return () => {
      if (detached) return;
      detached = true;
      // Only detach if THIS registration is still the live one; a stale remover
      // must never disarm a newer interceptor.
      if (selectionInterceptorRef.current === interceptor) selectionInterceptorRef.current = null;
    };
  }, []);

  const requestSelectionChange = useCallback((
    origin: SelectionCandidateOrigin,
    targetUserId: number | null,
  ): SelectionSetterOutcome => {
    if (generationRef.current !== actorGeneration) return 'stale';
    const interceptor = selectionInterceptorRef.current;
    if (!interceptor) return 'direct';
    interceptor(Object.freeze({ targetUserId, origin, generation: actorGeneration }));
    return 'intercepted';
  }, [actorGeneration]);

  const commitReference = useCallback((commit: ClientReferenceCommit): boolean => {
    if (!actorKey) return false;
    if (!isAdmissibleClientReference(commit, generationRef.current)) return false;
    setPinnedRefState({ actorKey, id: commit.targetUserId, origin: 'admitted-reference' });
    return true;
  }, [actorKey]);

  return {
    pinnedClientId,
    referenceOrigin,
    actorGeneration,
    advanceActorEpoch,
    setPinnedReference,
    requestSelectionChange,
    commitReference,
    registerSelectionInterceptor,
  };
}

export default useClientReference;
