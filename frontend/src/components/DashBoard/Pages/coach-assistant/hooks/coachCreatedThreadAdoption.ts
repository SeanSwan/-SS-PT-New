/**
 * ============================================================================
 * FILE: coachCreatedThreadAdoption.ts
 * PURPOSE: Brain-v4 P0.2 — the staff publication binding's created-thread adopter.
 * ============================================================================
 * WHY THIS EXISTS. `useAIChat.sendMessageWithConversation` refuses to create a NEW
 * conversation under a bound publication unless the binding can adopt it
 * (`useAIChat.ts`: `existingId === undefined && source && !source.adoptCreatedThread`,
 * plan 55 §C: "adopter capability" before any bound create POST). The staff binding
 * never implemented one, so a trainer or admin on a fresh Command Center (no thread
 * open, the default landing state) could not start a chat at all. The send returned
 * null, the UI read null as "superseded", and nothing told the operator
 * (hostile review 2026-09-22 C2).
 *
 * WHAT IT DECIDES. Pure: given the LIVE snapshot, the live actor, the snapshot the
 * send CAPTURED, and the thread the server just created, return the one snapshot
 * that may now be published, or null. It adopts only when every scope field still
 * matches, meaning same actor epoch, role, audience, generation and target, and the
 * captured publication had no thread. Anything else is a refusal. It never widens
 * scope: the server already authorised the create for exactly this target, and
 * `useAIChat.validateCreatedThread` checked the create response against it.
 */
import {
  freezePublicationSnapshot,
  parseStrictPositiveId,
  type CreatedThread,
  type PublicationSnapshot,
} from '../../../../../hooks/coachPublicationScope';

export type AdoptionActor = Readonly<{
  actorNumber: number | null;
  rawRole: string;
  staffActor: boolean;
  actorKey: string;
}>;

export type AdoptionInput = Readonly<{
  live: PublicationSnapshot | null;
  liveActorKey: string;
  actor: AdoptionActor;
  captured: PublicationSnapshot;
  thread: CreatedThread;
  aborted: boolean;
}>;

export type AdoptionRefusal =
  | 'ABORTED' | 'NO_LIVE_PUBLICATION' | 'NOT_STAFF' | 'ACTOR_EPOCH_CHANGED'
  | 'ALREADY_THREADED' | 'SCOPE_CHANGED' | 'INVALID_THREAD' | 'THREAD_SCOPE_MISMATCH';

export type AdoptionResult =
  | Readonly<{ ok: true; snapshot: PublicationSnapshot }>
  | Readonly<{ ok: false; reason: AdoptionRefusal }>;

export function decideCreatedThreadAdoption(input: AdoptionInput): AdoptionResult {
  const { live, liveActorKey, actor, captured, thread, aborted } = input;
  if (aborted) return { ok: false, reason: 'ABORTED' };
  if (!actor.staffActor || actor.actorNumber === null) return { ok: false, reason: 'NOT_STAFF' };
  if (!live || !live.enabled) return { ok: false, reason: 'NO_LIVE_PUBLICATION' };
  if (liveActorKey !== actor.actorKey) return { ok: false, reason: 'ACTOR_EPOCH_CHANGED' };
  if (live.threadId !== null || captured.threadId !== null) return { ok: false, reason: 'ALREADY_THREADED' };
  if (
    live.actorId !== actor.actorNumber
    || live.rawRole !== actor.rawRole
    || live.actorId !== captured.actorId
    || live.rawRole !== captured.rawRole
    || live.audienceRole !== captured.audienceRole
    || live.generation !== captured.generation
    || live.targetUserId !== captured.targetUserId
  ) return { ok: false, reason: 'SCOPE_CHANGED' };
  const threadId = parseStrictPositiveId(thread?.id);
  if (threadId === undefined) return { ok: false, reason: 'INVALID_THREAD' };
  if (thread.targetUserId !== captured.targetUserId || thread.role !== captured.audienceRole) {
    return { ok: false, reason: 'THREAD_SCOPE_MISMATCH' };
  }
  return { ok: true, snapshot: freezePublicationSnapshot({ ...live, threadId }) };
}
