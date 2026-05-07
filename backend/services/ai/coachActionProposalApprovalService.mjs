/**
 * coachActionProposalApprovalService.mjs
 * ======================================
 * Deterministic approval executor for Swan Coach action proposals.
 */
import { QueryTypes } from 'sequelize';
import sequelize from '../../database.mjs';
import { createClientFromCoachOnboardingProposal } from '../coachClientOnboardingApprovalService.mjs';
import { ensureClientAccess } from '../../utils/clientAccess.mjs';
import { processAIDataUpdates } from '../aiDataWriteService.mjs';
import { logWorkoutForClient, WorkoutLogError } from '../workout/workoutLogService.mjs';
import { COACH_PROPOSAL_STATUS, COACH_PROPOSAL_TYPE } from './coachActionProposalService.mjs';
import {
  decryptProposalPayload,
  sanitizeProposalDetail,
} from './coachActionProposalDetailService.mjs';
import { approveNonWriteCoachProposal } from './coachSplitPlanApprovalService.mjs';

function mapProposalRow(row) {
  const summary = row.summary_json || {};
  return {
    id: row.id,
    type: row.proposal_type,
    status: row.status,
    title: summary.title || 'Review Coach proposal',
    summary,
    createdAt: row.created_at,
  };
}

async function loadOwnedProposal({ id, userId, db }) {
  const rows = await db.query(
    `SELECT id, created_by_user_id, proposal_type, status, summary_json,
            conversation_id, source_message_id,
            proposal_cipher, proposal_iv, proposal_tag, cipher_key_id
       FROM coach_action_proposals
      WHERE id = :id AND created_by_user_id = :userId
      LIMIT 1`,
    { replacements: { id, userId }, type: QueryTypes.SELECT },
  );
  return rows[0] || null;
}

async function claimPendingProposal({ id, userId, db }) {
  const rows = await db.query(
    `UPDATE coach_action_proposals
        SET status = :claimedStatus,
            updated_at = NOW()
      WHERE id = :id
        AND created_by_user_id = :userId
        AND status = :pendingStatus
      RETURNING id`,
    {
      replacements: { id, userId, claimedStatus: COACH_PROPOSAL_STATUS.APPLYING, pendingStatus: COACH_PROPOSAL_STATUS.PENDING },
      type: QueryTypes.SELECT,
    },
  );
  return !!rows[0];
}

const proposalNotPending = () => ({ status: 409, body: { success: false, code: 'PROPOSAL_NOT_PENDING' } });

function normalizeClarificationAnswer(answer) {
  return typeof answer === 'string' ? answer.trim() : '';
}

function getClarificationOptions(proposal) {
  const options = proposal?.payload?.options;
  return Array.isArray(options)
    ? options.map((option) => normalizeClarificationAnswer(option)).filter(Boolean)
    : [];
}

async function updateProposalStatus({ id, status, result = {}, errorCode = null, userId = null, fromStatus = null, db }) {
  const rows = await db.query(
    `UPDATE coach_action_proposals
        SET status = :status,
            applied_result_json = CAST(:resultJson AS jsonb),
            error_code = :errorCode,
            updated_at = NOW()
      WHERE id = :id
        ${userId == null ? '' : 'AND created_by_user_id = :userId'}
        ${fromStatus == null ? '' : 'AND status = :fromStatus'}
      RETURNING id, proposal_type, status, summary_json, created_at`,
    {
      replacements: {
        id,
        status,
        resultJson: JSON.stringify(result),
        errorCode,
        userId,
        fromStatus,
      },
      type: QueryTypes.SELECT,
    },
  );
  return rows[0] ? mapProposalRow(rows[0]) : null;
}

export async function getCoachActionProposal({ id, req, sequelizeOverride = null }) {
  const db = sequelizeOverride || sequelize;
  const row = await loadOwnedProposal({ id, userId: req.user.id, db });
  if (!row) return { status: 404, body: { success: false, code: 'PROPOSAL_NOT_FOUND' } };
  const proposal = decryptProposalPayload(row);
  return {
    status: 200,
    body: {
      success: true,
      proposal: {
        ...mapProposalRow(row),
        detail: sanitizeProposalDetail({ row, proposal }),
      },
    },
  };
}

