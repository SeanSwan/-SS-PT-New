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
  CheckCircle2,
  Eye,
  ListChecks,
} from 'lucide-react';
import { ActionButton, WorkspaceLink } from './CoachIntakeWorkspace.styles';
import { TargetActions, TargetNotice } from './CoachIntakeWorkspaceTarget.styles';

interface DossierActionRailProps {
  confirmAudioOrderStatus: string | null;
  isConfirmingAudioOrder: boolean;
  nextActionId: string;
  onConfirmAudioOrder: () => void;
  onReviewPreparedDraft: () => void;
  reviewHref: string;
  showConfirmAudioOrder: boolean;
  showReviewPreparedDraft: boolean;
}

const AudioOrderNotice: React.FC<{ status: string | null }> = ({ status }) => {
  if (!status) return null;
  return <TargetNotice role="status">{status}</TargetNotice>;
};

const ConfirmAudioOrderAction: React.FC<{
  busy: boolean;
  onClick: () => void;
  primary: boolean;
  visible: boolean;
}> = ({ busy, onClick, primary, visible }) => {
  if (!visible) return null;
  return (
    <ActionButton type="button" onClick={onClick} disabled={busy} $primary={primary} data-coach-active-action="confirm-audio">
      <CheckCircle2 size={16} aria-hidden="true" />
      {busy ? 'Confirming order...' : 'Confirm audio order'}
    </ActionButton>
  );
};

const ReviewDraftAction: React.FC<{ onClick: () => void; primary: boolean; visible: boolean }> = ({
  onClick,
  primary,
  visible,
}) => {
  if (!visible) return null;
  return (
    <ActionButton type="button" onClick={onClick} $primary={primary} data-coach-active-action="review-draft">
      <Eye size={16} aria-hidden="true" />
      Review prepared draft
    </ActionButton>
  );
};

export const DossierActionRail: React.FC<DossierActionRailProps> = ({
  confirmAudioOrderStatus,
  isConfirmingAudioOrder,
  nextActionId,
  onConfirmAudioOrder,
  onReviewPreparedDraft,
  reviewHref,
  showConfirmAudioOrder,
  showReviewPreparedDraft,
}) => {
  const actionNodes = [
    {
      id: 'confirm-audio',
      node: (
        <ConfirmAudioOrderAction
          busy={isConfirmingAudioOrder}
          onClick={onConfirmAudioOrder}
          primary={nextActionId === 'confirm-audio'}
          visible={showConfirmAudioOrder}
        />
      ),
    },
    {
      id: 'review-draft',
      node: (
        <ReviewDraftAction
          onClick={onReviewPreparedDraft}
          primary={nextActionId === 'review-draft'}
          visible={showReviewPreparedDraft}
        />
      ),
    },
    {
      id: 'open-target',
      node: (
        <WorkspaceLink to={reviewHref} $primary={nextActionId === 'open-target'} data-coach-active-action="open-target">
          <ListChecks size={16} aria-hidden="true" />
          Open target
        </WorkspaceLink>
      ),
    },
  ];
  const order = [nextActionId, 'review-draft', 'confirm-audio', 'open-target'];
  const ranked = [...actionNodes].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  return (
    <TargetActions>
      <AudioOrderNotice status={confirmAudioOrderStatus} />
      {ranked.map((action) => (
        <React.Fragment key={action.id}>{action.node}</React.Fragment>
      ))}
    </TargetActions>
  );
};
