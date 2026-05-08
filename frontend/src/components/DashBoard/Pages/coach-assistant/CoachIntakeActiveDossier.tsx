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
import {
  HoldReasonCopy,
  HoldReasonDetail,
  HoldReasonFact,
  HoldReasonFacts,
  HoldReasonLabel,
  HoldReasonPanel,
  HoldReasonTitle,
} from './CoachIntakeWorkspaceHoldReason.styles';
import {
  activeReason,
  audioGate,
  audioPieceCount,
  blockingGate,
  canPrepareDraftReview,
  clientGate,
  hasReviewablePreparedDraft,
  holdReasonFacts,
  needsAudioOrderConfirmation,
  nextAction,
  plural,
  timeAnchor,
  writeGate,
} from './CoachIntakeActiveDossier.logic';

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
  const holdReason = item.holdReason || null;
  const facts = holdReasonFacts(item);

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
        {holdReason ? (
          <HoldReasonPanel aria-label="Hold reason">
            <HoldReasonCopy>
              <HoldReasonLabel>Hold reason</HoldReasonLabel>
              <HoldReasonTitle>{holdReason.label}</HoldReasonTitle>
              {holdReason.detail ? <HoldReasonDetail>{holdReason.detail}</HoldReasonDetail> : null}
            </HoldReasonCopy>
            {facts.length > 0 ? (
              <HoldReasonFacts aria-label="Hold reason facts">
                {facts.map((fact) => <HoldReasonFact key={fact}>{fact}</HoldReasonFact>)}
              </HoldReasonFacts>
            ) : null}
          </HoldReasonPanel>
        ) : null}
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
