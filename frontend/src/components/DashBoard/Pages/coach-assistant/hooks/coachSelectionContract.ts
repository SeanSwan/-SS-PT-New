/**
 * ============================================================================
 * FILE: coachSelectionContract.ts
 * PURPOSE: Plan 55 §3 C2 / plan 63 §5 — the PURE selection-adapter contract.
 * ============================================================================
 * Rule 4 split of the C2 adapter: every type and every pure predicate lives
 * here, with no React, so the hook module stays reviewable and this half stays
 * unit-testable without a DOM harness. `useCoachSessionSelection.ts` RE-EXPORTS
 * this module, so every existing import path keeps working unchanged.
 *
 * ONE DELIBERATE EXCEPTION to "pure": `mintCommitId` keeps a monotonic
 * module-level `commitCounter` as a collision guard, so this file is not
 * state-free. The original header claimed "no module-level mutable state", which
 * was simply false and would have stopped a reviewer looking for exactly that
 * class of thing. (External hostile review, GLM 5.3, Finding 8.) The counter is
 * write-only, monotonic and never read across modules, so the cost is the
 * exception itself, not a hazard — but it is now stated rather than denied.
 *
 * NOTHING here reads a live scope, calls the network, or owns a generation.
 */
import { parseStrictNullableId, parseStrictPositiveId } from '../../../../../hooks/coachPublicationScope';
import type { TargetChangeOrigin } from '../coachSessionDraftState';

export const COACH_TARGET_ACCESS_PATH = '/api/ai-chat/target-access';
export const COACH_ADMISSION_TIMEOUT_MS = 10_000;

export type CoachSelectionOrigin = 'picker' | 'clear' | 'thread' | 'route' | 'pin' | 'default';

export type CoachSelectionPhase =
  | 'unadmitted' | 'checking' | 'ready' | 'decision' | 'invalid'
  | 'denied' | 'unavailable' | 'blocked-return' | 'committing' | 'retired';

export type CoachSelectionReason =
  | 'INVALID_CANDIDATE' | 'CONFLICT' | 'DENIED' | 'NOT_FOUND' | 'UNAVAILABLE'
  | 'BUSY' | 'RETIRED' | 'STALE' | 'RECEIPT_MISMATCH' | 'BLOCKED_RETURN' | 'REPLACED';

export type CoachSelectionCapability =
  /** A raw admin/trainer actor: the adapter may admit a staff target. */
  | 'staff'
  /** A raw client/user actor: the existing server-owned self flow, unbound. */
  | 'client'
  /** Any other raw role: staff presentation WITHOUT admission, permanently masked. */
  | 'unknown';

export type CoachSelectionCandidate = Readonly<{
  /** `undefined` = not supplied. `null` = the explicit unscoped candidate. */
  targetUserId?: unknown;
  /** `undefined` = not supplied. Strict positive integer otherwise. */
  conversationId?: unknown;
  origin?: CoachSelectionOrigin;
}>;

export type CoachSelectionObservation = Readonly<{ pathname: string; search: string; hash: string }>;

export type CoachAcceptedAdmission = Readonly<{
  actorId: number; rawRole: string; audienceRole: string;
  generation: number; targetUserId: number | null; threadId: number | null;
}>;

export type CoachCommitTicket = Readonly<{
  commitId: string; kind: 'admit' | 'return' | 'discard';
  targetUserId: number | null; threadId: number | null;
}>;

export type CoachSelectionInstructions = CoachCommitTicket & Readonly<{
  anchor: SelectionAnchorLike | null; pinCommitted: boolean; retireScopeToken: string | null;
}>;

/** Structural copy of plan 51's anchor so this module does not import its React tree. */
export type SelectionAnchorLike = Readonly<{
  pathname: string; search: string; hash: string;
  targetUserId: number; pinnedClientId: number | null; threadId: number | null;
}>;

export type CoachRequestOutcome = Readonly<{
  status: 'accepted' | 'decision' | 'invalid' | 'denied' | 'unavailable' | 'busy' | 'stale' | 'retired';
  reason?: CoachSelectionReason;
  requestId?: string; scopeToken?: string;
}>;

export type CoachSelectionAdapterParams = {
  /** The ACTUAL authenticated actor id. Absent/unknown can never admit staff. */
  actorId?: string | number | null;
  /** The ACTUAL raw role. Never the dashboard presentation role. */
  rawRole?: string | null;
  /** Audience for the plan 52 read. Defaults to the raw role. */
  audienceRole?: string | null;
  /** C3's exact location observation, used only to remember a plan 51 anchor. */
  observation?: CoachSelectionObservation | null;
};

export type ParsedCandidate =
  | { ok: true; targetUserId: number | null; conversationId: number | null; origin: CoachSelectionOrigin }
  | { ok: false; reason: CoachSelectionReason };

const ORIGINS: readonly CoachSelectionOrigin[] = ['picker', 'clear', 'thread', 'route', 'pin', 'default'];

