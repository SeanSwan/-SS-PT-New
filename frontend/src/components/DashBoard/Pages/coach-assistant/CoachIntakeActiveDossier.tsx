/**
 * CoachIntakeActiveDossier.tsx
 * ============================
 * Focused active-intake review strip for the Swan Coach workspace.
 */
import React from 'react';
import type { CoachIntakeActiveDossierProps } from './CoachIntakeActiveDossier.types';
import CoachIntakePlaudClipPlayback from './CoachIntakePlaudClipPlayback';
import { DossierActionRail } from './CoachIntakeActiveDossier.actions';
import {
  DossierEyebrow,
  DossierGateGrid,
  DossierIdentitySection,
  DossierStatusSection,
  HoldReasonSection,
} from './CoachIntakeActiveDossier.sections';
import { TargetBody, TargetPanel } from './CoachIntakeWorkspaceTarget.styles';
import {
  audioPieceCount,
  canPrepareDraftReview,
  hasReviewablePreparedDraft,
  needsAudioOrderConfirmation,
  nextAction,
} from './CoachIntakeActiveDossier.logic';
import {
  holdReasonFacts,
  safeHoldReasonDetail,
  safeHoldReasonLabel,
} from './CoachIntakeHoldReason.logic';

const CoachIntakeActiveDossier: React.FC<CoachIntakeActiveDossierProps> = ({
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
}) => {
  const pieces = audioPieceCount(item);
  const next = nextAction(item);
  const askCoachLabel = next.actionId === 'ask-coach' ? next.label : 'Ask Coach about this intake';
  const holdLabel = safeHoldReasonLabel(item);

  return (
    <TargetPanel
      ref={focusRef}
      aria-label="Active review target"
      data-testid="coach-active-intake-dossier"
      tabIndex={-1}
    >
      <TargetBody>
        <DossierEyebrow />
        <DossierStatusSection
          item={item}
          nextActionId={next.actionId}
          nextActionLabel={next.label}
          statusText={statusText}
        />
        <HoldReasonSection
          detail={safeHoldReasonDetail(item)}
          facts={holdReasonFacts(item)}
          label={holdLabel}
          visible={Boolean(item.holdReason && holdLabel)}
        />
        <DossierIdentitySection item={item} statusText={statusText} />
        <DossierGateGrid item={item} pieces={pieces} />
        <CoachIntakePlaudClipPlayback item={item} />
      </TargetBody>
      <DossierActionRail
        askCoachLabel={askCoachLabel}
        confirmAudioOrderStatus={confirmAudioOrderStatus}
        isConfirmingAudioOrder={isConfirmingAudioOrder}
        item={item}
        nextActionId={next.actionId}
        onAskCoach={onAskCoach}
        onConfirmAudioOrder={onConfirmAudioOrder}
        onInspectAudio={onInspectAudio}
        onPrepareDraftReview={onPrepareDraftReview}
        onReviewPreparedDraft={onReviewPreparedDraft}
        reviewHref={reviewHref}
        showConfirmAudioOrder={needsAudioOrderConfirmation(item)}
        showInspectAudio={pieces > 0}
        showPrepareDraftReview={canPrepareDraftReview(item)}
        showReviewPreparedDraft={hasReviewablePreparedDraft(item)}
      />
    </TargetPanel>
  );
};

export default CoachIntakeActiveDossier;
