/**
 * CoachIntakeWorkspaceActiveTarget.tsx
 * ===================================
 * Renders the selected Coach intake dossier and direct-link freshness warning.
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import CoachIntakeActiveDossier from './CoachIntakeActiveDossier';
import { ItemCard, ItemTitle, SourceChip } from './CoachIntakeWorkspace.styles';

interface CoachIntakeWorkspaceActiveTargetProps {
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
  showStaleProposalLink?: boolean;
}

export function CoachIntakeWorkspaceActiveTarget({
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
  showStaleProposalLink = false,
}: CoachIntakeWorkspaceActiveTargetProps): JSX.Element {
  return (
    <>
      <CoachIntakeActiveDossier
        focusRef={focusRef}
        item={item}
        statusText={statusText}
        reviewHref={reviewHref}
        onAskCoach={onAskCoach}
        onInspectAudio={onInspectAudio}
        onConfirmAudioOrder={onConfirmAudioOrder}
        onPrepareDraftReview={onPrepareDraftReview}
        onReviewPreparedDraft={onReviewPreparedDraft}
        confirmAudioOrderStatus={confirmAudioOrderStatus}
        isConfirmingAudioOrder={isConfirmingAudioOrder}
      />
      {showStaleProposalLink ? (
        <ItemCard role="alert">
          <ItemTitle>
            <strong>Prepared draft link is stale</strong>
            <span>This intake has a different latest draft. Use Review prepared draft from the active target.</span>
          </ItemTitle>
          <SourceChip $tone="gold"><AlertTriangle size={12} aria-hidden="true" /> Check</SourceChip>
        </ItemCard>
      ) : null}
    </>
  );
}

export default CoachIntakeWorkspaceActiveTarget;
