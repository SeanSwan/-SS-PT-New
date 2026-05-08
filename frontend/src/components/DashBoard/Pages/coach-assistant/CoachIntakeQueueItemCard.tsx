/**
 * CoachIntakeQueueItemCard.tsx
 * ============================
 * Compact queue row for Coach intake work items.
 */
import React from 'react';
import { GitBranch } from 'lucide-react';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import { AudioPuzzleLabel, AudioPuzzleRow } from './CoachIntakeWorkspaceAudio.styles';
import { ChipColumn, ItemCard, ItemTitle, SourceChip, WorkspaceLink } from './CoachIntakeWorkspace.styles';
import { itemMeta, itemReviewHref, plural, visibleAudioPuzzle } from './CoachIntakeWorkspace.utils';

interface CoachIntakeQueueItemCardProps {
  item: CoachIntakeItem;
  active: boolean;
  coachWorkspaceHref: string;
}

function actionableGate(item: CoachIntakeItem): string | null {
  if (!item.nextBlockingGate || item.nextBlockingGate === 'No blocking gate') return null;
  return item.nextBlockingGate;
}

export function CoachIntakeQueueItemCard({
  item,
  active,
  coachWorkspaceHref,
}: CoachIntakeQueueItemCardProps): JSX.Element {
  const audioPuzzle = visibleAudioPuzzle(item.audioPuzzle);
  const gate = actionableGate(item);

  return (
    <ItemCard
      $active={active}
      aria-current={active ? 'true' : undefined}
      aria-label={`Queue item ${item.title}`}
    >
      <ItemTitle>
        <strong>{item.title}</strong>
        <span>{itemMeta(item)}</span>
      </ItemTitle>
      <ChipColumn>
        <SourceChip>{item.sourceLabel}</SourceChip>
        {active && <SourceChip $tone="gold">Selected intake</SourceChip>}
        {gate && <SourceChip $tone="gold">{gate}</SourceChip>}
        {item.nextActionLabel && <SourceChip $tone="purple">{item.nextActionLabel}</SourceChip>}
        <WorkspaceLink to={itemReviewHref(item, coachWorkspaceHref)} aria-label={`Review intake ${item.title}`}>
          Review
        </WorkspaceLink>
      </ChipColumn>
      {audioPuzzle && (
        <AudioPuzzleRow aria-label={`Audio puzzle ${plural(audioPuzzle.pieceCount, 'piece')}`}>
          <GitBranch size={13} aria-hidden="true" />
          <AudioPuzzleLabel>Audio puzzle</AudioPuzzleLabel>
          <SourceChip $tone="purple">{plural(audioPuzzle.pieceCount, 'piece')}</SourceChip>
          <SourceChip>{plural(audioPuzzle.bundleCount, 'bundle')}</SourceChip>
          <span>{audioPuzzle.confidence} confidence</span>
          {audioPuzzle.needsOrderingReview && <SourceChip $tone="gold">order review</SourceChip>}
        </AudioPuzzleRow>
      )}
    </ItemCard>
  );
}

export default CoachIntakeQueueItemCard;
