/**
 * coachSplitPlanApprovalService.mjs
 * =================================
 * Deterministic approval helpers for Coach split-plan proposals.
 */
import {
  COACH_PROPOSAL_STATUS,
  COACH_PROPOSAL_TYPE,
  createCoachActionProposalDraft,
} from './coachActionProposalService.mjs';
import { ensureClientAccess } from '../../utils/clientAccess.mjs';
import { normalizeCoachIntakeId } from './coachActionProposalIntakeLinkService.mjs';

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

function validExercises(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((exercise) => exercise && typeof exercise === 'object' && !Array.isArray(exercise))
    .filter((exercise) => optionalText(exercise.name, 120))
    .slice(0, 80);
}

function parseSplitClientId(...candidates) {
  for (const value of candidates) {
    if (value === null || value === undefined || value === '') continue;

    if (typeof value === 'number') {
      return Number.isSafeInteger(value) && value > 0 ? value : null;
    }

    if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
      const id = Number(value);
      return Number.isSafeInteger(id) ? id : null;
    }

    return null;
  }

  return null;
}

export function sanitizeSplitCandidate(split, index) {
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

function workoutPayloadFromSplit(split, proposal, row) {
  const source = split && typeof split === 'object' && !Array.isArray(split) ? split : {};
  const clientId = parseSplitClientId(source.clientId, proposal?.payload?.clientId, proposal?.targetUserId);
  const date = optionalText(source.date, 32);
  const exercises = validExercises(source.exercises);
  if (!clientId || !date || exercises.length === 0) return null;
  const evidence = safeRefs(source.evidenceRefs);
  const parentMeta = proposal?.payload?.proposalMeta || {};
  const intakeId = normalizeCoachIntakeId(parentMeta.intakeId || parentMeta.intake_id || null);
  const parentProposalId = optionalText(row?.id, 64);
  return {
    action: 'import_workout_log',
    clientId,
    date,
    exercises,
    title: optionalText(source.title, 160),
    notes: optionalText(source.notes, 1200) || optionalText(source.reason, 500),
    duration: source.duration ?? null,
    intensity: source.intensity ?? null,
    proposalMeta: {
      schemaVersion: '2026-05-06',
      evidenceRefs: evidence.refs,
      safetyFlags: ['split_plan_child'],
      requiresConfirmation: true,
      parentProposalType: COACH_PROPOSAL_TYPE.SPLIT_PLAN,
      ...(intakeId ? { intakeId } : {}),
      ...(parentProposalId ? { parentProposalId } : {}),
    },
  };
}

async function prepareWorkoutProposalsFromSplits({ splits, proposal, row, req, db }) {
  const workoutProposals = [];
  let skippedWorkoutProposalCount = 0;
  for (const split of splits) {
    const payload = workoutPayloadFromSplit(split, proposal, row);
    if (!payload) {
      skippedWorkoutProposalCount += 1;
      continue;
    }
    const access = await ensureClientAccess(req, payload.clientId);
    if (!access.allowed) {
      skippedWorkoutProposalCount += 1;
      continue;
    }
    workoutProposals.push(await createCoachActionProposalDraft({
      type: COACH_PROPOSAL_TYPE.WORKOUT_LOG,
      payload: { ...payload, clientId: access.clientId },
      user: req.user,
      conversation: {
        id: proposal?.conversationId || row.conversation_id || null,
        targetUserId: access.clientId,
      },
      sourceMessageId: row.source_message_id || null,
      db,
    }));
  }
  return { workoutProposals, skippedWorkoutProposalCount };
}

export async function buildSplitPlanApprovalResult({ proposal, row, req, db }) {
  const splits = Array.isArray(proposal?.payload?.splits) ? proposal.payload.splits : [];
  const { workoutProposals, skippedWorkoutProposalCount } = await prepareWorkoutProposalsFromSplits({
    splits,
    proposal,
    row,
    req,
    db,
  });
  return {
    nextAction: 'prepare_workout_log_proposals',
    splitCount: splits.length,
    splits: splits.map(sanitizeSplitCandidate),
    workoutProposalCount: workoutProposals.length,
    workoutProposals,
    ...(skippedWorkoutProposalCount > 0 ? { skippedWorkoutProposalCount } : {}),
  };
}

export async function approveNonWriteCoachProposal({
  row,
  proposal,
  id,
  userId,
  db,
  req,
  claimPendingProposal,
  updateProposalStatus,
  proposalNotPending,
}) {
  if (!await claimPendingProposal({ id, userId, db })) return proposalNotPending();
  const result = row.proposal_type === COACH_PROPOSAL_TYPE.SPLIT_PLAN
    ? await buildSplitPlanApprovalResult({ proposal, row, req, db })
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
