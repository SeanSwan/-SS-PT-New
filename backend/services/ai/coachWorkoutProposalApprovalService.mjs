/**
 * Canonical workout proposal transaction adapter.
 * Review/access/claim run before domain writes; APPLIED shares the writer's
 * commit. This is internal orchestration, never a request-supplied callback.
 * V2 opts into durable intent callbacks; a successful save is not read-back proof.
 */
import { ensureClientAccess } from '../../utils/clientAccess.mjs';
import { submitAiWorkoutLogAsDailyForm, AiWorkoutDailyFormError } from '../workout/aiWorkoutDailyFormService.mjs';
import { claimPendingProposal, loadOwnedProposal, updateProposalStatus, publishProposalStatus } from './coachActionProposalPersistenceService.mjs';
import { verifyProposalReviewToken } from './coachProposalReviewTokenService.mjs';
import { parseProposalClientId, invalidProposalClientId } from './coachActionProposalApprovalClientId.mjs';
import { buildCoachProposalApplyErrorBody } from './coachActionProposalErrorPresenter.mjs';
import { loadWorkoutIntent, assertWorkoutIntentInput, startWorkoutIntent, commitWorkoutIntent,
  readWorkoutIntentResult, isVerifiedWorkoutProposal } from './coachWorkoutIntentService.mjs';

const refusal = (code, statusCode) => Object.assign(new Error(code), { code, statusCode });
const TRANSACTION_REFUSALS = new Set([
  'PROPOSAL_NOT_PENDING', 'PROPOSAL_NOT_FOUND', 'PROPOSAL_DETAIL_REVIEW_REQUIRED',
  'PROPOSAL_REVIEW_TOKEN_UNAVAILABLE', 'CLIENT_ACCESS_DENIED',
]);

