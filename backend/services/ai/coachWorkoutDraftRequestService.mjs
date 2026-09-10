/**
 * SCU G03 / S3 — staff workout-draft request service.
 *
 * One task UUID scoped to the authenticated actor ID + selected target ID, and a
 * stable draft requestKey that arrives BEFORE submit. Same actor+key+hash returns
 * the same prepared proposal (transport retry / duplicate); a changed hash is a
 * semantic edit on a reused key (409 — new drafts mint a new key, per 31/13);
 * the race loser recovers the authorized winning record. The actor comes from
 * auth, never the body. Task metadata rides in the encrypted reviewed input.
 *
 * Reuses the shared persistence/coordinator (coachWorkoutIntentDraftService) —
 * no second save service. The in-transaction dedupe is the verdict owner: this
 * service canonicalizes the payload IDENTICALLY to the shared path so both sides
 * hash the same reviewed input, then forwards the shared verdict (idempotent /
 * recovered / 409) without re-deriving it. Entry is gated by
 * COACH_VERIFIED_WORKOUTS_ENABLED with no legacy fallback; the AI-generated path
 * keeps minting fresh proposal UUIDs.
 */
import {
  COACH_PROPOSAL_TYPE,
  createCoachActionProposalDraft,
} from './coachActionProposalService.mjs';
import { verifiedWorkoutsEnabled } from './coachWorkoutIntentService.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (code, statusCode) => Object.assign(new Error(code), { code, statusCode });

// Model-visible authority/proof fields: the body must not certify verification,
// state, or a post-save fingerprint of its own (AR04/AR05).
const UNKNOWN_AUTHORITY = ['expectedHash', 'expectedFootprint', 'proofVersion', 'state', 'verified', 'status', 'intentId', 'result', 'errorCode'];
const WORKOUT_KEYS = ['clientId', 'date', 'title', 'notes', 'duration', 'intensity', 'source', 'exercises'];

function failUnless(condition, code, statusCode) {
  if (!condition) throw fail(code, statusCode);
}

export function validateWorkoutDraftBody(body, targetUserId) {
  const workout = body?.workout;
  failUnless(body && typeof body === 'object' && !Array.isArray(body), 'WORKOUT_DRAFT_WORKOUT', 400);
  failUnless(body.schemaVersion === 1, 'WORKOUT_DRAFT_SCHEMA_VERSION', 400);
  failUnless(typeof body.taskId === 'string' && UUID.test(body.taskId), 'WORKOUT_DRAFT_TASK_ID', 400);
  failUnless(typeof body.requestKey === 'string' && UUID.test(body.requestKey), 'WORKOUT_DRAFT_REQUEST_KEY', 400);
  failUnless(Number.isSafeInteger(body.draftRevision) && body.draftRevision >= 0, 'WORKOUT_DRAFT_DRAFT_REVISION', 400);
  const target = typeof targetUserId === 'number' ? targetUserId : null;
  failUnless(target != null && Number.isSafeInteger(target) && target > 0, 'WORKOUT_DRAFT_TARGET', 400);
  failUnless(workout && typeof workout === 'object' && !Array.isArray(workout), 'WORKOUT_DRAFT_WORKOUT', 400);
  const envelopeKeys = ['schemaVersion', 'taskId', 'requestKey', 'draftRevision', 'targetUserId', 'workout'];
  failUnless(Object.keys(body).every(key => envelopeKeys.includes(key)), 'WORKOUT_DRAFT_UNKNOWN_AUTHORITY', 400);
  failUnless(workout.clientId === undefined || workout.clientId === target, 'WORKOUT_DRAFT_TARGET', 400);
  for (const key of Object.keys(workout)) {
    failUnless(UNKNOWN_AUTHORITY.includes(key) === false, 'WORKOUT_DRAFT_UNKNOWN_AUTHORITY', 400);
    failUnless(WORKOUT_KEYS.includes(key), 'WORKOUT_DRAFT_WORKOUT', 400);
  }
  return target;
}

async function ensureClientAccessChecked(user, targetUserId) {
  const { ensureClientAccess } = await import('../../utils/clientAccess.mjs');
  try {
    return await ensureClientAccess({ user }, targetUserId, {});
  } catch {
    return { allowed: false };
  }
}

function buildWorkoutDraftSummary(payload) {
  const exercises = Array.isArray(payload.exercises) ? payload.exercises : [];
  return {
    title: 'Review workout log draft',
    actionRequired: 'Approve before any record changes are applied.',
    confirmationMode: 'trainer_approval_required',
    evidenceCount: 0,
    safetyFlagCount: 0,
    clientId: payload.clientId,
    date: payload.date || null,
    exerciseCount: exercises.length,
  };
}

export async function createWorkoutDraftRequest({ user, body, db }) {
  failUnless(db?.models?.CoachIntent, 'WORKOUT_INTENT_UNAVAILABLE', 503);
  const targetUserId = validateWorkoutDraftBody(body, body?.targetUserId);
  failUnless(verifiedWorkoutsEnabled(), 'WORKOUT_INTENT_ENTRY_DISABLED', 503);
  failUnless(typeof body.workout.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.workout.date)
    && Number.isFinite(Date.parse(body.workout.date))
    && new Date(body.workout.date).toISOString().slice(0, 10) === body.workout.date, 'WORKOUT_DRAFT_WORKOUT', 400);
  failUnless(Array.isArray(body.workout.exercises) && body.workout.exercises.length > 0, 'WORKOUT_DRAFT_EXERCISES', 400);
  // Task metadata rides in the encrypted reviewed input (R6).
  const reviewedPayload = {
    ...body.workout,
    clientId: targetUserId,
    taskId: body.taskId,
    draftRevision: body.draftRevision,
  };

  // Access is checked outside the write transaction, mirroring the AI path
  // (assertWorkoutIntentAccess -> ensureClientAccess).
  const access = await ensureClientAccessChecked(user, targetUserId);
  if (!access.allowed) throw fail('CLIENT_ACCESS_DENIED', 403);

  const requestKey = body.requestKey;

  const persisted = await createCoachActionProposalDraft({
    type: COACH_PROPOSAL_TYPE.WORKOUT_LOG,
    payload: reviewedPayload,
    summary: buildWorkoutDraftSummary(reviewedPayload),
    user,
    conversation: { targetUserId },
    sourceMessageId: body.taskId,
    db,
    requestKey,
  });

  // The shared coordinator is the verdict owner: in-transaction dedupe returns
  // idempotent/recovered flags (or 409 WORKOUT_DRAFT_HASH_MISMATCH), and the
  // fresh-create path stamps intentId on the returned record.
  return {
    status: 200,
    intentId: persisted?.intentId ?? null,
    proposalId: persisted?.id ?? null,
    idempotent: persisted?.idempotent === true,
    recovered: persisted?.recovered === true,
  };
}
