/**
 * ============================================================================
 * FILE: useCoachSessionSelection.ts
 * PURPOSE: Plan 55 §3 C2 / plan 63 — the ONE admitted Coach selection adapter.
 * ============================================================================
 * Rule 4 split: the pure contract lives in `coachSelectionContract.ts`, the
 * actor epoch / lifecycle / publication snapshot in
 * `useCoachSessionSelectionState.ts`, and this module composes them with the
 * request, the plan 51 owner branches and the one-use commit ticket. Every
 * public name is RE-EXPORTED here, so no caller import path changed.
 *
 * WHAT THIS OWNS
 *  - Request generations: a response that lands after a newer request, an actor
 *    change or an unmount publishes NOTHING (not even a failure phase).
 *  - One in-flight plan 52 read per operation, with abort + a client deadline.
 *  - The plan 51 owner branches and the single pending decision.
 *  - The one-use commit ticket and the plan 55 publication binding.
 *
 * WHAT THIS DOES NOT OWN: workout/draft content or the anchor (plan 51 owner),
 * the stored pin and the roster (plan 61 provider), route/thread effects and the
 * decision UI (C3), notebook/food/voice boundaries (C4). No second owner, no
 * message or receipt cache, no permission lease, no write grant.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useGlobalClient } from '../../../../../context/GlobalClientContext';
import { parseStrictPositiveId } from '../../../../../hooks/coachPublicationScope';
import { useCoachSessionDraftContext } from '../CoachSessionDraftContext';
import {
  OWNER_ORIGIN,
  capabilityFor,
  mintCommitId,
  parseSelectionCandidate,
  statusForFailure,
  type CoachRequestOutcome,
  type CoachSelectionAdapterParams,
  type CoachSelectionCandidate,
  type CoachSelectionObservation,
  type ParsedCandidate,
} from './coachSelectionContract';
import { useCoachSelectionAdmission } from './useCoachSelectionAdmission';
import { useCoachSelectionCommit } from './useCoachSelectionCommit';
import { useCoachSessionSelectionState } from './useCoachSessionSelectionState';

export * from './coachSelectionContract';

export function useCoachSessionSelection(params: CoachSelectionAdapterParams) {
  const { actorId, rawRole, audienceRole, observation } = params;
  const owner = useCoachSessionDraftContext();
  const reference = useGlobalClient();
  const actorNumber = parseStrictPositiveId(actorId) ?? null;
  // Staff admission only: raw admin/trainer. A raw 'client'/'user'/unknown role
  // can never acquire Desk authority, and never reaches the plan 52 endpoint.
  const staffActor = actorNumber !== null && (rawRole === 'admin' || rawRole === 'trainer');
  const capability = capabilityFor(rawRole);
  const resolvedAudience = typeof audienceRole === 'string' && audienceRole ? audienceRole : rawRole ?? '';
  /** The actor epoch every exposed value is stamped with. A-B-A is a NEW key. */
  const actorKey = staffActor ? `${actorNumber}:${rawRole}` : '';

  const core = useCoachSessionSelectionState({ actorNumber, rawRole, staffActor, actorKey });
  const { state, stateRef, actorRef, apply, retire, publicationBinding, consumedRef, disposedRef } = core;

  const audienceRef = useRef(resolvedAudience);
  audienceRef.current = resolvedAudience;
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const referenceRef = useRef(reference);
  referenceRef.current = reference;
  const observationRef = useRef<CoachSelectionObservation | null>(observation ?? null);
  observationRef.current = observation ?? null;

  const readAdmission = useCoachSelectionAdmission(core, audienceRef);
  const { consumeCommit, ackCommit } = useCoachSelectionCommit(core, {
    ownerRef, referenceRef, observationRef, audienceRef,
  });

  const branchOwner = useCallback((
    parsed: Extract<ParsedCandidate, { ok: true }>,
    resolvedTarget: number | null,
    resolvedThread: number | null,
  ): CoachRequestOutcome => {
    const ownerState = ownerRef.current.getSnapshot();
    const draft = ownerState.draft;
    const protectedCrossTarget = Boolean(draft) && draft!.targetUserId !== resolvedTarget
      && (draft!.dirty || Boolean(ownerState.submitted));
    if (protectedCrossTarget && draft) {
      const anchor = observationRef.current;
      if (!anchor) {
        apply({ phase: 'blocked-return', reason: 'BLOCKED_RETURN' });
        return { status: 'invalid', reason: 'BLOCKED_RETURN' };
      }
      const result = ownerRef.current.requestTargetChange(resolvedTarget, {
        origin: OWNER_ORIGIN[parsed.origin],
        nextThreadId: resolvedThread,
        anchor: {
          pathname: anchor.pathname, search: anchor.search, hash: anchor.hash,
          targetUserId: draft.targetUserId, pinnedClientId: referenceRef.current.pinnedClientId ?? null,
          threadId: ownerState.selectionAnchor?.threadId ?? null,
        },
      });
      if (!result.ok) {
        apply({ phase: 'invalid', reason: 'INVALID_CANDIDATE' });
        return { status: 'invalid', reason: 'INVALID_CANDIDATE' };
      }
      consumedRef.current = null;
      const ticket = {
        commitId: mintCommitId(), kind: 'admit' as const,
        targetUserId: resolvedTarget, threadId: resolvedThread,
        requestId: result.change.requestId, scopeToken: result.change.scopeToken,
      };
      apply({
        pending: { ...ticket }, phase: 'decision', reason: null,
        instructions: { ...ticket, anchor: result.change.anchor, pinCommitted: false, retireScopeToken: null },
      });
      return { status: 'decision', requestId: ticket.requestId, scopeToken: ticket.scopeToken };
    }
    consumedRef.current = null;
    apply({
      pending: null, phase: 'committing', reason: null,
      instructions: {
        commitId: mintCommitId(), kind: 'admit',
        targetUserId: resolvedTarget, threadId: resolvedThread,
        anchor: ownerState.selectionAnchor, pinCommitted: false,
        // A CLEAN draft for another target is retired only at commit, never during the check.
        retireScopeToken: draft && draft.targetUserId !== resolvedTarget && !ownerState.submitted ? draft.scopeToken : null,
      },
    });
    return { status: 'accepted' };
  }, [apply, consumedRef]);

  const requestSelection = useCallback(async (candidate: CoachSelectionCandidate): Promise<CoachRequestOutcome> => {
    if (!actorRef.current.staffActor || actorRef.current.actorNumber === null) return { status: 'retired', reason: 'RETIRED' };
    const parsed = parseSelectionCandidate(candidate);
    if (!parsed.ok) {
      apply({ phase: 'invalid', reason: parsed.reason });
      return { status: 'invalid', reason: parsed.reason };
    }
    const current = stateRef.current;
    if (current.pending) {
      // Candidate resolution and the dirty cross-target decision are ONE
      // operation: a competing candidate never replaces the first request.
      const same = current.pending.targetUserId === parsed.targetUserId && current.pending.threadId === parsed.conversationId;
      if (!same) return { status: 'busy', reason: 'BUSY' };
      return { status: 'decision', requestId: current.pending.requestId, scopeToken: current.pending.scopeToken };
    }
    const generation = current.requestGeneration + 1;
    const actorAtRequest = { actorNumber: actorRef.current.actorNumber, rawRole: actorRef.current.rawRole };
    apply({ requestGeneration: generation, phase: 'checking', reason: null });
    retire();
    apply({ requestGeneration: generation, phase: 'checking', reason: null });
    const outcome = await readAdmission(generation, actorAtRequest, {
      ...(candidate.targetUserId === undefined ? {} : { targetUserId: parsed.targetUserId }),
      ...(candidate.conversationId === undefined ? {} : { conversationId: parsed.conversationId }),
    });
    // A SUPERSEDED response writes NOTHING: it must not overwrite the newer
    // request's phase with its own stale outcome.
    if (!outcome.ok && outcome.superseded) return { status: 'stale', reason: 'REPLACED' };
    if (!outcome.ok) {
      apply({ phase: outcome.phase, reason: outcome.reason });
      return { status: statusForFailure(outcome.phase), reason: outcome.reason };
    }
    return branchOwner(parsed, outcome.targetUserId, outcome.conversationId);
  }, [actorRef, apply, branchOwner, readAdmission, retire, stateRef]);

  const decide = useCallback(async (
    scopeToken: string, requestId: string, decision: 'return' | 'discard',
  ): Promise<CoachRequestOutcome> => {
    const actor = actorRef.current;
    if (!actor.staffActor || actor.actorNumber === null) return { status: 'retired', reason: 'RETIRED' };
    const ticket = stateRef.current.instructions;
    const ownerState = ownerRef.current.getSnapshot();
    const change = ownerState.pendingTargetChange;
    if (!ticket || !change || !stateRef.current.pending) return { status: 'invalid', reason: 'STALE' };
    if (change.requestId !== requestId || change.scopeToken !== scopeToken) return { status: 'invalid', reason: 'STALE' };
    const generation = stateRef.current.requestGeneration + 1;
    const actorAtRequest = { actorNumber: actor.actorNumber, rawRole: actor.rawRole };
    apply({ requestGeneration: generation, phase: 'checking', reason: null });
    if (decision === 'return') {
      const anchor = change.anchor;
      if (anchor && anchor.pinnedClientId !== null && anchor.pinnedClientId !== change.fromTargetUserId) {
        // Plan 63: a pin that already differs from the original needs its OWN
        // fresh matching receipt. Refusing is the conservative branch — no
        // restore bypass, no fabricated success, no silent pin clear.
        apply({ phase: 'blocked-return', reason: 'BLOCKED_RETURN' });
        return { status: 'invalid', reason: 'BLOCKED_RETURN' };
      }
      const outcome = await readAdmission(generation, actorAtRequest, { targetUserId: change.fromTargetUserId });
      if (!outcome.ok && outcome.superseded) return { status: 'stale', reason: 'REPLACED' };
      if (!outcome.ok) {
        apply({ phase: 'blocked-return', reason: outcome.reason });
        return { status: 'invalid', reason: outcome.reason };
      }
      const intent = ownerRef.current.resolveTargetChange(scopeToken, requestId, 'return');
      if (intent.kind !== 'return') {
        apply({ phase: 'invalid', reason: 'STALE' });
        return { status: 'invalid', reason: 'STALE' };
      }
      consumedRef.current = null;
      apply({
        pending: null, phase: 'committing', reason: null,
        instructions: {
          commitId: mintCommitId(), kind: 'return', targetUserId: change.fromTargetUserId,
          threadId: intent.anchor?.threadId ?? null,
          anchor: intent.anchor ?? null, pinCommitted: false, retireScopeToken: null,
        },
      });
      return { status: 'accepted' };
    }
    const destination = change.nextTargetUserId;
    const outcome = await readAdmission(generation, actorAtRequest, destination === null ? {} : { targetUserId: destination });
    if (!outcome.ok && outcome.superseded) return { status: 'stale', reason: 'REPLACED' };
    if (!outcome.ok) {
      apply({ phase: outcome.phase, reason: outcome.reason });
      return { status: 'invalid', reason: outcome.reason };
    }
    const intent = ownerRef.current.resolveTargetChange(scopeToken, requestId, 'discard');
    if (intent.kind !== 'discard') {
      apply({ phase: 'invalid', reason: 'STALE' });
      return { status: 'invalid', reason: 'STALE' };
    }
    consumedRef.current = null;
    apply({
      pending: null, phase: 'committing', reason: null,
      instructions: {
        commitId: mintCommitId(), kind: 'discard', targetUserId: intent.targetUserId, threadId: change.nextThreadId,
        anchor: intent.anchor ?? null, pinCommitted: false, retireScopeToken: null,
      },
    });
    return { status: 'accepted' };
  }, [actorRef, apply, consumedRef, readAdmission, stateRef]);

  const leave = useCallback(() => {
    retire();
    apply({ phase: 'retired', reason: null });
  }, [apply, retire]);

  const retry = useCallback(() => {
    const ticket = stateRef.current.pending;
    if (!ticket) return Promise.resolve<CoachRequestOutcome>({ status: 'invalid', reason: 'STALE' });
    return requestSelection({ targetUserId: ticket.targetUserId, conversationId: ticket.threadId });
  }, [requestSelection, stateRef]);

  // Plan 61 §C1: ordinary setActiveClient/clearActiveClient calls become
  // candidate REQUESTS while this adapter is mounted, so a picker cannot mutate
  // the pin before admission. The adapter's own commit bypasses this port.
  // Exactly one registration per mounted adapter; the remover is returned so a
  // stale remover can never disarm a newer interceptor (plan 61 owns that guard).
  useEffect(() => {
    if (!staffActor) return undefined;
    return referenceRef.current.registerSelectionInterceptor((candidate) => {
      if (disposedRef.current || candidate.generation !== referenceRef.current.actorGeneration) return;
      void requestSelection({ targetUserId: candidate.targetUserId, origin: candidate.origin === 'clear' ? 'clear' : 'picker' });
    });
  }, [disposedRef, referenceRef, requestSelection, staffActor]);

  // RENDER-TIME MASK. The render that first observes a new actor (or no actor)
  // sees NOTHING from the previous epoch — there is no commit in which the state
  // and the actor disagree — and the layout effect in the state module retires it.
  const visible = state.actorKey === actorKey ? state : { ...state, phase: 'unadmitted' as const, reason: null, accepted: null, pending: null, instructions: null };
  const isStaff = staffActor && state.actorKey === actorKey;
  return {
    capability,
    phase: isStaff ? visible.phase : 'retired' as const,
    reason: isStaff ? visible.reason : null,
    accepted: isStaff ? visible.accepted : null,
    pending: isStaff ? visible.pending : null,
    instructions: isStaff ? visible.instructions : null,
    requestGeneration: visible.requestGeneration,
    admissionGeneration: visible.admissionGeneration,
    publicationBinding,
    requestSelection,
    decide,
    consumeCommit,
    ackCommit,
    retry,
    leave,
  };
}

export default useCoachSessionSelection;
