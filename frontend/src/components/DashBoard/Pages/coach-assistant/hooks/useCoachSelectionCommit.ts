/**
 * ============================================================================
 * FILE: useCoachSelectionCommit.ts
 * PURPOSE: Plan 55 §3 C2 / plan 63 §5 — the one-use commit ticket and its ack.
 * ============================================================================
 * Rule 4 split of the C2 adapter. This module owns the ONLY path that mutates
 * another owner on the strength of an admission:
 *  - `consumeCommit` runs the synchronous plan 51 retirement and the plan 61
 *    commit port with NO await between the preflight and the mutation, and it is
 *    one-use per commitId.
 *  - `ackCommit` publishes the enabled plan 55 snapshot ONLY when the observed
 *    route/thread tuple matches the ticket exactly. A mismatch leaves the
 *    publication DISABLED — there is no permissive fallback.
 */
import { useCallback } from 'react';
import type { CoachAcceptedAdmission, CoachSelectionInstructions } from './coachSelectionContract';
import type { CoachSelectionCore } from './useCoachSessionSelectionState';

export type CoachSelectionCommitRefs = {
  ownerRef: { current: { discard: (scopeToken: string) => void; getSnapshot: () => { draft: { scopeToken: string; targetUserId: number } | null }; rememberSelection: (scopeToken: string, anchor: unknown) => unknown } };
  referenceRef: {
    current: {
      pinnedClientId: number | null;
      actorGeneration: number;
      commitClientReference: (commit: { targetUserId: number | null; requestId: string; generation: number }) => boolean;
    };
  };
  observationRef: { current: { pathname: string; search: string; hash: string } | null };
  audienceRef: { current: string };
};

export function useCoachSelectionCommit(core: CoachSelectionCore, refs: CoachSelectionCommitRefs) {
  const { consumedRef, disposedRef, actorRef, apply, publish, stateRef } = core;
  const { ownerRef, referenceRef, observationRef, audienceRef } = refs;

  const consumeCommit = useCallback((commitId: string): CoachSelectionInstructions | null => {
    const ticket = stateRef.current.instructions;
    if (!ticket || ticket.commitId !== commitId || consumedRef.current === commitId) return null;
    if (!actorRef.current.staffActor || actorRef.current.actorNumber === null || disposedRef.current) return null;
    // The ticket belongs to the actor epoch that minted it. A-B-A cannot reuse it.
    if (stateRef.current.actorKey !== actorRef.current.actorKey) return null;
    consumedRef.current = commitId;
    if (ticket.retireScopeToken) ownerRef.current.discard(ticket.retireScopeToken);
    const committed = referenceRef.current.commitClientReference({
      targetUserId: ticket.targetUserId, requestId: commitId, generation: referenceRef.current.actorGeneration,
    });
    if (!committed) {
      apply({ phase: 'unavailable', reason: 'RECEIPT_MISMATCH' });
      return null;
    }
    const next = { ...ticket, pinCommitted: true };
    apply({ instructions: next });
    return next;
  }, [actorRef, apply, consumedRef, disposedRef, ownerRef, referenceRef, stateRef]);

  const ackCommit = useCallback((
    commitId: string,
    observed: Readonly<{ targetUserId: number | null; threadId: number | null }>,
  ): boolean => {
    const ticket = stateRef.current.instructions;
    const actor = actorRef.current;
    if (!ticket || ticket.commitId !== commitId || consumedRef.current !== commitId) return false;
    if (!actor.staffActor || actor.actorNumber === null) return false;
    if (stateRef.current.actorKey !== actor.actorKey) return false;
    if (observed.targetUserId !== ticket.targetUserId || observed.threadId !== ticket.threadId) {
      apply({ phase: 'unavailable', reason: 'RECEIPT_MISMATCH' });
      return false;
    }
    const admission: CoachAcceptedAdmission = Object.freeze({
      actorId: actor.actorNumber, rawRole: actor.rawRole, audienceRole: audienceRef.current,
      generation: stateRef.current.admissionGeneration + 1,
      targetUserId: ticket.targetUserId, threadId: ticket.threadId,
    });
    const draft = ownerRef.current.getSnapshot().draft;
    const anchor = observationRef.current;
    if (draft && anchor && draft.targetUserId === ticket.targetUserId) {
      ownerRef.current.rememberSelection(draft.scopeToken, {
        pathname: anchor.pathname, search: anchor.search, hash: anchor.hash,
        targetUserId: draft.targetUserId, pinnedClientId: referenceRef.current.pinnedClientId ?? null,
        threadId: ticket.threadId,
      });
    }
    publish(admission);
    apply({ accepted: admission, pending: null, phase: 'ready', reason: null, admissionGeneration: admission.generation });
    return true;
  }, [actorRef, apply, audienceRef, consumedRef, observationRef, ownerRef, publish, referenceRef, stateRef]);

  return { consumeCommit, ackCommit };
}

export default useCoachSelectionCommit;
