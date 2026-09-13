/**
 * ============================================================================
 * FILE: useCoachSessionSelectionState.ts
 * PURPOSE: Plan 55 §3 C2 — the adapter's state, actor epoch and lifecycle.
 * ============================================================================
 * Rule 4 split of the C2 adapter. This module owns ONLY:
 *  - the render-time actor mask and the committed actor epoch key,
 *  - the live refused/clamped publication snapshot (ID-only, plan 55 shape),
 *  - retirement: abort, one-use reset, generation bump, synchronous unmount.
 * It owns no request, no owner branch and no commit. The composing hook
 * (`useCoachSessionSelection.ts`) drives it; nothing here is exported publicly.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  freezePublicationSnapshot,
  type PublicationBinding,
  type PublicationSnapshot,
} from '../../../../../hooks/coachPublicationScope';
import type {
  CoachAcceptedAdmission,
  CoachCommitTicket,
  CoachSelectionInstructions,
  CoachSelectionPhase,
  CoachSelectionReason,
} from './coachSelectionContract';

export type AdapterState = {
  /** The actor epoch that produced every other field. A change MASKS at once. */
  actorKey: string;
  phase: CoachSelectionPhase;
  reason: CoachSelectionReason | null;
  accepted: CoachAcceptedAdmission | null;
  pending: (CoachCommitTicket & Readonly<{ requestId: string; scopeToken: string }>) | null;
  instructions: CoachSelectionInstructions | null;
  requestGeneration: number;
  admissionGeneration: number;
};

export const INITIAL_ADAPTER_STATE: AdapterState = {
  actorKey: '', phase: 'unadmitted', reason: null, accepted: null, pending: null,
  instructions: null, requestGeneration: 0, admissionGeneration: 1,
};

export function useCoachSessionSelectionState(params: {
  actorNumber: number | null;
  rawRole: string | null | undefined;
  staffActor: boolean;
  /** The actor epoch key: a DIFFERENT key for A-B-A, never the bare id. */
  actorKey: string;
}) {
  const { actorNumber, rawRole, staffActor, actorKey } = params;
  const [state, setState] = useState<AdapterState>(() => ({ ...INITIAL_ADAPTER_STATE, actorKey }));
  const stateRef = useRef<AdapterState>(state);
  const actorRef = useRef({ actorNumber, rawRole: rawRole ?? '', staffActor, actorKey });
  actorRef.current = { actorNumber, rawRole: rawRole ?? '', staffActor, actorKey };

  const apply = useCallback((patch: Partial<AdapterState>): AdapterState => {
    const next = { ...stateRef.current, ...patch, actorKey: actorRef.current.actorKey };
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  const disposedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const consumedRef = useRef<string | null>(null);
  const snapshotRef = useRef<PublicationSnapshot | null>(null);
  /** The actor epoch that minted `snapshotRef`. A-B-A cannot revive it. */
  const snapshotActorKeyRef = useRef<string>('');

  const publish = useCallback((admission: CoachAcceptedAdmission | null) => {
    snapshotActorKeyRef.current = admission ? actorRef.current.actorKey : '';
    snapshotRef.current = admission
      ? freezePublicationSnapshot({
        actorId: admission.actorId, rawRole: admission.rawRole, audienceRole: admission.audienceRole,
        generation: admission.generation, targetUserId: admission.targetUserId, threadId: admission.threadId,
        enabled: true,
      })
      : null;
  }, []);

  /** Retire the current publication and invalidate every ticket minted for it. */
  const retire = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    consumedRef.current = null;
    publish(null);
    return apply({
      accepted: null, pending: null, instructions: null,
      admissionGeneration: stateRef.current.admissionGeneration + 1,
    });
  }, [apply, publish]);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      abortRef.current?.abort();
      abortRef.current = null;
      // Retirement is synchronous with unmount: no late response may publish.
      snapshotActorKeyRef.current = '';
      snapshotRef.current = null;
    };
  }, []);

  // ACTOR CHANGE. Retirement happens in a LAYOUT effect, so no child can render
  // the previous actor's decision, and the exposed values are masked during the
  // render that observes the change (see the composer's `visible` derivation).
  useLayoutEffect(() => {
    if (stateRef.current.actorKey === actorKey) return;
    abortRef.current?.abort();
    abortRef.current = null;
    consumedRef.current = null;
    publish(null);
    const next: AdapterState = {
      ...INITIAL_ADAPTER_STATE, actorKey,
      admissionGeneration: stateRef.current.admissionGeneration + 1,
    };
    stateRef.current = next;
    setState(next);
  }, [actorKey, publish]);

  const publicationBinding = useMemo<PublicationBinding>(() => ({
    // Read-time actor admission: a snapshot minted under a previous actor epoch
    // is simply not visible, before any effect has a chance to retire it.
    getSnapshot: () => {
      const snapshot = snapshotRef.current;
      const actor = actorRef.current;
      if (!snapshot || !actor.staffActor || actor.actorNumber === null) return null;
      if (snapshotActorKeyRef.current !== actor.actorKey) return null;
      if (snapshot.actorId !== actor.actorNumber || snapshot.rawRole !== actor.rawRole) return null;
      return snapshot;
    },
  }), []);

  return {
    state, stateRef, actorRef, apply, publish, retire, publicationBinding,
    disposedRef, abortRef, consumedRef,
  };
}

export default useCoachSessionSelectionState;

/** What the composing adapter receives from this module. */
export type CoachSelectionCore = ReturnType<typeof useCoachSessionSelectionState>;
