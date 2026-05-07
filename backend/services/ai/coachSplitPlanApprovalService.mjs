/**
 * coachSplitPlanApprovalService.mjs
 * =================================
 * Deterministic approval helpers for Coach split-plan proposals.
 */
import {
  COACH_PROPOSAL_STATUS,
  COACH_PROPOSAL_TYPE,
} from './coachActionProposalService.mjs';

const SAFE_REF_PATTERN = /^[A-Za-z0-9:_./-]{1,80}$/;

function optionalText(value, max = 500) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

function safeRefs(value) {
  if (!Array.isArray(value)) return { refs: [], redactedCount: 0 };
  return value.slice(0, 12).reduce((acc, item) => {
      const text = optionalText(item, 120);
      if (text && SAFE_REF_PATTERN.test(text)) {
        acc.refs.push(text);
      } else {
        acc.redactedCount += 1;
      }
      return acc;
    }, { refs: [], redactedCount: 0 });
}

function sanitizeSplitCandidate(split, index) {
  const source = split && typeof split === 'object' && !Array.isArray(split) ? split : {};
  const evidence = safeRefs(source.evidenceRefs);
  return {
    title: optionalText(source.title, 160) || `Workout candidate ${index + 1}`,
    date: optionalText(source.date, 32),
    recordedAtStart: optionalText(source.recordedAtStart, 64),
    recordedAtEnd: optionalText(source.recordedAtEnd, 64),
    reason: optionalText(source.reason, 500),
    evidenceRefs: evidence.refs,
    ...(evidence.redactedCount > 0 ? { redactedEvidenceRefCount: evidence.redactedCount } : {}),
  };
}

export function buildSplitPlanApprovalResult(proposal) {
  const splits = Array.isArray(proposal?.payload?.splits) ? proposal.payload.splits : [];
  return {
    nextAction: 'prepare_workout_log_proposals',
    splitCount: splits.length,
    splits: splits.map(sanitizeSplitCandidate),
  };
}

export async function approveNonWriteCoachProposal({
  row,
  proposal,
  id,
  userId,
  db,
  claimPendingProposal,
  updateProposalStatus,
  proposalNotPending,
}) {
  if (!await claimPendingProposal({ id, userId, db })) return proposalNotPending();
  const result = row.proposal_type === COACH_PROPOSAL_TYPE.SPLIT_PLAN
    ? buildSplitPlanApprovalResult(proposal)
    : { nextAction: 'open_deterministic_review_flow' };
  const updated = await updateProposalStatus({
    id,
    status: COACH_PROPOSAL_STATUS.APPROVED,
    result,
    db,
  });
  return {
    status: 200,
    body: {
      success: true,
      proposal: updated,
      applied: false,
      ...(row.proposal_type === COACH_PROPOSAL_TYPE.SPLIT_PLAN ? { splitPlan: result } : {}),
    },
  };
}
