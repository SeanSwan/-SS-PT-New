/**
 * plaudStructuredActionDispatchers.mjs
 * ====================================
 * Structured Swan Coach PLAUD action contract.
 *
 * These handlers are read/propose/manual-confirmation only. Final workout log
 * writes stay in the existing reviewed workout-log flow.
 */
import {
  dispatchInspectCoachAudioPieces,
  dispatchViewCoachIntakeQueue,
} from './coachIntakeDispatchers.mjs';

const CONTRACT_VERSION = 'plaud-coach-action-v1';
const NEXT_WRITE_PATH = 'existing_review_flow_only';
const CONFIRMATION_TYPES = new Set([
  'audio_order',
  'client',
  'date',
  'duplicate',
  'merge_boundary',
]);

function normalizeConfirmationType(raw) {
  const value = String(raw || 'audio_order').trim();
  return CONFIRMATION_TYPES.has(value) ? value : 'audio_order';
}

function withContract(actionType, result, extra = {}) {
  return {
    actionType,
    contractVersion: CONTRACT_VERSION,
    ...result,
    ...extra,
  };
}

function candidateGroupCount(result) {
  if (!Array.isArray(result?.items)) return 0;
  return result.items.reduce((sum, item) => sum + Number(item?.audioBundles || 0), 0);
}

function needsManualConfirmation(result) {
  if (Number(result?.needsOrderingReview || 0) > 0) return true;
  const primaryAction = String(result?.reviewPlan?.primaryAction || '');
  return [
    'confirm_audio_order',
    'resolve_client',
    'review_duplicate_hold',
    'answer_clarification',
  ].includes(primaryAction);
}

function proposalFields(result, proposalType, confirmationKind) {
  return {
    proposalType,
    requiresManualConfirmation: needsManualConfirmation(result),
    confirmationKind,
    writeStatus: 'not_written',
    nextWritePath: NEXT_WRITE_PATH,
    reviewRoute: result?.reviewRoute || result?.queueRoute || null,
  };
}

export async function dispatchPlaudListIntakeItems(params = {}, ctx = {}) {
  const result = await dispatchViewCoachIntakeQueue(params, ctx);
  return withContract('plaud_list_intake_items', result, {
    writeStatus: 'read_only',
  });
}

export async function dispatchPlaudAnalyzeClipSet(params = {}, ctx = {}) {
  const result = await dispatchInspectCoachAudioPieces(params, ctx);
  return withContract('plaud_analyze_clip_set', result, {
    writeStatus: 'read_only',
  });
}

export async function dispatchPlaudProposeClipOrder(params = {}, ctx = {}) {
  const result = await dispatchInspectCoachAudioPieces(params, ctx);
  return withContract(
    'plaud_propose_clip_order',
    result,
    proposalFields(result, 'clip_order', 'audio_order'),
  );
}

export async function dispatchPlaudGroupSessionCandidates(params = {}, ctx = {}) {
  const result = await dispatchInspectCoachAudioPieces(params, ctx);
  return withContract('plaud_group_session_candidates', result, {
    ...proposalFields(result, 'session_grouping', 'merge_boundary'),
    candidateGroupCount: candidateGroupCount(result),
  });
}

export async function dispatchPlaudMergeCandidateGroup(params = {}, ctx = {}) {
  const result = await dispatchInspectCoachAudioPieces(params, ctx);
  return withContract('plaud_merge_candidate_group', result, {
    ...proposalFields(result, 'merge_candidate_group', 'merge_boundary'),
    requiresManualConfirmation: true,
  });
}

export async function dispatchPlaudRequestConfirmation(params = {}, ctx = {}) {
  const result = await dispatchInspectCoachAudioPieces(params, ctx);
  return withContract('plaud_request_confirmation', result, {
    confirmationType: normalizeConfirmationType(params?.confirmationType),
    requiresManualConfirmation: true,
    writeStatus: 'not_written',
    nextWritePath: NEXT_WRITE_PATH,
    reviewRoute: result?.reviewRoute || result?.queueRoute || null,
  });
}

export const _internal = {
  candidateGroupCount,
  needsManualConfirmation,
  normalizeConfirmationType,
  proposalFields,
};
