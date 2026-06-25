/**
 * CoachIntakeActiveDossier.tsx
 * ============================
 * Focused active-intake review strip for the Swan Coach workspace.
 */
import React from 'react';
import type { CoachIntakeActiveDossierProps } from './CoachIntakeActiveDossier.types';
import CoachIntakePlaudClipPlayback from './CoachIntakePlaudClipPlayback';
import CoachIntakeReviewPath from './CoachIntakeReviewPath';
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
  onConfirmAudioOrder,
  onReviewPreparedDraft,
  confirmAudioOrderStatus = null,
  isConfirmingAudioOrder = false,
}) => {
  const pieces = audioPieceCount(item);
  const next = nextAction(item);
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
        <CoachIntakeReviewPath item={item} />
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
        confirmAudioOrderStatus={confirmAudioOrderStatus}
        isConfirmingAudioOrder={isConfirmingAudioOrder}
        nextActionId={next.actionId}
        onConfirmAudioOrder={onConfirmAudioOrder}
        onReviewPreparedDraft={onReviewPreparedDraft}
        reviewHref={reviewHref}
        showConfirmAudioOrder={needsAudioOrderConfirmation(item)}
        showReviewPreparedDraft={hasReviewablePreparedDraft(item)}
      />
    </TargetPanel>
  );
};

export default CoachIntakeActiveDossier;