export async function approveWorkoutProposal({ id, req, proposal, db, row, verified = false }) {
  const payload = proposal.payload || {};
  const clientId = parseProposalClientId(payload.clientId, proposal.targetUserId);
  if (!clientId) return invalidProposalClientId();
  if (!['admin', 'trainer'].includes(req.user?.role))
    return { status: 403, body: { success: false, code: 'CLIENT_ACCESS_DENIED' } };
  const access = await ensureClientAccess(req, clientId);
  if (!access.allowed)
    return { status: access.status, body: { success: false, code: 'CLIENT_ACCESS_DENIED', error: access.message } };
  let updated, intent, saveCommitted = verified && row?.status === 'APPLIED';
  const existingResult = async () => ({ status: 200, body: { success: true, applied: true,
    duplicate: true, intent: await readWorkoutIntentResult({ id, req, db }) } });
  try {
    if (verified && row?.status === 'APPLIED') return await existingResult();
    const workout = await submitAiWorkoutLogAsDailyForm({
      clientId, exercises: payload.exercises, date: payload.date, notes: payload.notes,
      title: payload.title, duration: payload.duration, intensity: payload.intensity,
      plannedAssignment: payload.plannedAssignment, scheduledSessionId: payload.scheduledSessionId,
      source: payload.source, trainerId: req.user.id, userRole: req.user.role, sequelize: db,
      ...(verified ? { coachIntent: { proofVersion: 2 } } : {}),
      beforeWrite: async ({ transaction, models }) => {
        if (verified) intent = await loadWorkoutIntent({ id, req, db, transaction });
        const current = await loadOwnedProposal({ id, userId: req.user.id, db, transaction, lock: true });
        if (!current || Number(current.created_by_user_id) !== Number(req.user.id))
          throw refusal('PROPOSAL_NOT_FOUND', 404);
        if (verified) assertWorkoutIntentInput(intent, proposal);
        if (isVerifiedWorkoutProposal(current) !== verified) throw refusal('INTENT_BINDING_CONFLICT', 409);
        if (verified && current.status === 'APPLIED' && ['committed_unverified', 'verified'].includes(intent.status))
          throw refusal('INTENT_ALREADY_COMMITTED', 409);
        if (current.status !== 'PENDING' || current.proposal_type !== 'workout_log')
          throw refusal('PROPOSAL_NOT_PENDING', 409);
        const freshAccess = await ensureClientAccess(req, clientId, { transaction });
        if (!freshAccess.allowed || Number(freshAccess.clientId) !== clientId)
          throw refusal('CLIENT_ACCESS_DENIED', 403);
        // Locks may wait; validate token expiry after both authority rows are held.
        const review = verifyProposalReviewToken({ token: req.body?.reviewToken, row: current, userId: req.user.id });
        if (!review.ok) throw refusal(review.code, review.code === 'PROPOSAL_REVIEW_TOKEN_UNAVAILABLE' ? 503 : 428);
        if (verified) {
          intent = await startWorkoutIntent({ db, intent, payload, transaction, models });
          const afterWait = verifyProposalReviewToken({ token: req.body?.reviewToken, row: current, userId: req.user.id });
          if (!afterWait.ok) throw refusal(afterWait.code, afterWait.code === 'PROPOSAL_REVIEW_TOKEN_UNAVAILABLE' ? 503 : 428);
        }
        if (!await claimPendingProposal({ id, userId: req.user.id, db, transaction }))
          throw refusal('PROPOSAL_NOT_PENDING', 409);
      },
      beforeCommit: async ({ transaction, workout: saved, dailyForm, workoutSession, workoutLogs }) => {
        if (!saved?.formId || saved.formId !== dailyForm?.id || saved.sessionId !== workoutSession?.id)
          throw new Error('Canonical workout result is missing its persisted identity');
        updated = await updateProposalStatus({
          id, userId: req.user.id, fromStatus: 'APPLYING', status: 'APPLIED',
          result: { workout: saved, ...(verified ? { intentId: intent.id } : {}) }, db, transaction,
        });
        if (!updated) throw refusal('PROPOSAL_NOT_PENDING', 409);
        if (verified) intent = await commitWorkoutIntent({ db, intent, payload, transaction, dailyForm, workoutSession, workoutLogs });
      },
    });
    saveCommitted = true;
    // Sequelize's afterCommit runs in finally even on a failed COMMIT in the
    // installed version. Publish only after the writer actually returns success.
    await publishProposalStatus({ id, userId: req.user.id, db });
    const receipt = verified ? await readWorkoutIntentResult({ id, req, db }) : null;
    return { status: 200, body: { success: true, proposal: updated, applied: true, workout, ...(receipt ? { intent: receipt } : {}) } };
  } catch (err) {
    if (verified && err.code === 'INTENT_ALREADY_COMMITTED') {
      try { return await existingResult(); }
      catch (failure) { return { status: failure.statusCode || 503, body: { success: false, code: failure.code || 'WORKOUT_INTENT_UNAVAILABLE' } }; }
    }
    // The writer rolled back its claim on pre-commit failure. Never overwrite a
    // competing winner (or a committed workout) with an autocommit FAILED update.
    if (TRANSACTION_REFUSALS.has(err.code))
      return { status: err.statusCode, body: { success: false, code: err.code } };
    if (err.code === 'WORKOUT_COMMIT_UNKNOWN')
      return { status: 503, body: { success: false, code: err.code,
        ...(intent?.id ? { intentId: intent.id } : {}),
        error: 'Save confirmation was interrupted. Check workout history before trying again.' } };
    if (verified && err.statusCode && err.statusCode < 500) return { status: err.statusCode, body: { success: false, code: err.code } };
    if (verified && saveCommitted) return { status: 503, body: { success: false, saved: true,
      code: 'WORKOUT_RESULT_UNAVAILABLE', ...(intent?.id ? { intentId: intent.id } : {}), proposalId: id,
      error: 'Workout saved. Result verification is currently unavailable.' } };
    if (verified && err.statusCode) return { status: err.statusCode, body: { success: false, code: err.code } };
    const code = err instanceof AiWorkoutDailyFormError ? err.code : 'WORKOUT_APPLY_FAILED';
    return { status: 400, body: buildCoachProposalApplyErrorBody({ kind: 'workout', code }) };
  }
}