/** Strict parse. `undefined` = absent (distinct from the explicit `null` unscoped lane). */
export function parseSelectionCandidate(candidate: CoachSelectionCandidate): ParsedCandidate {
  const origin = candidate.origin ?? 'route';
  if (!ORIGINS.includes(origin)) return { ok: false, reason: 'INVALID_CANDIDATE' };
  const rawTarget = candidate.targetUserId;
  const targetUserId = rawTarget === undefined ? null : parseStrictNullableId(rawTarget);
  if (targetUserId === undefined) return { ok: false, reason: 'INVALID_CANDIDATE' };
  const rawThread = candidate.conversationId;
  const conversationId = rawThread === undefined || rawThread === null ? null : parseStrictPositiveId(rawThread);
  if (conversationId === undefined) return { ok: false, reason: 'INVALID_CANDIDATE' };
  return { ok: true, targetUserId, conversationId, origin };
}

/**
 * Raw-query parse. A DUPLICATE key is a refusal, not "last one wins": the whole
 * point is that an ambiguous `clientId` never resolves to a target by accident.
 */
export function parseSelectionQuery(search: string): ParsedCandidate {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const targets = query.getAll('clientId');
  const threads = query.getAll('threadId');
  if (targets.length > 1 || threads.length > 1) return { ok: false, reason: 'INVALID_CANDIDATE' };
  const target = targets.length === 0 ? null : parseStrictNullableId(targets[0]);
  if (target === undefined) return { ok: false, reason: 'INVALID_CANDIDATE' };
  const thread = threads.length === 0 || threads[0] === '' ? null : parseStrictPositiveId(threads[0]);
  if (thread === undefined) return { ok: false, reason: 'INVALID_CANDIDATE' };
  return { ok: true, targetUserId: target, conversationId: thread, origin: 'route' };
}

/**
 * The plan 52 receipt contract, validated against the CAPTURED request. Every
 * field must be present: an omitted key is a refusal, never a null value.
 */
export function isCoachTargetAccessReceipt(
  value: unknown,
  request: Readonly<{ actorId: number; rawRole: string; targetUserId?: number | null; conversationId?: number | null }>,
): boolean {
  if (!value || typeof value !== 'object') return false;
  const body = value as { success?: unknown; access?: unknown };
  if (body.success !== true || !body.access || typeof body.access !== 'object') return false;
  const access = body.access as Record<string, unknown>;
  if (access.scope !== 'coach_target_read') return false;
  if (!('targetUserId' in access) || !('conversationId' in access)) return false;
  if (parseStrictPositiveId(access.actorUserId) !== request.actorId) return false;
  if (access.actorRole !== request.rawRole) return false;
  if (parseStrictNullableId(access.targetUserId) !== access.targetUserId) return false;
  if (parseStrictNullableId(access.conversationId) !== access.conversationId) return false;
  if (request.targetUserId !== undefined && access.targetUserId !== request.targetUserId) return false;
  if (request.conversationId !== undefined && access.conversationId !== request.conversationId) return false;
  if (request.targetUserId === undefined && request.conversationId === undefined && access.targetUserId !== null) return false;
  return true;
}

/** How a candidate origin maps onto the plan 51 owner's declared origins. */
export const OWNER_ORIGIN: Record<CoachSelectionOrigin, TargetChangeOrigin> = {
  picker: 'pin', clear: 'pin', thread: 'thread', route: 'route', pin: 'pin', default: 'route',
};

/**
 * The bounded subset of phases a FAILED admission may report. Narrower than
 * `CoachSelectionPhase` on purpose: a failure can never be `checking`, `ready`
 * or `committing`, and the request-status mapping stays exhaustive.
 */
export type CoachFailurePhase = Extract<
  CoachSelectionPhase, 'invalid' | 'denied' | 'unavailable' | 'blocked-return'
>;

/** The caller-facing status for a failure phase. `blocked-return` reports as invalid. */
export function statusForFailure(phase: CoachFailurePhase): CoachRequestOutcome['status'] {
  return phase === 'blocked-return' ? 'invalid' : phase;
}

/**
 * Map an HTTP failure to a bounded phase/reason. The raw backend error, its
 * body and its message are never surfaced: only this enumerated class is.
 */
export function failureFor(error: unknown): Readonly<{ phase: CoachFailurePhase; reason: CoachSelectionReason }> {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 403) return { phase: 'denied', reason: 'DENIED' };
  if (status === 409) return { phase: 'invalid', reason: 'CONFLICT' };
  if (status === 404) return { phase: 'invalid', reason: 'NOT_FOUND' };
  if (status === 400) return { phase: 'invalid', reason: 'INVALID_CANDIDATE' };
  return { phase: 'unavailable', reason: 'UNAVAILABLE' };
}

/** The C3 binding policy: client actors stay UNBOUND; any other unknown role is bound fail-closed. */
export function capabilityFor(rawRole: string | null | undefined): CoachSelectionCapability {
  if (rawRole === 'admin' || rawRole === 'trainer') return 'staff';
  if (rawRole === 'client' || rawRole === 'user') return 'client';
  return 'unknown';
}

let commitCounter = 0;
/** An opaque, locally unique commit identity. Never derived from a wire value. */
export function mintCommitId(): string {
  commitCounter += 1;
  if (typeof globalThis.crypto?.randomUUID === 'function') return `sel-${globalThis.crypto.randomUUID()}`;
  return `sel-${Date.now().toString(36)}-${commitCounter}`;
}
