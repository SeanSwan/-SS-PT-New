/**
 * CoachWorkoutResultState.ts — narrow G01 domain module.
 *
 * Decodes the bounded public workout-intent receipt and classifies workout
 * approval outcomes into truthful presentation states. Allowlists mirror the
 * server serializers exactly (verified 2026-09-06):
 *   - toPublicCoachIntent   backend/services/ai/coachIntentService.mjs:31
 *   - toCoachIntentReceipt  backend/services/ai/coachIntentReceipt.mjs:35
 *   - 200/503 approval bodies backend/services/ai/coachWorkoutProposalApprovalService.mjs
 *
 * The receipt lives at intent.result (state at intent.result.state), and only
 * a decoded 'verified' receipt may celebrate. Missing/malformed proof is
 * always conservative.
 */
import { PlaudApiError } from '../../../../services/plaudClipService';

/** Minimal response shape the success classifier reads (the nested intent receipt). */
export interface CoachWorkoutApprovalResultLike {
  intent?: unknown;
}

export interface CoachWorkoutRecordRef {
  kind: string;
  id: string;
}

export interface CoachWorkoutReceipt {
  schemaVersion: number | null;
  intentId: string | null;
  proposalId: string | null;
  state: string;
  targetUserId: number | null;
  committedAt: string | null;
  verifiedAt: string | null;
  recordRefs: CoachWorkoutRecordRef[];
  realAffectedCount: number | null;
}

/** Same lifecycle allowlist as backend coachIntentReceipt.mjs STATES. */
const RECEIPT_STATES = new Set([
  'drafted', 'claimed', 'awaiting_approval', 'executing',
  'committed_unverified', 'completed', 'verified', 'failed', 'unknown', 'cancelled', 'refused',
]);

/** Same kind allowlist as backend coachIntentReceipt.mjs KINDS. */
const RECEIPT_KINDS = new Set([
  'daily_workout_form', 'workout_session', 'workout_log', 'workout_plan', 'coach_proposal',
]);

const PRE_EFFECT_APPROVAL_CODES = new Set([
  'PROPOSAL_NOT_FOUND',
  'PROPOSAL_NOT_PENDING',
  'PROPOSAL_DETAIL_REVIEW_REQUIRED',
  'PROPOSAL_REVIEW_TOKEN_UNAVAILABLE',
  'PROPOSAL_INVALID_CLIENT_ID',
  'CLIENT_ACCESS_DENIED',
]);

export type CoachWorkoutOutcome =
  | { kind: 'verified'; receipt: CoachWorkoutReceipt }
  | { kind: 'committed_unverified'; receipt: CoachWorkoutReceipt | null; intentId: string | null; proposalId: string | null }
  | { kind: 'result_unavailable'; intentId: string | null; proposalId: string | null }
  | { kind: 'commit_unknown'; intentId: string | null; proposalId: string | null }
  | { kind: 'pre_effect_failed'; code: string; message: string }
  | { kind: 'lookup_denied'; intentId: string | null; proposalId: string | null }
  | { kind: 'lookup_not_found'; intentId: string | null; proposalId: string | null }
  | { kind: 'lookup_unavailable'; intentId: string | null; proposalId: string | null };

/** Outcomes that carry a lookup target and therefore expose a Check-result action. */
export type CoachWorkoutCheckableOutcome = Extract<
  CoachWorkoutOutcome,
  { kind: 'committed_unverified' | 'result_unavailable' | 'commit_unknown' }
>;

/** Narrows an outcome to the checkable (lookup-target-carrying) sub-union. */
export function isCheckableWorkoutOutcome(
  outcome: CoachWorkoutOutcome,
): outcome is CoachWorkoutCheckableOutcome {
  return (
    outcome.kind === 'committed_unverified'
    || outcome.kind === 'result_unavailable'
    || outcome.kind === 'commit_unknown'
  );
}

const positiveSafeInt = (value: unknown): number | null => (
  Number.isSafeInteger(value as number) && (value as number) > 0 ? (value as number) : null
);

const isoOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? value : null;
};

const safeId = (value: unknown): string | null => (
  typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/.test(value) ? value : null
);

/** Decode the bounded receipt nested at intent.result. Null = malformed proof. */
export function decodeCoachWorkoutReceipt(intent: unknown): CoachWorkoutReceipt | null {
  if (!intent || typeof intent !== 'object' || Array.isArray(intent)) return null;
  const source = intent as Record<string, unknown>;
  const result = source.result;
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const r = result as Record<string, unknown>;

  if (r.schemaVersion !== 1 || !safeId(source.id) || r.intentId !== source.id
    || !safeId(source.proposalId) || r.proposalId !== source.proposalId
    || positiveSafeInt(source.targetUserId) == null || r.targetUserId !== source.targetUserId) return null;
  const rawState = typeof r.state === 'string' ? r.state : null;
  if (!rawState || !RECEIPT_STATES.has(rawState)) return null;
  // Outer legacy status 'completed' maps to committed_unverified — never verified.
  const state = rawState === 'completed' ? 'committed_unverified' : rawState;
  const outerStatus = typeof source.status === 'string' ? source.status : null;
  if (state === 'committed_unverified' && outerStatus !== 'committed_unverified' && outerStatus !== 'completed') return null;

  if (!Array.isArray(r.recordRefs) || r.recordRefs.length > 100) return null;
  const refsRaw = r.recordRefs;
  const recordRefs: CoachWorkoutRecordRef[] = [];
  for (const ref of refsRaw) {
    if (!ref || typeof ref !== 'object') return null;
    const kind = (ref as Record<string, unknown>).kind;
    const id = safeId((ref as Record<string, unknown>).id);
    if (typeof kind !== 'string' || !RECEIPT_KINDS.has(kind) || !id) return null;
    recordRefs.push({ kind, id });
  }

  if (state === 'verified' && (source.status !== 'verified' || !isoOrNull(r.committedAt)
    || !isoOrNull(r.verifiedAt) || new Date(String(r.verifiedAt)) < new Date(String(r.committedAt))
    || !recordRefs.some(ref => ['daily_workout_form', 'workout_session', 'workout_log'].includes(ref.kind))
    || !positiveSafeInt(r.realAffectedCount))) return null;
  return {
    proposalId: safeId(source.proposalId),
    schemaVersion: Number.isSafeInteger(r.schemaVersion as number) ? (r.schemaVersion as number) : null,
    intentId: safeId(source.id) ?? safeId(r.intentId),
    state,
    targetUserId: positiveSafeInt(r.targetUserId) ?? positiveSafeInt(source.targetUserId),
    committedAt: isoOrNull(r.committedAt),
    verifiedAt: state === 'verified' ? isoOrNull(r.verifiedAt) : null,
    recordRefs,
    realAffectedCount: Number.isSafeInteger(r.realAffectedCount as number) && (r.realAffectedCount as number) >= 0
      ? (r.realAffectedCount as number)
      : null,
  };
}

/** Bind receipt identity/target to the active authorized proposal. */
export function receiptBindsToTarget(receipt: CoachWorkoutReceipt, targetClient: number | null): boolean {
  if (receipt.targetUserId == null || targetClient == null) return false;
  return receipt.targetUserId === targetClient;
}

/**
 * Success path: a verified receipt celebrates; committed_unverified /
 * malformed proof does not. `null` = no durable intent on the response, i.e.
 * the legacy (v1) protocol — the caller keeps its existing behavior.
 */
