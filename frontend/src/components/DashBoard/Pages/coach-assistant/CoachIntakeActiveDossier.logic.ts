/**
 * CoachIntakeActiveDossier.logic.ts
 * =================================
 * Pure gate, action, and display helpers for the active Coach intake dossier.
 */
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import {
  safeCoachIntakeSourceLabel,
  safeCommandActionLabel,
  safeCommandGateValue,
} from './CoachIntakeOperationalText.logic';

export interface DossierAction {
  label: string;
  actionId: string;
}

const TERMINAL_PROPOSAL_STATUSES = new Set(['APPLIED', 'REJECTED', 'FAILED']);
const BLOCKED_QUEUE_STATUSES = new Set([
  'archived',
  'duplicate_hold',
  'failed',
  'needs_clarification',
  'processing',
]);

export function plural(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

export function audioPieceCount(item: CoachIntakeItem): number {
  const puzzlePieces = Number(item.audioPuzzle?.pieceCount || 0);
  const clipCount = Number(item.clipCount || 0);
  if (puzzlePieces > 0) return puzzlePieces;
  if (clipCount > 0) return clipCount;
  return 0;
}

export function clientGate(item: CoachIntakeItem): string {
  if (item.needsClient) return 'Client confirmation required';
  if (item.clientId != null) return 'Client confirmed';
  return 'Client pending';
}

export function audioGate(item: CoachIntakeItem): string {
  const pieces = audioPieceCount(item);
  if (pieces === 0) return 'No audio pieces';
  if (item.audioPuzzle?.needsOrderingReview) return 'Ordering review required';
  if (pieces > 1) return 'Audio order ready';
  return 'Single audio piece';
}

export function writeGate(item: CoachIntakeItem): string {
  if (!item.latestProposalId) return 'Final write locked';
  const status = String(item.latestProposal?.status || '').toUpperCase();
  if (status === 'APPLIED') return 'Draft applied';
  if (status === 'REJECTED') return 'Draft rejected';
  if (status === 'APPROVED') return 'Draft approved';
  if (status === 'FAILED') return 'Draft failed';
  if (status === 'APPLYING') return 'Draft applying';
  return 'Draft prepared for approval';
}

export function needsAudioOrderConfirmation(item: CoachIntakeItem): boolean {
  return item.kind === 'coach_intake' && item.audioPuzzle?.needsOrderingReview === true;
}

export function hasReviewablePreparedDraft(item: CoachIntakeItem): boolean {
  if (!item.latestProposalId && !item.latestProposal?.id) return false;
  if (BLOCKED_QUEUE_STATUSES.has(item.queueStatus)) return false;
  const status = String(item.latestProposal?.status || '').trim().toUpperCase();
  return !TERMINAL_PROPOSAL_STATUSES.has(status);
}

export function canPrepareDraftReview(item: CoachIntakeItem): boolean {
  if (item.kind !== 'coach_intake') return false;
  if (needsAudioOrderConfirmation(item)) return false;
  if (item.needsClient) return false;
  if (hasReviewablePreparedDraft(item)) return false;
  return !BLOCKED_QUEUE_STATUSES.has(item.queueStatus);
}

export function blockingGate(item: CoachIntakeItem): string {
  const safeBackendGate = safeCommandGateValue(item.nextBlockingGate);
  if (safeBackendGate) return safeBackendGate;
  if (item.queueStatus === 'failed') return 'Intake failed';
  if (item.queueStatus === 'processing') return 'Processing is still running';
  if (needsAudioOrderConfirmation(item)) return 'Audio order must be confirmed';
  if (item.needsClient) return 'Client confirmation required';
  if (item.queueStatus === 'needs_clarification') return 'Clarification required';
  if (item.queueStatus === 'duplicate_hold') return 'Duplicate risk requires review';
  if (hasReviewablePreparedDraft(item)) return 'Draft waiting for review';
  if (canPrepareDraftReview(item)) return 'Final write requires a prepared draft';
  return 'No blocking gate';
}

export function intakeSourceLabel(item: CoachIntakeItem): string {
  return safeCoachIntakeSourceLabel(item.source);
}

export function intakeTitleLabel(item: CoachIntakeItem): string {
  const sourceLabel = intakeSourceLabel(item);
  return sourceLabel === 'Coach intake' ? 'Coach intake item' : sourceLabel;
}

function actionIdForActionKey(actionKey?: string | null): string | null {
  if (actionKey === 'confirm_audio_order') return 'confirm-audio';
  if (actionKey === 'resolve_client') return 'ask-coach';
  if (actionKey === 'review_prepared_draft') return 'review-draft';
  if (actionKey === 'prepare_draft_review') return 'prepare-draft';
  if (actionKey === 'review_failed_intake') return 'ask-coach';
  if (actionKey === 'wait_for_processing') return 'open-target';
  if (actionKey === 'inspect_audio') return 'inspect-audio';
  if (actionKey === 'answer_clarification') return 'ask-coach';
  if (actionKey === 'review_duplicate_hold') return 'ask-coach';
  return null;
}

export function nextAction(item: CoachIntakeItem): DossierAction {
  const safeBackendAction = safeCommandActionLabel(item.nextActionLabel);
  if (safeBackendAction) {
    const actionId = actionIdForActionKey(item.nextActionKey) || 'ask-coach';
    return { label: safeBackendAction, actionId };
  }
  if (item.queueStatus === 'failed') return { label: 'Review failed intake', actionId: 'ask-coach' };
  if (item.queueStatus === 'processing') return { label: 'Wait for processing', actionId: 'open-target' };
  if (needsAudioOrderConfirmation(item)) return { label: 'Confirm audio order', actionId: 'confirm-audio' };
  if (item.needsClient) return { label: 'Ask Coach to resolve client', actionId: 'ask-coach' };
  if (item.queueStatus === 'needs_clarification') return { label: 'Answer Coach clarification', actionId: 'ask-coach' };
  if (item.queueStatus === 'duplicate_hold') return { label: 'Review duplicate risk', actionId: 'ask-coach' };
  if (hasReviewablePreparedDraft(item)) return { label: 'Review prepared draft', actionId: 'review-draft' };
  if (canPrepareDraftReview(item)) return { label: 'Prepare draft review', actionId: 'prepare-draft' };
  if (audioPieceCount(item) > 0) return { label: 'Inspect intake audio', actionId: 'inspect-audio' };
  return { label: 'Ask Coach about this intake', actionId: 'ask-coach' };
}

export function activeReason(item: CoachIntakeItem, statusText: string): string {
  return `${intakeSourceLabel(item)} is selected from the intake queue in ${statusText.toLowerCase()} state.`;
}

export function timeAnchor(item: CoachIntakeItem): string {
  const rawValue = item.timelineAt || item.recordedAt || item.createdAt || null;
  if (!rawValue) return 'Time pending';

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return 'Time pending';

  const source = item.timelineAtSource
    || (rawValue === item.recordedAt ? 'recorded_at' : null)
    || (rawValue === item.createdAt ? 'created_at' : null);
  const prefix = source === 'recorded_at'
    ? 'Recorded'
    : source === 'uploaded_at'
      ? 'Uploaded'
      : source === 'created_at'
        ? 'Created'
        : 'Anchored';
  const formatted = new Intl.DateTimeFormat([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
  return `${prefix} ${formatted}`;
}
