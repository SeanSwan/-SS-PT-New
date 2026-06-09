/**
 * CoachIntakeActiveDossier.actions.tsx
 * Blueprint: action rail for the active Coach intake dossier.
 * Purpose: keep the primary review buttons touch-safe and easy to scan.
 * Data: receives list-safe intake metadata and callback props only.
 * Accessibility: every action keeps visible text plus aria-hidden icons.
 * Scope: no fetching, routing decisions, or mutation side effects live here.
 */
import React from 'react';
import {
  Brain,
  CheckCircle2,
  Eye,
  GitBranch,
  ListChecks,
} from 'lucide-react';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import { ActionButton, WorkspaceLink } from './CoachIntakeWorkspace.styles';
import { TargetActions, TargetNotice } from './CoachIntakeWorkspaceTarget.styles';

interface DossierActionRailProps {
  askCoachLabel: string;
  confirmAudioOrderStatus: string | null;
  isConfirmingAudioOrder: boolean;
  item: CoachIntakeItem;
  onAskCoach: () => void;
  onConfirmAudioOrder: () => void;
  onInspectAudio: () => void;
  onPrepareDraftReview: () => void;
  onReviewPreparedDraft: () => void;
  reviewHref: string;
  showConfirmAudioOrder: boolean;
  showInspectAudio: boolean;
  showPrepareDraftReview: boolean;
  showReviewPreparedDraft: boolean;
}

const AudioOrderNotice: React.FC<{ status: string | null }> = ({ status }) => {
  if (!status) return null;
  return <TargetNotice role="status">{status}</TargetNotice>;
};

const ConfirmAudioOrderAction: React.FC<{
  busy: boolean;
  onClick: () => void;
  visible: boolean;
}> = ({ busy, onClick, visible }) => {
  if (!visible) return null;
  return (
    <ActionButton type="button" onClick={onClick} disabled={busy} data-coach-active-action="confirm-audio">
      <CheckCircle2 size={16} aria-hidden="true" />
      {busy ? 'Confirming order...' : 'Confirm audio order'}
    </ActionButton>
  );
};

const ReviewDraftAction: React.FC<{ onClick: () => void; visible: boolean }> = ({
  onClick,
  visible,
}) => {
  if (!visible) return null;
  return (
    <ActionButton type="button" onClick={onClick} $primary data-coach-active-action="review-draft">
      <Eye size={16} aria-hidden="true" />
      Review prepared draft
    </ActionButton>
  );
};

const PrepareDraftAction: React.FC<{
  item: CoachIntakeItem;
  onClick: () => void;
  visible: boolean;
}> = ({ item, onClick, visible }) => {
  if (!visible) return null;
  return (
    <ActionButton type="button" onClick={onClick} data-coach-active-action="prepare-draft">
      <ListChecks size={16} aria-hidden="true" />
      {item.latestProposalId ? 'Prepare updated draft review' : 'Prepare draft review'}
    </ActionButton>
  );
};

const InspectAudioAction: React.FC<{ onClick: () => void; visible: boolean }> = ({
  onClick,
  visible,
}) => {
  if (!visible) return null;
  return (
    <ActionButton type="button" onClick={onClick} data-coach-active-action="inspect-audio">
      <GitBranch size={16} aria-hidden="true" />
      Inspect intake audio
    </ActionButton>
  );
};

export const DossierActionRail: React.FC<DossierActionRailProps> = ({
  askCoachLabel,
  confirmAudioOrderStatus,
  isConfirmingAudioOrder,
  item,
  onAskCoach,
  onConfirmAudioOrder,
  onInspectAudio,
  onPrepareDraftReview,
  onReviewPreparedDraft,
  reviewHref,
  showConfirmAudioOrder,
  showInspectAudio,
  showPrepareDraftReview,
  showReviewPreparedDraft,
}) => (
  <TargetActions>
    <AudioOrderNotice status={confirmAudioOrderStatus} />
    <ActionButton type="button" onClick={onAskCoach} data-coach-active-action="ask-coach">
      <Brain size={16} aria-hidden="true" />
      {askCoachLabel}
    </ActionButton>
    <ConfirmAudioOrderAction
      busy={isConfirmingAudioOrder}
      onClick={onConfirmAudioOrder}
      visible={showConfirmAudioOrder}
    />
    <ReviewDraftAction
      onClick={onReviewPreparedDraft}
      visible={showReviewPreparedDraft}
    />
    <PrepareDraftAction
      item={item}
      onClick={onPrepareDraftReview}
      visible={showPrepareDraftReview}
    />
    <InspectAudioAction
      onClick={onInspectAudio}
      visible={showInspectAudio}
    />
    <WorkspaceLink to={reviewHref} data-coach-active-action="open-target">
      <ListChecks size={16} aria-hidden="true" />
      Open target
    </WorkspaceLink>
  </TargetActions>
);
