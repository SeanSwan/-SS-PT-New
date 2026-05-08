/**
 * PlaudMergeReviewStatusRibbon.tsx
 * ================================
 * Read-only active-state receipt for direct PLAUD merge review links.
 */
import type { PlaudMergeReviewState } from './PlaudMergeWorkspace.types';
import {
  MergeStatusAction,
  MergeStatusCell,
  MergeStatusLabel,
  MergeStatusRibbon,
  MergeStatusValue,
} from './PlaudMergeReviewStatusRibbon.styles';

interface PlaudMergeReviewStatusRibbonProps {
  reviewState: PlaudMergeReviewState;
  dateSplitApprovalBlock: string | null;
  exerciseCount: number;
}

interface MergeAction {
  label: string;
  actionId: string;
}

function blockingGate({
  reviewState,
  dateSplitApprovalBlock,
  exerciseCount,
}: PlaudMergeReviewStatusRibbonProps): string {
  if (!reviewState.clientId) return 'Client must be resolved';
  if (dateSplitApprovalBlock) return 'Date split needs confirmation';
  if (exerciseCount === 0) return 'No parsed exercises';
  return 'Ready to log';
}

function nextAction({
  reviewState,
  dateSplitApprovalBlock,
  exerciseCount,
}: PlaudMergeReviewStatusRibbonProps): MergeAction {
  if (!reviewState.clientId) return { label: 'Return to merge queue', actionId: 'back' };
  if (dateSplitApprovalBlock) return { label: 'Confirm split dates', actionId: 'date-split' };
  if (exerciseCount === 0) return { label: 'Discard and re-record', actionId: 'discard' };
  return { label: 'Confirm and log', actionId: 'approve' };
}

function focusMergeAction(actionId: string): void {
  const target = document.querySelector<HTMLElement>(`[data-plaud-next-action="${actionId}"]`);
  if (!target) return;
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  target.focus({ preventScroll: true });
}

export function PlaudMergeReviewStatusRibbon(props: PlaudMergeReviewStatusRibbonProps): JSX.Element {
  const next = nextAction(props);

  return (
    <MergeStatusRibbon aria-label="Active merge status">
      <MergeStatusCell>
        <MergeStatusLabel>Why this is active</MergeStatusLabel>
        <MergeStatusValue>Direct review link opened this merge.</MergeStatusValue>
      </MergeStatusCell>
      <MergeStatusCell>
        <MergeStatusLabel>Blocking gate</MergeStatusLabel>
        <MergeStatusValue>{blockingGate(props)}</MergeStatusValue>
      </MergeStatusCell>
      <MergeStatusCell>
        <MergeStatusLabel>Next action</MergeStatusLabel>
        <MergeStatusValue>{next.label}</MergeStatusValue>
        <MergeStatusAction type="button" onClick={() => focusMergeAction(next.actionId)}>
          Focus next action
        </MergeStatusAction>
      </MergeStatusCell>
    </MergeStatusRibbon>
  );
}

export default PlaudMergeReviewStatusRibbon;
