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

