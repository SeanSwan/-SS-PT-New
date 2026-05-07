/**
 * coachActionProposalDetailService.mjs
 * ====================================
 * Sanitizes Coach proposal review details before they reach the UI.
 */
import { decryptPayload } from '../plaudCipherService.mjs';
import { summarizeOnboardingDraftForReview } from '../coachClientOnboardingApprovalService.mjs';
import { COACH_PROPOSAL_TYPE } from './coachActionProposalService.mjs';
import { sanitizeSplitCandidate } from './coachSplitPlanApprovalService.mjs';

const SAFE_REF_PATTERN = /^[A-Za-z0-9:_./-]{1,80}$/;
const SAFE_FLAG_PATTERN = /^[A-Za-z0-9:_-]{1,80}$/;

function sanitizeTokenList(value, pattern, fallbackPrefix) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item, index) => {
    const text = String(item || '').trim();
    return pattern.test(text) ? text : `${fallbackPrefix}_${index + 1}`;
  });
}

function approvalGateFromProposal(proposal) {
  const meta = proposal?.payload?.proposalMeta || {};
  return {
    confirmationMode: 'trainer_approval_required',
    evidenceRefs: sanitizeTokenList(meta.evidenceRefs, SAFE_REF_PATTERN, 'evidence_ref'),
    safetyFlags: sanitizeTokenList(meta.safetyFlags, SAFE_FLAG_PATTERN, 'safety_flag'),
    writer: 'deterministic',
  };
}

function withApprovalGate(proposal, detail) {
  return {
    ...detail,
    approvalGate: approvalGateFromProposal(proposal),
  };
}

export function decryptProposalPayload(row) {
  return decryptPayload({
    cipher: row.proposal_cipher,
    iv: row.proposal_iv,
    tag: row.proposal_tag,
    keyId: row.cipher_key_id,
  });
}

export function sanitizeProposalDetail({ row, proposal }) {
  const payload = proposal.payload || {};
  if (row.proposal_type === COACH_PROPOSAL_TYPE.CLIENT_ONBOARDING) {
    try {
      return withApprovalGate(proposal, summarizeOnboardingDraftForReview(proposal));
    } catch (err) {
      return withApprovalGate(proposal, {
        client: {},
        errorCode: err.code || 'ONBOARDING_DETAIL_UNAVAILABLE',
        error: err.message,
      });
    }
  }
  if (row.proposal_type === COACH_PROPOSAL_TYPE.WORKOUT_LOG) {
    return withApprovalGate(proposal, {
      workout: {
        clientId: Number(payload.clientId || proposal.targetUserId || 0) || null,
        date: payload.date || null,
        title: payload.title || null,
        notes: payload.notes || null,
        duration: payload.duration || null,
        intensity: payload.intensity || null,
        exercises: Array.isArray(payload.exercises) ? payload.exercises : [],
      },
    });
  }
  if (row.proposal_type === COACH_PROPOSAL_TYPE.CLIENT_DATA_UPDATE) {
    return withApprovalGate(proposal, {
      clientDataUpdate: {
        clientId: Number(payload.targetUserId || proposal.targetUserId || 0) || null,
        updateCount: Array.isArray(payload.updates) ? payload.updates.length : 0,
        updates: Array.isArray(payload.updates) ? payload.updates : [],
      },
    });
  }
  if (row.proposal_type === COACH_PROPOSAL_TYPE.CLARIFICATION) {
    return withApprovalGate(proposal, {
      clarification: {
        question: payload.question || null,
        options: Array.isArray(payload.options) ? payload.options : [],
      },
    });
  }
  if (row.proposal_type === COACH_PROPOSAL_TYPE.SPLIT_PLAN) {
    const splits = Array.isArray(payload.splits) ? payload.splits : [];
    return withApprovalGate(proposal, {
      splitPlan: {
        splitCount: splits.length,
        splits: splits.map(sanitizeSplitCandidate),
      },
    });
  }
  return withApprovalGate(proposal, {
    frontendAction: {
      event: payload.event || null,
      payload: payload.payload || {},
    },
  });
}
