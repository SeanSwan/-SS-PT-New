/**
 * CoachIntakeActiveDossier.tsx
 * ============================
 * Focused active-intake review strip for the Swan Coach workspace.
 */
import React from 'react';
import {
  Brain,
  CheckCircle2,
  Eye,
  GitBranch,
  ListChecks,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import { ActionButton, WorkspaceLink } from './CoachIntakeWorkspace.styles';
import {
  DossierGrid,
  DossierHeader,
  DossierMeta,
  GateCard,
  GateLabel,
  GateValue,
  StatusRibbonAction,
  StatusRibbon,
  StatusRibbonItem,
  StatusRibbonLabel,
  StatusRibbonValue,
  TargetActions,
  TargetBody,
  TargetEyebrow,
  TargetNotice,
  TargetPanel,
} from './CoachIntakeWorkspaceTarget.styles';

interface CoachIntakeActiveDossierProps {
  item: CoachIntakeItem;
  statusText: string;
  reviewHref: string;
  focusRef?: React.Ref<HTMLElement>;
  onAskCoach: () => void;
  onInspectAudio: () => void;
  onConfirmAudioOrder: () => void;
  onPrepareDraftReview: () => void;
  onReviewPreparedDraft: () => void;
  confirmAudioOrderStatus?: string | null;
  isConfirmingAudioOrder?: boolean;
}

interface DossierAction {
  label: string;
  actionId: string;
}

const TERMINAL_PROPOSAL_STATUSES = new Set(['APPLIED', 'REJECTED', 'FAILED']);
const BLOCKED_QUEUE_STATUSES = new Set(['archived', 'failed', 'processing']);

function plural(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

function audioPieceCount(item: CoachIntakeItem): number {
  const puzzlePieces = Number(item.audioPuzzle?.pieceCount || 0);
  const clipCount = Number(item.clipCount || 0);
  if (puzzlePieces > 0) return puzzlePieces;
  if (clipCount > 0) return clipCount;
  return 0;
}

function clientGate(item: CoachIntakeItem): string {
  if (item.needsClient) return 'Client confirmation required';
  if (item.clientName || item.clientId) return 'Client confirmed';
  return 'Client pending';
}

function audioGate(item: CoachIntakeItem): string {
  const pieces = audioPieceCount(item);
  if (pieces === 0) return 'No audio pieces';
  if (item.audioPuzzle?.needsOrderingReview) return 'Ordering review required';
  if (pieces > 1) return 'Audio order ready';
  return 'Single audio piece';
}

function writeGate(item: CoachIntakeItem): string {
  if (!item.latestProposalId) return 'Final write locked';
  const status = String(item.latestProposal?.status || '').toUpperCase();
  if (status === 'APPLIED') return 'Draft applied';
  if (status === 'REJECTED') return 'Draft rejected';
  if (status === 'APPROVED') return 'Draft approved';
  if (status === 'FAILED') return 'Draft failed';
  if (status === 'APPLYING') return 'Draft applying';
  return 'Draft prepared for approval';
}

function needsAudioOrderConfirmation(item: CoachIntakeItem): boolean {
  return item.kind === 'coach_intake' && item.audioPuzzle?.needsOrderingReview === true;
}

function canPrepareDraftReview(item: CoachIntakeItem): boolean {
  if (item.kind !== 'coach_intake') return false;
  if (needsAudioOrderConfirmation(item)) return false;
  if (item.needsClient) return false;
  if (hasReviewablePreparedDraft(item)) return false;
  return !BLOCKED_QUEUE_STATUSES.has(item.queueStatus);
}

function hasReviewablePreparedDraft(item: CoachIntakeItem): boolean {
  if (!item.latestProposalId && !item.latestProposal?.id) return false;
  if (BLOCKED_QUEUE_STATUSES.has(item.queueStatus)) return false;
  const status = String(item.latestProposal?.status || '').trim().toUpperCase();
  return !TERMINAL_PROPOSAL_STATUSES.has(status);
}

function blockingGate(item: CoachIntakeItem): string {
  if (item.nextBlockingGate) return item.nextBlockingGate;
  if (item.queueStatus === 'failed') return 'Intake failed';
  if (item.queueStatus === 'processing') return 'Processing is still running';
  if (needsAudioOrderConfirmation(item)) return 'Audio order must be confirmed';
  if (item.needsClient) return 'Client confirmation required';
  if (hasReviewablePreparedDraft(item)) return 'Draft waiting for review';
  if (canPrepareDraftReview(item)) return 'Final write requires a prepared draft';
  return 'No blocking gate';
}

function actionIdForActionKey(actionKey?: string | null): string | null {
  if (actionKey === 'confirm_audio_order') return 'confirm-audio';
  if (actionKey === 'resolve_client') return 'ask-coach';
  if (actionKey === 'review_prepared_draft') return 'review-draft';
  if (actionKey === 'prepare_draft_review') return 'prepare-draft';
  if (actionKey === 'review_failed_intake') return 'ask-coach';
  if (actionKey === 'wait_for_processing') return 'open-target';
  if (actionKey === 'inspect_audio') return 'inspect-audio';
  return null;
}

function nextAction(item: CoachIntakeItem): DossierAction {
  if (item.nextActionLabel) {
    const actionId = actionIdForActionKey(item.nextActionKey) || 'ask-coach';
    return { label: item.nextActionLabel, actionId };
  }
  if (item.queueStatus === 'failed') return { label: 'Review failed intake', actionId: 'ask-coach' };
  if (item.queueStatus === 'processing') return { label: 'Wait for processing', actionId: 'open-target' };
  if (needsAudioOrderConfirmation(item)) return { label: 'Confirm audio order', actionId: 'confirm-audio' };
  if (item.needsClient) return { label: 'Ask Coach to resolve client', actionId: 'ask-coach' };
  if (hasReviewablePreparedDraft(item)) return { label: 'Review prepared draft', actionId: 'review-draft' };
  if (canPrepareDraftReview(item)) return { label: 'Prepare draft review', actionId: 'prepare-draft' };
  if (audioPieceCount(item) > 0) return { label: 'Inspect intake audio', actionId: 'inspect-audio' };
  return { label: 'Ask Coach about this intake', actionId: 'ask-coach' };
}

function activeReason(item: CoachIntakeItem, statusText: string): string {
  return `${item.sourceLabel} is selected from the intake queue in ${statusText.toLowerCase()} state.`;
}

function timeAnchor(item: CoachIntakeItem): string {
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

function focusDossierAction(actionId: string): void {
  const target = document.querySelector<HTMLElement>(`[data-coach-active-action="${actionId}"]`);
  if (!target) return;
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  target.focus({ preventScroll: true });
}

export function CoachIntakeActiveDossier({
  item,
  statusText,
  reviewHref,
  focusRef,
  onAskCoach,
  onInspectAudio,
  onConfirmAudioOrder,
  onPrepareDraftReview,
  onReviewPreparedDraft,
  confirmAudioOrderStatus = null,
  isConfirmingAudioOrder = false,
}: CoachIntakeActiveDossierProps): JSX.Element {
  const pieces = audioPieceCount(item);
  const showInspectAudio = pieces > 0;
  const showConfirmAudioOrder = needsAudioOrderConfirmation(item);
  const showPrepareDraftReview = canPrepareDraftReview(item);
  const showReviewPreparedDraft = hasReviewablePreparedDraft(item);
  const next = nextAction(item);
  const askCoachLabel = next.actionId === 'ask-coach' ? next.label : 'Ask Coach about this intake';

  return (
    <TargetPanel
      ref={focusRef}
      aria-label="Active review target"
      data-testid="coach-active-intake-dossier"
      tabIndex={-1}
    >
      <TargetBody>
        <TargetEyebrow><ListChecks size={13} aria-hidden="true" /> Active review target</TargetEyebrow>
        <StatusRibbon aria-label="Active item status">
          <StatusRibbonItem>
            <StatusRibbonLabel>Why this is active</StatusRibbonLabel>
            <StatusRibbonValue>{activeReason(item, statusText)}</StatusRibbonValue>
          </StatusRibbonItem>
          <StatusRibbonItem>
            <StatusRibbonLabel>Blocking gate</StatusRibbonLabel>
            <StatusRibbonValue>{blockingGate(item)}</StatusRibbonValue>
          </StatusRibbonItem>
          <StatusRibbonItem>
            <StatusRibbonLabel>Time anchor</StatusRibbonLabel>
            <StatusRibbonValue>{timeAnchor(item)}</StatusRibbonValue>
          </StatusRibbonItem>
          <StatusRibbonItem>
            <StatusRibbonLabel>Next action</StatusRibbonLabel>
            <StatusRibbonValue>{next.label}</StatusRibbonValue>
            <StatusRibbonAction
              type="button"
              aria-label={`Focus next action: ${next.label}`}
              onClick={() => focusDossierAction(next.actionId)}
            >
              Focus next action
            </StatusRibbonAction>
          </StatusRibbonItem>
        </StatusRibbon>
        <DossierHeader>
          <div>
            <DossierMeta>Review dossier</DossierMeta>
            <h3>{item.title}</h3>
            <p>{item.sourceLabel} - {statusText}</p>
          </div>
        </DossierHeader>
        <DossierGrid aria-label="Active intake gates">
          <GateCard>
            <UserRound size={15} aria-hidden="true" />
            <span>
              <GateLabel>Client gate</GateLabel>
              <GateValue>{clientGate(item)}</GateValue>
            </span>
          </GateCard>
          <GateCard>
            <GitBranch size={15} aria-hidden="true" />
            <span>
              <GateLabel>Audio gate</GateLabel>
              <GateValue>{audioGate(item)}</GateValue>
              {pieces > 0 ? <GateValue>{plural(pieces, 'audio piece')}</GateValue> : null}
            </span>
          </GateCard>
          <GateCard>
            <ShieldCheck size={15} aria-hidden="true" />
            <span>
              <GateLabel>Write gate</GateLabel>
              <GateValue>{writeGate(item)}</GateValue>
            </span>
          </GateCard>
        </DossierGrid>
      </TargetBody>
      <TargetActions>
        {confirmAudioOrderStatus ? (
          <TargetNotice role="status">{confirmAudioOrderStatus}</TargetNotice>
        ) : null}
        <ActionButton type="button" onClick={onAskCoach} data-coach-active-action="ask-coach">
          <Brain size={16} aria-hidden="true" />
          {askCoachLabel}
        </ActionButton>
        {showConfirmAudioOrder ? (
          <ActionButton type="button" onClick={onConfirmAudioOrder} disabled={isConfirmingAudioOrder} data-coach-active-action="confirm-audio">
            <CheckCircle2 size={16} aria-hidden="true" />
            {isConfirmingAudioOrder ? 'Confirming order...' : 'Confirm audio order'}
          </ActionButton>
        ) : null}
        {showReviewPreparedDraft ? (
          <ActionButton type="button" onClick={onReviewPreparedDraft} $primary data-coach-active-action="review-draft">
            <Eye size={16} aria-hidden="true" />
            Review prepared draft
          </ActionButton>
        ) : null}
        {showPrepareDraftReview ? (
          <ActionButton type="button" onClick={onPrepareDraftReview} data-coach-active-action="prepare-draft">
            <ListChecks size={16} aria-hidden="true" />
            {item.latestProposalId ? 'Prepare updated draft review' : 'Prepare draft review'}
          </ActionButton>
        ) : null}
        {showInspectAudio ? (
          <ActionButton type="button" onClick={onInspectAudio} data-coach-active-action="inspect-audio">
            <GitBranch size={16} aria-hidden="true" />
            Inspect intake audio
          </ActionButton>
        ) : null}
        <WorkspaceLink to={reviewHref} data-coach-active-action="open-target">
          <ListChecks size={16} aria-hidden="true" />
          Open target
        </WorkspaceLink>
      </TargetActions>
    </TargetPanel>
  );
}

export default CoachIntakeActiveDossier;
