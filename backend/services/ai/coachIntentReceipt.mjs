/** Bounded Coach receipt projection, shared before persistence and at read time.
 * JSON result fields describe an effect; they never establish lifecycle truth.
 * Trusted commit/verification state comes from dedicated coordinator columns.
 */
const STATES = new Set(['drafted', 'claimed', 'awaiting_approval', 'executing',
  'committed_unverified', 'completed', 'verified', 'failed', 'unknown', 'cancelled', 'refused']);
const KINDS = new Set(['daily_workout_form', 'workout_session', 'workout_log', 'workout_plan', 'coach_proposal']);
const CODES = new Set(['CLIENT_TIMEOUT', 'READBACK_UNAVAILABLE', 'READBACK_MISMATCH',
  'EXPECTED_FOOTPRINT_INVALID', 'EXECUTION_FAILED', 'DOMAIN_WRITE_FAILED',
  'ACCESS_DENIED', 'CANCELLED_BY_USER', 'REQUEST_HASH_MISMATCH']);
export const intentIso = value => {
  if (!(value instanceof Date) && typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};
const id = value => (typeof value === 'string' || typeof value === 'number')
  && /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/.test(String(value)) ? String(value) : null;
export const intentReason = value => CODES.has(value) ? value : null;
export const intentSha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const recordRefs = value => (Array.isArray(value) ? value.slice(0, 100) : [])
  .filter(ref => ref && KINDS.has(ref.kind) && id(ref.id))
  .map(ref => ({ kind: ref.kind, id: id(ref.id),
    version: Number.isSafeInteger(ref.version) && ref.version >= 0 ? ref.version : null }));

export function sanitizeCoachIntentResult(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const refs = recordRefs(source.recordRefs);
  // Legacy sessionId is migrated into the same bounded reference projection.
  if (!refs.length && id(source.sessionId)) refs.push({ kind: 'workout_session', id: id(source.sessionId), version: null });
  return { schemaVersion: 1, recordRefs: refs,
    realAffectedCount: Number.isSafeInteger(source.realAffectedCount) && source.realAffectedCount >= 0 ? source.realAffectedCount : null,
    reasonCode: intentReason(source.reasonCode), correlationId: id(source.correlationId) };
}

export function toCoachIntentReceipt(intent) {
  if (!intent) return null;
  const source = sanitizeCoachIntentResult(intent.result);
  const status = STATES.has(intent.status) ? intent.status : 'unknown';
  const committed = ['completed', 'committed_unverified', 'verified'].includes(status);
  const committedAt = committed ? intentIso(intent.committedAt) : null;
  const verified = status === 'verified' && intent.proofVersion === 2
    && intentSha256(intent.expectedHash) && committedAt && intentIso(intent.verifiedAt);
  const state = status === 'verified' ? (verified ? 'verified' : 'unknown')
    : status === 'completed' ? 'committed_unverified' : status;
  return { schemaVersion: 1, intentId: id(intent.id), operationId: id(intent.operationId),
    proposalId: id(intent.proposalId), state, commandType: id(intent.commandType),
    targetUserId: (typeof intent.targetClientId === 'number' || typeof intent.targetClientId === 'string')
      && Number.isSafeInteger(Number(intent.targetClientId)) && Number(intent.targetClientId) > 0 ? Number(intent.targetClientId) : null,
    committedAt, verifiedAt: verified ? intentIso(intent.verifiedAt) : null,
    recordRefs: source.recordRefs, realAffectedCount: source.realAffectedCount,
    reversibility: 'none', undoAvailable: false,
    reasonCode: source.reasonCode ?? intentReason(intent.errorCode), correlationId: source.correlationId };
}
