/**
 * coachActionProposalApprovalService.mjs
 * ======================================
 * Deterministic approval executor for Swan Coach action proposals.
 */
import sequelize from '../../database.mjs';
import { createClientFromCoachOnboardingProposal } from '../coachClientOnboardingApprovalService.mjs';
import { ensureClientAccess } from '../../utils/clientAccess.mjs';
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
import { approveClientDataUpdateProposal } from './coachClientDataUpdateApprovalService.mjs';
import { approveNutritionLogProposal } from './coachNutritionProposalApprovalService.mjs';
import { approveClientProfileCoverageUpdateProposal } from './coachClientProfileCoverageUpdateApprovalService.mjs';
import {
  invalidProposalClientId,
  parseProposalClientId,
} from './coachActionProposalApprovalClientId.mjs';

function normalizeClarificationAnswer(answer) {
  return typeof answer === 'string' ? answer.trim() : '';
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
        result: {
          client: clientResult.client,
          accessHandoff: clientResult.accessHandoff,
          invitationStatus: clientResult.invitationStatus,
          onboardingFieldLedger: clientResult.onboardingFieldLedger,
          onboardingMissingFields: clientResult.onboardingMissingFields,
        },
        db,
      });
      return {
        status: 200,
        body: {
          success: true,
          proposal: updated,
          applied: true,
          client: clientResult.client,
          accessHandoff: clientResult.accessHandoff,
          onboardingFieldLedger: clientResult.onboardingFieldLedger,
          onboardingMissingFields: clientResult.onboardingMissingFields,
        },
      };
    } catch (err) {
      const code = err.code || 'ONBOARDING_APPLY_FAILED';
      await updateProposalStatus({ id, status: COACH_PROPOSAL_STATUS.FAILED, errorCode: code, db });
      return { status: 400, body: buildCoachProposalApplyErrorBody({ kind: 'onboarding', code }) };
    }
  }

  if (row.proposal_type === COACH_PROPOSAL_TYPE.CLIENT_PROFILE_COVERAGE_UPDATE) {
    return approveClientProfileCoverageUpdateProposal({
      id,
      req,
      proposal,
      db,
      parseProposalClientId,
      invalidProposalClientId,
      claimPendingProposal,
      proposalNotPending,
      updateProposalStatus,
    });
  }
  if (row.proposal_type === COACH_PROPOSAL_TYPE.CLIENT_DATA_UPDATE) {
    return approveClientDataUpdateProposal({
      id, req, proposal, db, parseProposalClientId, invalidProposalClientId,
      claimPendingProposal, proposalNotPending, updateProposalStatus,
    });
  }

  if (row.proposal_type === COACH_PROPOSAL_TYPE.NUTRITION_LOG) {
    return approveNutritionLogProposal({
      id,
      req,
      proposal,
      db,
      parseProposalClientId,
      invalidProposalClientId,
      claimPendingProposal,
      proposalNotPending,
      updateProposalStatus,
    });
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
      plannedAssignment: payload.plannedAssignment,
      scheduledSessionId: payload.scheduledSessionId,
      source: payload.source,
      trainerId: req.user.id,
      userRole: req.user.role,
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
