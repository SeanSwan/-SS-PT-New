/** Existing proposal detail/reject protocol, coordinated with the durable intent.
 * Mutations lock intent before proposal and authority. No workout dispatch here.
 * Reopening a committed proposal only reads its authorized receipt.
 */
import { loadOwnedProposal, mapProposalRow, updateProposalStatus, publishProposalStatus } from './coachActionProposalPersistenceService.mjs';
import { decryptProposalPayload, sanitizeProposalDetail } from './coachActionProposalDetailService.mjs';
import { createProposalReviewToken, PROPOSAL_REVIEW_TTL_MS } from './coachProposalReviewTokenService.mjs';
import { toPublicCoachIntent } from './coachIntentService.mjs';
import { assertWorkoutIntentAccess, assertWorkoutIntentInput, loadWorkoutIntent, updateWorkoutIntent,
  readWorkoutIntentResult, intentFailure, isVerifiedWorkoutProposal } from './coachWorkoutIntentService.mjs';

const failure = error => ({ status: error.statusCode || 503,
  body: { success: false, code: error.statusCode ? error.code : 'WORKOUT_INTENT_UNAVAILABLE' } });
async function locked({ id, req, db, transaction }) {
  const intent = await loadWorkoutIntent({ id, req, db, transaction });
  const row = await loadOwnedProposal({ id, userId: req.user.id, db, transaction, lock: true });
  if (!isVerifiedWorkoutProposal(row)) throw intentFailure('PROPOSAL_NOT_FOUND', 404);
  await assertWorkoutIntentAccess({ intent, req, transaction });
  const proposal = decryptProposalPayload(row);
  assertWorkoutIntentInput(intent, proposal);
  return { intent, row, proposal };
}
export async function reviewWorkoutIntentProposal({ id, req, db }) {
  try {
    const result = await db.transaction(async transaction => {
      let { intent, row, proposal } = await locked({ id, req, db, transaction });
      let reviewToken = null;
      if (row.status === 'PENDING') {
        if (!['drafted', 'awaiting_approval'].includes(intent.status)) throw intentFailure('PROPOSAL_NOT_PENDING');
        const now = Date.now();
        reviewToken = createProposalReviewToken({ row, userId: req.user.id, now });
        if (!reviewToken) throw intentFailure('PROPOSAL_REVIEW_TOKEN_UNAVAILABLE', 503);
        intent = await updateWorkoutIntent({ db, intent, transaction, values: { status: 'awaiting_approval',
          operationId: id, expiresAt: new Date(now + PROPOSAL_REVIEW_TTL_MS) } });
      }
      return { row, proposal, reviewToken, intent: toPublicCoachIntent(intent) };
    });
    if (result.row.status === 'APPLIED') result.intent = await readWorkoutIntentResult({ id, req, db });
    return { status: 200, body: { success: true, proposal: { ...mapProposalRow(result.row),
      detail: sanitizeProposalDetail(result), reviewToken: result.reviewToken, intent: result.intent } } };
  } catch (error) { return failure(error); }
}
export async function rejectWorkoutIntentProposal({ id, req, db }) {
  try {
    const result = await db.transaction(async transaction => {
      const { intent, row } = await locked({ id, req, db, transaction });
      if (row.status !== 'PENDING' || !['drafted', 'awaiting_approval'].includes(intent.status))
        throw intentFailure('PROPOSAL_NOT_PENDING');
      const updated = await updateProposalStatus({ id, userId: req.user.id, fromStatus: 'PENDING', status: 'REJECTED', db, transaction });
      if (!updated) throw intentFailure('PROPOSAL_NOT_PENDING');
      const cancelled = await updateWorkoutIntent({ db, intent, transaction, values: { status: 'cancelled',
        errorCode: 'CANCELLED_BY_USER', completedAt: new Date(), committedAt: null, verifiedAt: null } });
      return { proposal: updated, intent: toPublicCoachIntent(cancelled) };
    });
    await publishProposalStatus({ id, userId: req.user.id, db });
    return { status: 200, body: { success: true, ...result } };
  } catch (error) { return failure(error); }
}
