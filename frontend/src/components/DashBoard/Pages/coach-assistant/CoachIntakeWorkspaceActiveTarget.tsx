/**
 * CoachIntakeWorkspaceActiveTarget.tsx
 * ===================================
 * Renders the selected Coach intake dossier and direct-link freshness warning.
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import CoachIntakeActiveDossier from './CoachIntakeActiveDossier';
import type { CoachIntakeActiveDossierProps } from './CoachIntakeActiveDossier.types';
import { ItemCard, ItemTitle, SourceChip } from './CoachIntakeWorkspace.styles';

interface CoachIntakeWorkspaceActiveTargetProps extends CoachIntakeActiveDossierProps {
  showStaleProposalLink?: boolean;
}

const CoachIntakeWorkspaceActiveTarget = ({
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
}: CoachIntakeWorkspaceActiveTargetProps): JSX.Element => {
  const staleWarningRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!showStaleProposalLink) return undefined;
    const warning = staleWarningRef.current;
    if (!warning) return undefined;
    const timer = window.setTimeout(() => {
      if (typeof warning.scrollIntoView === 'function') {
        warning.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      warning.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [item.id, showStaleProposalLink]);

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
        <ItemCard ref={staleWarningRef} role="alert" tabIndex={-1}>
          <ItemTitle>
            <strong>Prepared draft link is stale</strong>
            <span>This intake has a different latest draft. Use Review prepared draft from the active target.</span>
          </ItemTitle>
          <SourceChip $tone="gold"><AlertTriangle size={12} aria-hidden="true" /> Check</SourceChip>
        </ItemCard>
      ) : null}
    </>
  );
};

export default CoachIntakeWorkspaceActiveTarget;
