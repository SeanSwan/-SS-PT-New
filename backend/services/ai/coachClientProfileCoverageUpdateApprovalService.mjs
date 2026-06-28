/**
 * coachClientProfileCoverageUpdateApprovalService.mjs
 * ===================================================
 * Approval adapter for existing-client profile and onboarding coverage updates.
 */
import { ensureClientAccess } from '../../utils/clientAccess.mjs';
import { COACH_PROPOSAL_STATUS } from './coachActionProposalService.mjs';
import { applyClientProfileCoverageUpdate } from '../clientProfileCoverageUpdateService.mjs';
import { createNotification } from '../../controllers/notificationController.mjs';

export async function approveClientProfileCoverageUpdateProposal({
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
  const clientId = parseProposalClientId(payload.clientId, payload.targetUserId, proposal.targetUserId);
  if (!clientId) return invalidProposalClientId();

  const access = await ensureClientAccess(req, clientId);
  if (!access.allowed) {
    return { status: access.status, body: { success: false, code: 'CLIENT_ACCESS_DENIED', error: access.message } };
  }

  if (!await claimPendingProposal({ id, userId: req.user.id, db })) return proposalNotPending();

  let update;
  try {
    update = await applyClientProfileCoverageUpdate({
      clientId: access.clientId,
      actorId: req.user.id,
      payload,
      proposalId: id,
      createNotificationFn: createNotification,
      db,
    });
  } catch (err) {
    const code = err.code || 'PROFILE_COVERAGE_UPDATE_FAILED';
    await updateProposalStatus({ id, status: COACH_PROPOSAL_STATUS.FAILED, errorCode: code, db }).catch(() => {});
    return {
      status: 400,
      body: {
        success: false,
        code,
        error: 'Client profile coverage update could not be applied.',
      },
    };
  }

  let updated = null;
  try {
    updated = await updateProposalStatus({
      id,
      status: COACH_PROPOSAL_STATUS.APPLIED,
      result: { profileCoverageUpdate: update },
      db,
    });
  } catch {
    /* write committed; only the proposal status sync degraded */
  }

  return {
    status: 200,
    body: {
      success: true,
      proposal: updated,
      applied: true,
      profileCoverageUpdate: update,
      statusSync: updated ? 'ok' : 'degraded',
    },
  };
}