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
  onAskCoach: () => void;
  onInspectAudio: () => void;
  onConfirmAudioOrder: () => void;
  onPrepareDraftReview: () => void;
  onReviewPreparedDraft: () => void;
  confirmAudioOrderStatus?: string | null;
  isConfirmingAudioOrder?: boolean;
}

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
  return item.latestProposalId ? 'Draft prepared for approval' : 'Final write locked';
}

function needsAudioOrderConfirmation(item: CoachIntakeItem): boolean {
  return item.kind === 'coach_intake' && item.audioPuzzle?.needsOrderingReview === true;
}

function canPrepareDraftReview(item: CoachIntakeItem): boolean {
  if (item.kind !== 'coach_intake') return false;
  if (needsAudioOrderConfirmation(item)) return false;
  return !['archived', 'failed', 'processing'].includes(item.queueStatus);
}

export function CoachIntakeActiveDossier({
  item,
  statusText,
  reviewHref,
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
  const showReviewPreparedDraft = !!item.latestProposalId;

  return (
    <TargetPanel aria-label="Active review target">
      <TargetBody>
        <TargetEyebrow><ListChecks size={13} aria-hidden="true" /> Active review target</TargetEyebrow>
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
        <ActionButton type="button" onClick={onAskCoach}>
          <Brain size={16} aria-hidden="true" />
          Ask Coach about this intake
        </ActionButton>
        {showConfirmAudioOrder ? (
          <ActionButton type="button" onClick={onConfirmAudioOrder} disabled={isConfirmingAudioOrder}>
            <CheckCircle2 size={16} aria-hidden="true" />
            {isConfirmingAudioOrder ? 'Confirming order...' : 'Confirm audio order'}
          </ActionButton>
        ) : null}
        {showReviewPreparedDraft ? (
          <ActionButton type="button" onClick={onReviewPreparedDraft} $primary>
            <Eye size={16} aria-hidden="true" />
            Review prepared draft
          </ActionButton>
        ) : null}
        {showPrepareDraftReview ? (
          <ActionButton type="button" onClick={onPrepareDraftReview}>
            <ListChecks size={16} aria-hidden="true" />
            {item.latestProposalId ? 'Prepare updated draft review' : 'Prepare draft review'}
          </ActionButton>
        ) : null}
        {showInspectAudio ? (
          <ActionButton type="button" onClick={onInspectAudio}>
            <GitBranch size={16} aria-hidden="true" />
            Inspect intake audio
          </ActionButton>
        ) : null}
        <WorkspaceLink to={reviewHref}>
          <ListChecks size={16} aria-hidden="true" />
          Open target
        </WorkspaceLink>
      </TargetActions>
    </TargetPanel>
  );
}

export default CoachIntakeActiveDossier;