export function classifyWorkoutApprovalSuccess(
  result: CoachWorkoutApprovalResultLike,
  proposalId: string,
  targetClient: number | null,
  expectedIntentId?: string | null,
): CoachWorkoutOutcome | null {
  const rawIntent = result.intent;
  if (rawIntent == null) return null;
  if (typeof rawIntent !== 'object' || Array.isArray(rawIntent)) {
    return { kind: 'commit_unknown', intentId: null, proposalId };
  }
  const intentId = safeId((rawIntent as Record<string, unknown>).id);
  const receipt = decodeCoachWorkoutReceipt(rawIntent);
  const bound = receipt && receipt.proposalId === proposalId && receiptBindsToTarget(receipt, targetClient)
    && (!expectedIntentId || receipt.intentId === expectedIntentId);
  if (bound && receipt.state === 'verified') {
    return { kind: 'verified', receipt };
  }
  if (!bound || receipt.state !== 'committed_unverified' || !receipt.committedAt) {
    return { kind: 'commit_unknown', intentId: expectedIntentId ?? null, proposalId };
  }
  return {
    kind: 'committed_unverified',
    receipt,
    intentId: receipt?.intentId ?? intentId,
    proposalId,
  };
}

/** Error path: bounded recovery codes vs pre-effect failures vs honest unknown. */
export function classifyWorkoutApprovalError(
  err: unknown,
  proposalId: string,
): CoachWorkoutOutcome {
  if (err instanceof PlaudApiError) {
    const details = (err.details ?? {}) as Record<string, unknown>;
    const bodyIntentId = safeId(details.intentId);
    const bodyProposalId = safeId(details.proposalId) ?? proposalId;
    if (err.code === 'WORKOUT_RESULT_UNAVAILABLE') {
      return { kind: 'result_unavailable', intentId: bodyIntentId, proposalId: bodyProposalId };
    }
    if (err.code === 'WORKOUT_COMMIT_UNKNOWN') {
      return { kind: 'commit_unknown', intentId: bodyIntentId, proposalId: bodyProposalId };
    }
    if (err.status === 401 || err.status === 403 || err.code === 'CLIENT_ACCESS_DENIED') {
      return { kind: 'lookup_denied', intentId: null, proposalId };
    }
    if (PRE_EFFECT_APPROVAL_CODES.has(err.code) || ['DUPLICATE_DATE','VALIDATION_ERROR'].includes(err.code)) {
      // Definitive pre-effect failure: the draft stays editable, specific safe copy.
      return { kind: 'pre_effect_failed', code: err.code, message: err.message };
    }
    return { kind: 'commit_unknown', intentId: null, proposalId };
  }
  // Dropped response (network): honest uncertainty, identity retained.
  return { kind: 'commit_unknown', intentId: null, proposalId };
}

const SCOPE_PREFIXES = [
  ['/dashboard/client/', 'client'],
  ['/dashboard/trainer/', 'trainer'],
  ['/dashboard/admin/', 'admin'],
] as const;

export type WorkoutRecordScope = 'client' | 'trainer' | 'admin' | 'unknown';

export function workoutRecordScope(pathname: string | null | undefined): WorkoutRecordScope {
  const path = typeof pathname === 'string' ? pathname : '';
  for (const [prefix, scope] of SCOPE_PREFIXES) {
    if (path.includes(prefix)) return scope;
  }
  return 'unknown';
}

const WORKOUT_RECORD_KINDS = new Set(['daily_workout_form', 'workout_session', 'workout_log']);

/**
 * Record navigation is derived from receipt kinds + the current dashboard
 * scope — never from response-provided URLs. No receipt, no target and an
 * unknown scope all yield null (honest uncertainty, no link).
 */
export function workoutRecordRoute(
  receipt: CoachWorkoutReceipt,
  scope: WorkoutRecordScope,
): string | null {
  const hasWorkoutRef = receipt.recordRefs.some((ref) => WORKOUT_RECORD_KINDS.has(ref.kind));
  const target = receipt.targetUserId;
  if (!hasWorkoutRef && target == null) return null;
  if (scope === 'trainer') {
    return target != null ? `/dashboard/trainer/log-workout?clientId=${target}` : '/dashboard/trainer/log-workout';
  }
  if (scope === 'admin') {
    return target != null ? `/dashboard/admin/client-management?clientId=${target}` : '/dashboard/admin/client-management';
  }
  if (scope === 'client') {
    return '/dashboard/client/workouts';
  }
  return null;
}
