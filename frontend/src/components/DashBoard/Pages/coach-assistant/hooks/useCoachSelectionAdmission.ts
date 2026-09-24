/**
 * ============================================================================
 * FILE: useCoachSelectionAdmission.ts
 * PURPOSE: Plan 55 §3 C2 / plan 63 §5 — the ONE plan 52 read per operation.
 * ============================================================================
 * Rule 4 split of the C2 adapter. This module owns exactly one thing: an
 * authenticated, generation-fenced `/api/ai-chat/target-access` GET whose
 * superseded result writes NOTHING — not a success, and not a failure phase.
 * It never publishes and never touches the plan 51 owner.
 */
import { useCallback } from 'react';
import apiService from '../../../../../services/api.service';
import {
  COACH_ADMISSION_TIMEOUT_MS,
  COACH_TARGET_ACCESS_PATH,
  failureFor,
  isCoachTargetAccessReceipt,
  type CoachFailurePhase,
  type CoachSelectionReason,
} from './coachSelectionContract';
import type { CoachSelectionCore } from './useCoachSessionSelectionState';

export type CoachAdmissionOutcome =
  | { ok: true; targetUserId: number | null; conversationId: number | null }
  /** A newer request, an actor change or an unmount owns the outcome now. */
  | { ok: false; superseded: true }
  | { ok: false; superseded: false; phase: CoachFailurePhase; reason: CoachSelectionReason };

export function useCoachSelectionAdmission(core: CoachSelectionCore, audienceRef: { current: string }) {
  const { abortRef, actorRef, disposedRef, stateRef } = core;
  return useCallback(async (
    generation: number,
    actorAtRequest: Readonly<{ actorNumber: number; rawRole: string }>,
    request: Readonly<{ targetUserId?: number | null; conversationId?: number | null }>,
  ): Promise<CoachAdmissionOutcome> => {
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), COACH_ADMISSION_TIMEOUT_MS);
    const query: Record<string, string> = { audienceRole: audienceRef.current };
    if (request.targetUserId !== undefined && request.targetUserId !== null) query.targetUserId = String(request.targetUserId);
    if (request.conversationId !== undefined && request.conversationId !== null) query.conversationId = String(request.conversationId);
    const superseded = () => disposedRef.current
      || stateRef.current.requestGeneration !== generation
      || stateRef.current.actorKey !== actorRef.current.actorKey
      || actorRef.current.actorNumber !== actorAtRequest.actorNumber
      || actorRef.current.rawRole !== actorAtRequest.rawRole
      || !actorRef.current.staffActor;
    try {
      const response = await apiService.get(COACH_TARGET_ACCESS_PATH, { params: query, signal: controller.signal });
      if (superseded()) return { ok: false, superseded: true };
      const valid = isCoachTargetAccessReceipt(response?.data, {
        actorId: actorAtRequest.actorNumber, rawRole: actorAtRequest.rawRole,
        ...(request.targetUserId === undefined ? {} : { targetUserId: request.targetUserId }),
        ...(request.conversationId === undefined ? {} : { conversationId: request.conversationId }),
      });
      if (!valid) return { ok: false, superseded: false, phase: 'unavailable', reason: 'RECEIPT_MISMATCH' };
      const access = (response.data as { access: { targetUserId: number | null; conversationId: number | null } }).access;
      return { ok: true, targetUserId: access.targetUserId, conversationId: access.conversationId };
    } catch (error) {
      if (superseded()) return { ok: false, superseded: true };
      return { ok: false, superseded: false, ...failureFor(error) };
    } finally {
      clearTimeout(timer);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [abortRef, actorRef, audienceRef, disposedRef, stateRef]);
}

export default useCoachSelectionAdmission;
