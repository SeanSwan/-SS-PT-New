/**
 * PlaudMergeReviewStatusRibbon.tsx
 * ================================
 * Read-only active-state receipt for direct PLAUD merge review links.
 */
import type { PlaudMergeReviewState } from './PlaudMergeWorkspace.types';
import {
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
}: PlaudMergeReviewStatusRibbonProps): string {
  if (!reviewState.clientId) return 'Return to merge queue';
  if (dateSplitApprovalBlock) return 'Confirm split dates';
  if (exerciseCount === 0) return 'Discard and re-record';
  return 'Confirm and log';
}

export function PlaudMergeReviewStatusRibbon(props: PlaudMergeReviewStatusRibbonProps): JSX.Element {
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
        <MergeStatusValue>{nextAction(props)}</MergeStatusValue>
      </MergeStatusCell>
    </MergeStatusRibbon>
  );
}

export default PlaudMergeReviewStatusRibbon;
