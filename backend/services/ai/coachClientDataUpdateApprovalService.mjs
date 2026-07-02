/**
 * coachClientDataUpdateApprovalService.mjs
 * ========================================
 * Approval adapter for legacy client data update proposals.
 */
import { ensureClientAccess } from '../../utils/clientAccess.mjs';
import { processAIDataUpdates } from '../aiDataWriteService.mjs';
import { COACH_PROPOSAL_STATUS } from './coachActionProposalService.mjs';

const UNSUPPORTED_UPDATE_TYPES = new Set(['save_workout_plan']);

function normalizeUpdateType(update) {
  return typeof update?.type === 'string' ? update.type.trim().toLowerCase() : '';
}

function findUnsupportedUpdate(updates) {
  return updates.find((update) => UNSUPPORTED_UPDATE_TYPES.has(normalizeUpdateType(update))) || null;
}

export async function approveClientDataUpdateProposal({
  id,
  req,
  proposal,
  db,
  parseProposalClientId,
  invalidProposalClientId,
  claimPendingProposal,
  proposalNotPending,
  updateProposalStatus,
}) {
  const payload = proposal.payload || {};
  const clientId = parseProposalClientId(payload.targetUserId, proposal.targetUserId, payload.clientId);
  if (!clientId) return invalidProposalClientId();

  const access = await ensureClientAccess(req, clientId);
  if (!access.allowed) {
    return { status: access.status, body: { success: false, code: 'CLIENT_ACCESS_DENIED', error: access.message } };
  }

  const updates = Array.isArray(payload.updates) ? payload.updates : [];
  if (updates.length === 0) {
    if (!await claimPendingProposal({ id, userId: req.user.id, db })) return proposalNotPending();
    const updated = await updateProposalStatus({
      id,
      status: COACH_PROPOSAL_STATUS.FAILED,
      result: { updates: { successful: 0, errors: ['No client updates supplied.'] } },
      errorCode: 'CLIENT_DATA_UPDATE_EMPTY',
      db,
    });
    return {
      status: 400,
      body: {
        success: false,
        code: 'CLIENT_DATA_UPDATE_EMPTY',
        error: 'Client data update proposal has no updates to apply.',
        proposal: updated,
      },
    };
  }

  if (!await claimPendingProposal({ id, userId: req.user.id, db })) return proposalNotPending();

  const unsupportedUpdate = findUnsupportedUpdate(updates);
  if (unsupportedUpdate) {
    const updateType = normalizeUpdateType(unsupportedUpdate);
    const message = 'Workout plan saves must use the workout planner approval flow.';
    const result = {
      successful: 0,
      errors: [{ type: updateType, code: 'UNSUPPORTED_CLIENT_DATA_UPDATE_TYPE', message }],
    };
    const updated = await updateProposalStatus({
      id,
      status: COACH_PROPOSAL_STATUS.FAILED,
      result: { updates: result },
      errorCode: 'CLIENT_DATA_UPDATE_UNSUPPORTED_TYPE',
      db,
    });
    return {
      status: 400,
      body: {
        success: false,
        code: 'CLIENT_DATA_UPDATE_UNSUPPORTED_TYPE',
        error: message,
        proposal: updated,
        updates: result,
      },
    };
  }

  const result = await processAIDataUpdates(access.clientId, updates, req.user.id, db);
  const status = result.errors?.length > 0 && result.successful === 0
    ? COACH_PROPOSAL_STATUS.FAILED
    : COACH_PROPOSAL_STATUS.APPLIED;
  const updated = await updateProposalStatus({
    id,
    status,
    result: { updates: result },
    errorCode: status === COACH_PROPOSAL_STATUS.FAILED ? 'CLIENT_DATA_UPDATE_FAILED' : null,
    db,
  });
  return {
    status: status === COACH_PROPOSAL_STATUS.FAILED ? 400 : 200,
    body: {
      success: status === COACH_PROPOSAL_STATUS.APPLIED,
      proposal: updated,
      applied: status === COACH_PROPOSAL_STATUS.APPLIED,
      partial: result.errors?.length > 0 && result.successful > 0,
      updates: result,
    },
  };
}
