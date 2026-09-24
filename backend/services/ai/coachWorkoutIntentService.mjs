/** Durable workout intent coordinator. Internal callbacks only; no request proof.
 * Lock order: intent -> proposal -> User/assignment -> exercise/domain rows.
 * requestHash binds reviewed input; expectedHash certifies actual persisted output.
 * This module never owns the domain transaction or redispatches during recovery.
 */
import { ensureClientAccess } from '../../utils/clientAccess.mjs';
import { hashCoachIntentRequest, reconcileCoachIntent, toPublicCoachIntent } from './coachIntentService.mjs';
import { hashCoachWorkoutExpectation } from './coachIntentEffectProof.mjs';
import { buildCoachWorkoutFootprint, verifyCoachWorkoutReadback } from './coachWorkoutResultVerifier.mjs';
import { resolveCoachWorkoutLibrary } from '../workout/coachWorkoutLibraryResolver.mjs';
import { readCoachWorkoutFootprint, sessionDay, logProjectionMatches } from '../workout/coachWorkoutReadbackService.mjs';
import { stableStringify } from './stableStringify.mjs';
import { loadOwnedProposal } from './coachActionProposalPersistenceService.mjs';
import { decryptProposalPayload } from './coachActionProposalDetailService.mjs';

export const WORKOUT_INTENT_SCHEMA = 'coach-workout-v2';
export const verifiedWorkoutsEnabled = () => process.env.COACH_VERIFIED_WORKOUTS_ENABLED === 'true';
export const isVerifiedWorkoutProposal = row => row?.proposal_type === 'workout_log' && row.schema_version === WORKOUT_INTENT_SCHEMA;
export const intentFailure = (code, statusCode = 409) => Object.assign(new Error(code), { code, statusCode });
export const plainIntent = row => row?.toJSON ? row.toJSON() : row;
export const workoutIntentInputHash = (actorId, targetClientId, payload) => hashCoachIntentRequest({
  commandType: 'log_workout', targetClientId, contextVersion: WORKOUT_INTENT_SCHEMA,
  params: { actorId: Number(actorId), payload },
});
export function workoutIntentModel(db) {
  const model = db?.models?.CoachIntent;
  if (!model?.findOne || !model?.update || !model?.create) throw intentFailure('WORKOUT_INTENT_UNAVAILABLE', 503);
  return model;
}
export async function loadWorkoutIntent({ id, req, db, transaction }) {
  const row = await workoutIntentModel(db).findOne({ where: { proposalId: id, actorId: Number(req.user.id) },
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}) });
  const intent = plainIntent(row);
  if (!intent || intent.proofVersion !== 2 || intent.commandType !== 'log_workout') throw intentFailure('PROPOSAL_NOT_FOUND', 404);
  return intent;
}
export async function assertWorkoutIntentAccess({ intent, req, transaction }) {
  if (!['admin', 'trainer'].includes(req.user?.role) || Number(req.user.id) !== Number(intent.actorId))
    throw intentFailure('PROPOSAL_NOT_FOUND', 404);
  const access = await ensureClientAccess(req, intent.targetClientId, { transaction });
  if (!access.allowed) throw intentFailure('CLIENT_ACCESS_DENIED', 403);
  return access;
}
export function assertWorkoutIntentInput(intent, proposal) {
  const payload = proposal?.payload;
  if (!payload || Number(payload.clientId) !== Number(intent.targetClientId)
    || (proposal.targetUserId != null && Number(proposal.targetUserId) !== Number(intent.targetClientId))
    || workoutIntentInputHash(intent.actorId, intent.targetClientId, payload) !== intent.requestHash)
    throw intentFailure('INTENT_BINDING_CONFLICT');
}
export async function updateWorkoutIntent({ db, intent, values, transaction }) {
  const [count, rows] = await workoutIntentModel(db).update({ ...values, version: intent.version + 1 }, {
    where: { id: intent.id, actorId: intent.actorId, proposalId: intent.proposalId,
      version: intent.version, status: intent.status, requestHash: intent.requestHash }, transaction, returning: true,
  });
  if (count !== 1 || !rows?.[0]) throw intentFailure('INTENT_BINDING_CONFLICT');
  return plainIntent(rows[0]);
}
export async function startWorkoutIntent({ db, intent, payload, transaction, models }) {
  if (['committed_unverified', 'verified'].includes(intent.status)) throw intentFailure('INTENT_ALREADY_COMMITTED');
  if (!verifiedWorkoutsEnabled()) throw intentFailure('WORKOUT_INTENT_ENTRY_DISABLED', 503);
  if (intent.status !== 'awaiting_approval' || !intent.expiresAt || new Date(intent.expiresAt).getTime() <= Date.now())
    throw intentFailure('PROPOSAL_DETAIL_REVIEW_REQUIRED', 428);
  const resolved = await resolveCoachWorkoutLibrary({ Exercise: models.Exercise, exercises: payload.exercises, transaction });
  if (stableStringify(resolved) !== stableStringify(payload.exercises)) throw intentFailure('INTENT_BINDING_CONFLICT');
  if (new Date(intent.expiresAt).getTime() <= Date.now()) throw intentFailure('PROPOSAL_DETAIL_REVIEW_REQUIRED', 428);
  return updateWorkoutIntent({ db, intent, transaction, values: { status: 'executing' } });
}
export async function commitWorkoutIntent({ db, intent, payload, transaction, dailyForm, workoutSession, workoutLogs }) {
  if (!transaction || intent.status !== 'executing') throw intentFailure('INTENT_BINDING_CONFLICT');
  if (!verifiedWorkoutsEnabled()) throw intentFailure('WORKOUT_INTENT_ENTRY_DISABLED', 503);
  const identities = { actorId: intent.actorId, targetClientId: intent.targetClientId,
    dailyFormId: dailyForm.id, sessionId: workoutSession.id };
  const expected = buildCoachWorkoutFootprint({ ...identities, date: payload.date, exercises: payload.exercises });
  const observed = buildCoachWorkoutFootprint({ ...identities, actorId: dailyForm.trainerId,
    targetClientId: dailyForm.clientId, date: dailyForm.date, exercises: dailyForm.formData?.exercises });
  const proof = verifyCoachWorkoutReadback({ expected, observed });
  if (proof.status !== 'verified' || workoutSession.id !== dailyForm.sessionId
    || Number(workoutSession.userId) !== intent.targetClientId || Number(workoutSession.trainerId) !== intent.actorId
    || sessionDay(workoutSession.date) !== payload.date
    || !Array.isArray(workoutLogs) || workoutLogs.length !== proof.realAffectedCount
    || !logProjectionMatches(workoutLogs, dailyForm.formData.exercises, observed.exercises, workoutSession.id))
    throw intentFailure('EXPECTED_FOOTPRINT_INVALID', 400);
  const now = new Date();
  return updateWorkoutIntent({ db, intent, transaction, values: { status: 'committed_unverified',
    expectedHash: hashCoachWorkoutExpectation(expected), expectedFootprint: expected,
    committedAt: now, completedAt: now, result: { recordRefs: proof.recordRefs, realAffectedCount: proof.realAffectedCount } } });
}
// The generic reconciler accepts a model dependency. Guard only its receipt CAS;
// domain reads retain their independent read-only snapshot. Actual proposal locks
// serialize concurrent edits with promotion; callback checks alone cannot do so.
function guardedPromotionModel({ id, req, db, original }) {
  const Model = workoutIntentModel(db);
  return {
    findByPk: (...args) => Model.findByPk(...args),
    update: (values, options) => db.transaction(async transaction => {
      if (values.status !== 'verified') throw intentFailure('INTENT_BINDING_CONFLICT');
      const current = await loadWorkoutIntent({ id, req, db, transaction });
      if (current.id !== options.where.id || current.version !== options.where.version
        || current.status !== options.where.status || current.expectedHash !== options.where.expectedHash
        || current.requestHash !== original.requestHash || current.targetClientId !== original.targetClientId)
        return [0, []];
      const linked = await loadOwnedProposal({ id, userId: req.user.id, db, transaction, lock: true });
      if (!isVerifiedWorkoutProposal(linked)) throw intentFailure('PROPOSAL_NOT_FOUND', 404);
      await assertWorkoutIntentAccess({ intent: current, req, transaction });
      assertWorkoutIntentInput(current, decryptProposalPayload(linked));
      if (hashCoachWorkoutExpectation(current.expectedFootprint) !== current.expectedHash)
        throw intentFailure('INTENT_BINDING_CONFLICT');
      return Model.update(values, { ...options, transaction,
        where: { ...options.where, actorId: current.actorId, proposalId: id, requestHash: original.requestHash } });
    }),
  };
}
export async function readWorkoutIntentResult({ id, req, db }) {
  const intent = await loadWorkoutIntent({ id, req, db });
  await assertWorkoutIntentAccess({ intent, req });
  const proposal = await loadOwnedProposal({ id, userId: req.user.id, db });
  if (!isVerifiedWorkoutProposal(proposal)) throw intentFailure('PROPOSAL_NOT_FOUND', 404);
  assertWorkoutIntentInput(intent, decryptProposalPayload(proposal));
  const authorizeIntent = async row => {
    try {
      if (row.proposalId !== id) return false;
      await assertWorkoutIntentAccess({ intent: row, req });
      // Read-back and its CAS await I/O. Recheck the current immutable proposal
      // binding alongside current access at every reconciliation boundary.
      const linked = await loadOwnedProposal({ id, userId: req.user.id, db });
      if (!isVerifiedWorkoutProposal(linked)) return false;
      assertWorkoutIntentInput(row, decryptProposalPayload(linked));
      return true;
    } catch { return false; }
  };
  const result = await reconcileCoachIntent({ model: guardedPromotionModel({ id, req, db, original: intent }), intentId: intent.id, authorizeIntent,
    readEffect: row => readCoachWorkoutFootprint({ models: { ...db.models, sequelize: db }, footprint: row.expectedFootprint,
      intentId: row.id, requestHash: row.requestHash, proposalId: row.proposalId }) });
  if (!result.intent) throw intentFailure('CLIENT_ACCESS_DENIED', 403);
  return toPublicCoachIntent(result.intent);
}