export async function approveCoachActionProposal({ id, req, sequelizeOverride = null }) {
  const db = sequelizeOverride || sequelize;
  const row = await loadOwnedProposal({ id, userId: req.user.id, db });
  if (!row) return { status: 404, body: { success: false, code: 'PROPOSAL_NOT_FOUND' } };
  if (row.status !== COACH_PROPOSAL_STATUS.PENDING) {
    return { status: 409, body: { success: false, code: 'PROPOSAL_NOT_PENDING' } };
  }

  const proposal = decryptProposalPayload(row);
  if (row.proposal_type === COACH_PROPOSAL_TYPE.CLIENT_ONBOARDING) {
    if (!await claimPendingProposal({ id, userId: req.user.id, db })) return proposalNotPending();
    try {
      const clientResult = await createClientFromCoachOnboardingProposal({
        proposal,
        req,
        sequelizeOverride: db,
      });
      const updated = await updateProposalStatus({
        id,
        status: COACH_PROPOSAL_STATUS.APPLIED,
        result: { client: clientResult.client, invitationStatus: clientResult.invitationStatus },
        db,
      });
      return {
        status: 200,
        body: { success: true, proposal: updated, applied: true, client: clientResult.client },
      };
    } catch (err) {
      const code = err.code || 'ONBOARDING_APPLY_FAILED';
      await updateProposalStatus({ id, status: COACH_PROPOSAL_STATUS.FAILED, errorCode: code, db });
      return { status: 400, body: { success: false, code, error: err.message } };
    }
  }

  if (row.proposal_type === COACH_PROPOSAL_TYPE.CLIENT_DATA_UPDATE) {
    const payload = proposal.payload || {};
    const clientId = Number(payload.targetUserId || proposal.targetUserId || payload.clientId || 0);
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
    const result = await processAIDataUpdates(
      access.clientId,
      updates,
      req.user.id,
      db,
    );
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

  if (row.proposal_type !== COACH_PROPOSAL_TYPE.WORKOUT_LOG) {
    return approveNonWriteCoachProposal({
      row,
      proposal,
      id,
      userId: req.user.id,
      db,
      req,
      claimPendingProposal,
      updateProposalStatus,
      proposalNotPending,
    });
  }

  const payload = proposal.payload || {};
  const clientId = Number(payload.clientId || proposal.targetUserId || 0);
  const access = await ensureClientAccess(req, clientId);
  if (!access.allowed) {
    return { status: access.status, body: { success: false, code: 'CLIENT_ACCESS_DENIED', error: access.message } };
  }

  try {
    if (!await claimPendingProposal({ id, userId: req.user.id, db })) return proposalNotPending();
    const workout = await logWorkoutForClient({
      clientId: access.clientId,
      exercises: payload.exercises,
      date: payload.date,
      notes: payload.notes,
      title: payload.title,
      duration: payload.duration,
      intensity: payload.intensity,
      trainerId: req.user.id,
      sequelize: db,
    });
    const updated = await updateProposalStatus({
      id,
      status: COACH_PROPOSAL_STATUS.APPLIED,
      result: { workout },
      db,
    });
    return { status: 200, body: { success: true, proposal: updated, applied: true, workout } };
  } catch (err) {
    const code = err instanceof WorkoutLogError ? err.code : 'WORKOUT_APPLY_FAILED';
    await updateProposalStatus({ id, status: COACH_PROPOSAL_STATUS.FAILED, errorCode: code, db });
    return { status: 400, body: { success: false, code, error: err.message } };
  }
}

export async function answerCoachActionProposalClarification({ id, answer, req, sequelizeOverride = null }) {
  const db = sequelizeOverride || sequelize;
  const row = await loadOwnedProposal({ id, userId: req.user.id, db });
  if (!row) return { status: 404, body: { success: false, code: 'PROPOSAL_NOT_FOUND' } };
  if (row.status !== COACH_PROPOSAL_STATUS.PENDING) return proposalNotPending();
  if (row.proposal_type !== COACH_PROPOSAL_TYPE.CLARIFICATION) {
    return { status: 400, body: { success: false, code: 'PROPOSAL_NOT_CLARIFICATION' } };
  }

  const normalizedAnswer = normalizeClarificationAnswer(answer);
  if (!normalizedAnswer || normalizedAnswer.length > 500) {
    return { status: 400, body: { success: false, code: 'CLARIFICATION_ANSWER_INVALID' } };
  }

  const proposal = decryptProposalPayload(row);
  const options = getClarificationOptions(proposal);
  if (options.length > 0 && !options.includes(normalizedAnswer)) {
    return { status: 400, body: { success: false, code: 'CLARIFICATION_ANSWER_OPTION_MISMATCH' } };
  }

  if (!await claimPendingProposal({ id, userId: req.user.id, db })) return proposalNotPending();
  const updated = await updateProposalStatus({
    id, status: COACH_PROPOSAL_STATUS.APPROVED, result: { clarificationAnswer: normalizedAnswer }, db,
  });
  return {
    status: 200,
    body: { success: true, proposal: updated, applied: false, clarificationAnswer: normalizedAnswer },
  };
}

export async function rejectCoachActionProposal({ id, req, sequelizeOverride = null }) {
  const db = sequelizeOverride || sequelize;
  const row = await loadOwnedProposal({ id, userId: req.user.id, db });
  if (!row) return { status: 404, body: { success: false, code: 'PROPOSAL_NOT_FOUND' } };
  if (row.status !== COACH_PROPOSAL_STATUS.PENDING) {
    return { status: 409, body: { success: false, code: 'PROPOSAL_NOT_PENDING' } };
  }
  const updated = await updateProposalStatus({
    id,
    status: COACH_PROPOSAL_STATUS.REJECTED,
    userId: req.user.id,
    fromStatus: COACH_PROPOSAL_STATUS.PENDING,
    db,
  });
  if (!updated) return proposalNotPending();
  return { status: 200, body: { success: true, proposal: updated } };
}
