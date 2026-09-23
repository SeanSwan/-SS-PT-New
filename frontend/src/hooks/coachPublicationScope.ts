export type PublicationSnapshot = Readonly<{
  actorId: number;
  rawRole: string;
  audienceRole: string;
  generation: number;
  targetUserId: number | null;
  threadId: number | null;
  enabled: boolean;
}>;

export type CreatedThread = Readonly<{
  id: number;
  role: string;
  targetUserId: number | null;
}>;

export type CreatedThreadAdoptionArgs = Readonly<{
  captured: PublicationSnapshot;
  operation: object;
  thread: CreatedThread;
  signal: AbortSignal;
}>;

export type PublicationBinding = {
  getSnapshot: () => PublicationSnapshot | null;
  adoptCreatedThread?: (
    args: CreatedThreadAdoptionArgs,
  ) => Promise<PublicationSnapshot | null>;
  /**
   * Brain-v4 hostile review #2: undo ONLY a created-thread adoption, returning
   * the snapshot to the admitted thread-less scope it was adopted from, so
   * "New chat" can start a second conversation. False (and no change) when the
   * live snapshot is not that adoption — a fresh admission is never undone.
   */
  releaseAdoptedThread?: () => boolean;
};

const POSITIVE_ID_PATTERN = /^[1-9]\d*$/;

export function parseStrictPositiveId(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }
  if (typeof value !== 'string' || !POSITIVE_ID_PATTERN.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseStrictNullableId(value: unknown): number | null | undefined {
  if (value === null) return null;
  return parseStrictPositiveId(value);
}

export function freezePublicationSnapshot(
  value: PublicationSnapshot,
): PublicationSnapshot {
  return Object.freeze({
    actorId: value.actorId,
    rawRole: value.rawRole,
    audienceRole: value.audienceRole,
    generation: value.generation,
    targetUserId: value.targetUserId,
    threadId: value.threadId,
    enabled: value.enabled,
  });
}

export function isPublicationSnapshot(value: unknown): value is PublicationSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PublicationSnapshot>;
  return typeof candidate.actorId === 'number'
    && parseStrictPositiveId(candidate.actorId) === candidate.actorId
    && isAllowedRawRole(candidate.rawRole)
    && typeof candidate.audienceRole === 'string'
    && candidate.audienceRole.length > 0
    && audienceAllowedForActor(candidate.rawRole, candidate.audienceRole)
    && typeof candidate.generation === 'number'
    && Number.isSafeInteger(candidate.generation)
    && candidate.generation > 0
    && parseStrictNullableId(candidate.targetUserId) !== undefined
    && parseStrictNullableId(candidate.targetUserId) === candidate.targetUserId
    && parseStrictNullableId(candidate.threadId) !== undefined
    && parseStrictNullableId(candidate.threadId) === candidate.threadId
    && typeof candidate.enabled === 'boolean';
}

export function samePublicationIdentity(
  left: PublicationSnapshot | null,
  right: PublicationSnapshot | null,
): boolean {
  return left !== null && right !== null
    && left.actorId === right.actorId
    && left.rawRole === right.rawRole
    && left.audienceRole === right.audienceRole
    && left.generation === right.generation
    && left.targetUserId === right.targetUserId
    && left.threadId === right.threadId;
}

export function samePublicationToken(
  left: PublicationSnapshot | null,
  right: PublicationSnapshot | null,
): boolean {
  return samePublicationIdentity(left, right) && left?.enabled === right?.enabled;
}

export function isAllowedRawRole(value: unknown): value is 'admin' | 'trainer' | 'client' {
  return value === 'admin' || value === 'trainer' || value === 'client';
}

export function audienceAllowedForActor(
  rawRole: string,
  audienceRole: string,
): boolean {
  if (rawRole === 'admin') return audienceRole === 'admin' || audienceRole === 'trainer' || audienceRole === 'client';
  if (rawRole === 'trainer') return audienceRole === 'trainer' || audienceRole === 'client';
  if (rawRole === 'client') return audienceRole === 'client';
  return false;
}

/* ============================================================================
 * Plan 55 C4 — the admission predicates shared by the boundary hooks
 * (notebook, composer draft, pending food, voice staging).
 *
 * These are the SAME pure types/predicates the B1/B2 transports bind against;
 * no store, provider or state lives here. Each consumer declares only the part
 * of the scope it actually owns, so an unowned dimension can never be silently
 * assumed to match.
 * ========================================================================= */

export type PublicationAdmissionRequest = Readonly<{
  /** Omit for a target-bound consumer that does not own actor identity. */
  actorId?: number | string | null;
  /** Omit for an actor-bound consumer. `null` is the explicit unscoped lane. */
  targetUserId?: number | null;
}>;

/**
 * Read the live admission snapshot from an optional binding. Never throws; a
 * malformed snapshot reads as "no admission".
 */
export function readPublicationScope(binding?: PublicationBinding): PublicationSnapshot | null {
  if (!binding) return null;
  try {
    const value = binding.getSnapshot();
    return isPublicationSnapshot(value) ? freezePublicationSnapshot(value) : null;
  } catch {
    return null;
  }
}

/**
 * True when this consumer's declared scope is admitted.
 *
 * An ABSENT binding is dormant-but-admitted: every existing caller keeps its
 * current behaviour until C3 wires a real admission signal, which is the same
 * compatibility rule B1/B2 used. A PRESENT binding must be live and enabled and
 * must match every dimension the caller declared. A request that declares
 * NEITHER dimension fails closed rather than degrading into a blanket allow.
 */
export function isPublicationAdmitted(
  binding: PublicationBinding | undefined,
  request: PublicationAdmissionRequest,
): boolean {
  if (!binding) return true;
  const snapshot = readPublicationScope(binding);
  if (!snapshot || !snapshot.enabled) return false;
  if (request.actorId === undefined && request.targetUserId === undefined) return false;
  if (request.actorId !== undefined) {
    const actorId = parseStrictPositiveId(request.actorId);
    if (actorId === undefined || actorId !== snapshot.actorId) return false;
  }
  if (request.targetUserId !== undefined) {
    if (parseStrictNullableId(request.targetUserId) !== snapshot.targetUserId) return false;
  }
  return true;
}

/**
 * True when the surface has a live, enabled admission at all, with no target
 * constraint. Used by actor-bound-only consumers and by the pending-food query,
 * whose stored payload carries no actor/target envelope to match against.
 */
export function hasLivePublication(binding?: PublicationBinding): boolean {
  if (!binding) return true;
  const snapshot = readPublicationScope(binding);
  return Boolean(snapshot && snapshot.enabled);
}

/**
 * True only while a captured token is still the live admission. Called after
 * every await so a completion that lands after retirement cannot publish.
 * An absent binding has no generation to compare, so the caller's own local
 * operation identity remains the only fence there (unchanged legacy behaviour).
 */
export function isPublicationTokenLive(
  binding: PublicationBinding | undefined,
  captured: PublicationSnapshot | null,
): boolean {
  if (!binding) return true;
  const live = readPublicationScope(binding);
  return Boolean(live && captured && samePublicationToken(live, captured));
}

