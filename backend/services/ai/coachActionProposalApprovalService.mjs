/**
 * coachActionProposalApprovalService.mjs
 * ======================================
 * Deterministic approval executor for Swan Coach action proposals.
 */
import sequelize from '../../database.mjs';
import { createClientFromCoachOnboardingProposal } from '../coachClientOnboardingApprovalService.mjs';
import { ensureClientAccess } from '../../utils/clientAccess.mjs';
import { processAIDataUpdates } from '../aiDataWriteService.mjs';
import {
  submitAiWorkoutLogAsDailyForm,
  AiWorkoutDailyFormError,
} from '../workout/aiWorkoutDailyFormService.mjs';
import { COACH_PROPOSAL_STATUS, COACH_PROPOSAL_TYPE } from './coachActionProposalService.mjs';
import {
  decryptProposalPayload,
  sanitizeProposalDetail,
} from './coachActionProposalDetailService.mjs';
import { approveNonWriteCoachProposal } from './coachSplitPlanApprovalService.mjs';
import {
  claimPendingProposal,
  loadOwnedProposal,
  mapProposalRow,
  proposalNotPending,
  updateProposalStatus,
} from './coachActionProposalPersistenceService.mjs';
import {
  createProposalReviewToken,
  verifyProposalReviewToken,
} from './coachProposalReviewTokenService.mjs';
import { buildCoachProposalApplyErrorBody } from './coachActionProposalErrorPresenter.mjs';

function normalizeClarificationAnswer(answer) {
  return typeof answer === 'string' ? answer.trim() : '';
}

function parseProposalClientId(...candidates) {
  for (const value of candidates) {
    if (value === null || value === undefined || value === '') continue;

    if (typeof value === 'number') {
      return Number.isSafeInteger(value) && value > 0 ? value : null;
    }

    if (typeof value !== 'string') return null;

    if (!/^[1-9]\d*$/.test(value)) return null;

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
}

function invalidProposalClientId() {
  return {
    status: 400,
    body: {
      success: false,
      code: 'PROPOSAL_INVALID_CLIENT_ID',
      error: 'Coach proposal client ID is invalid. Prepare a new draft review.',
    },
  };
}

function getClarificationOptions(proposal) {
  const options = proposal?.payload?.options;
  return Array.isArray(options)
    ? options.map((option) => normalizeClarificationAnswer(option)).filter(Boolean)
    : [];
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
        reviewToken: createProposalReviewToken({ row, userId: req.user.id }),
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
  const reviewCheck = verifyProposalReviewToken({
    token: req.body?.reviewToken,
    row,
    userId: req.user.id,
  });
  if (!reviewCheck.ok) {
    return {
      status: reviewCheck.code === 'PROPOSAL_REVIEW_TOKEN_UNAVAILABLE' ? 503 : 428,
      body: {
        success: false,
        code: reviewCheck.code,
        error: 'Review proposal details before approving this action.',
      },
    };
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
      return { status: 400, body: buildCoachProposalApplyErrorBody({ kind: 'onboarding', code }) };
    }
  }

  if (row.proposal_type === COACH_PROPOSAL_TYPE.CLIENT_DATA_UPDATE) {
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
  const clientId = parseProposalClientId(payload.clientId, proposal.targetUserId);
  if (!clientId) return invalidProposalClientId();
  const access = await ensureClientAccess(req, clientId);
  if (!access.allowed) {
    return { status: access.status, body: { success: false, code: 'CLIENT_ACCESS_DENIED', error: access.message } };
  }

  try {
    if (!await claimPendingProposal({ id, userId: req.user.id, db })) return proposalNotPending();
    const workout = await submitAiWorkoutLogAsDailyForm({
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
    const code = err instanceof AiWorkoutDailyFormError ? err.code : 'WORKOUT_APPLY_FAILED';
    await updateProposalStatus({ id, status: COACH_PROPOSAL_STATUS.FAILED, errorCode: code, db });
    return { status: 400, body: buildCoachProposalApplyErrorBody({ kind: 'workout', code }) };
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
