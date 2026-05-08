/**
 * coachIntakeGateSummary.mjs
 * ==========================
 * PII-safe gate labels for Coach intake command results.
 *
 * These helpers mirror the operator-facing Coach intake dossier state without
 * exposing transcript text, client names, or write-capable instructions.
 */
import { hasReviewablePreparedDraft } from '../coachIntakeProposalReadiness.mjs';

function audioPieceCount(item) {
  const puzzlePieces = Number(item?.audioPuzzle?.pieceCount || 0);
  const clipCount = Number(item?.clipCount || 0);
  if (puzzlePieces > 0) return puzzlePieces;
  if (clipCount > 0) return clipCount;
  return 0;
}

function needsAudioOrderConfirmation(item) {
  return item?.kind === 'coach_intake' && item?.audioPuzzle?.needsOrderingReview === true;
}

function canPrepareDraftReview(item) {
  if (item?.kind !== 'coach_intake') return false;
  if (needsAudioOrderConfirmation(item)) return false;
  return !['archived', 'failed', 'processing'].includes(item?.queueStatus);
}

export function coachIntakeBlockingGate(item) {
  if (!item) return null;
  if (item.queueStatus === 'failed') return 'Intake failed';
  if (item.queueStatus === 'processing') return 'Processing is still running';
  if (needsAudioOrderConfirmation(item)) return 'Audio order must be confirmed';
  if (item.needsClient) return 'Client confirmation required';
  if (hasReviewablePreparedDraft(item)) return 'Draft waiting for review';
  if (canPrepareDraftReview(item)) return 'Final write requires a prepared draft';
  return 'No blocking gate';
}

export function coachIntakeNextAction(item) {
  if (!item) return { key: null, label: null };
  if (item.queueStatus === 'failed') {
    return { key: 'review_failed_intake', label: 'Review failed intake' };
  }
  if (item.queueStatus === 'processing') {
    return { key: 'wait_for_processing', label: 'Wait for processing' };
  }
  if (needsAudioOrderConfirmation(item)) {
    return { key: 'confirm_audio_order', label: 'Confirm audio order' };
  }
  if (item.needsClient) {
    return { key: 'resolve_client', label: 'Ask Coach to resolve client' };
  }
  if (hasReviewablePreparedDraft(item)) {
    return { key: 'review_prepared_draft', label: 'Review prepared draft' };
  }
  if (canPrepareDraftReview(item)) {
    return { key: 'prepare_draft_review', label: 'Prepare draft review' };
  }
  if (audioPieceCount(item) > 0) {
    return { key: 'inspect_audio', label: 'Inspect intake audio' };
  }
  return { key: 'ask_coach', label: 'Ask Coach about this intake' };
}

export function coachIntakeGateSummary(item) {
  const nextAction = coachIntakeNextAction(item);
  return {
    nextBlockingGate: coachIntakeBlockingGate(item),
    nextActionKey: nextAction.key,
    nextActionLabel: nextAction.label,
  };
}

export default {
  coachIntakeBlockingGate,
  coachIntakeGateSummary,
  coachIntakeNextAction,
};
