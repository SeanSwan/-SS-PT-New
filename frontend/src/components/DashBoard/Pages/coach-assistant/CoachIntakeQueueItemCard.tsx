/**
 * CoachIntakeQueueItemCard.tsx
 * ============================
 * Compact queue row for Coach intake work items.
 */
import React from 'react';
import { Brain, GitBranch } from 'lucide-react';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import { holdReasonFacts } from './CoachIntakeHoldReason.logic';
import { AudioPuzzleLabel, AudioPuzzleRow } from './CoachIntakeWorkspaceAudio.styles';
import { ActionButton, ChipColumn, ItemCard, ItemTitle, SourceChip, WorkspaceLink } from './CoachIntakeWorkspace.styles';
import { HoldReasonFact, HoldReasonFacts, HoldReasonLabel, HoldReasonTitle, QueueHoldReasonPreview } from './CoachIntakeWorkspaceHoldReason.styles';
import { activeCoachActionPrompt, itemMeta, itemReviewHref, plural, queueScopedHref, visibleAudioPuzzle } from './CoachIntakeWorkspace.utils';

interface CoachIntakeQueueItemCardProps {
  item: CoachIntakeItem;
  active: boolean;
  coachWorkspaceHref: string;
  onCommandPrompt?: (message: string) => void;
  queueScope?: string;
}

function actionableGate(item: CoachIntakeItem): string | null {
  if (!item.nextBlockingGate || item.nextBlockingGate === 'No blocking gate') return null;
  return item.nextBlockingGate;
}

export function CoachIntakeQueueItemCard({
  item,
  active,
  coachWorkspaceHref,
  onCommandPrompt,
  queueScope,
}: CoachIntakeQueueItemCardProps): JSX.Element {
  const audioPuzzle = visibleAudioPuzzle(item.audioPuzzle);
  const gate = actionableGate(item);
  const reasonFacts = holdReasonFacts(item);

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
        {item.nextActionLabel && onCommandPrompt ? (
          <ActionButton type="button" onClick={() => onCommandPrompt(activeCoachActionPrompt(item))}>
            <Brain size={14} aria-hidden="true" />
            {item.nextActionLabel}
          </ActionButton>
        ) : item.nextActionLabel ? (
          <SourceChip $tone="purple">{item.nextActionLabel}</SourceChip>
        ) : null}
        <WorkspaceLink to={queueScopedHref(itemReviewHref(item, coachWorkspaceHref), queueScope)} aria-label={`Review intake ${item.title}`}>
          Review
        </WorkspaceLink>
      </ChipColumn>
      {item.holdReason ? (
        <QueueHoldReasonPreview aria-label="Hold reason preview">
          <div>
            <HoldReasonLabel>Gate reason</HoldReasonLabel>
            <HoldReasonTitle>{item.holdReason.label}</HoldReasonTitle>
          </div>
          {reasonFacts.length > 0 ? (
            <HoldReasonFacts>
              {reasonFacts.map((fact) => <HoldReasonFact key={fact}>{fact}</HoldReasonFact>)}
            </HoldReasonFacts>
          ) : null}
        </QueueHoldReasonPreview>
      ) : null}
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
