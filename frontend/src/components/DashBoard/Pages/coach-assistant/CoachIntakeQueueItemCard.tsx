/**
 * CoachIntakeQueueItemCard.tsx
 * ============================
 * Compact queue row for Coach intake work items.
 */
import React from 'react';
import { Brain, GitBranch } from 'lucide-react';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import { holdReasonFacts, safeHoldReasonLabel } from './CoachIntakeHoldReason.logic';
import { safeActionableGate, safeAudioConfidenceLabel, safeCommandActionLabel } from './CoachIntakeOperationalText.logic';
import { AudioPuzzleLabel, AudioPuzzleRow } from './CoachIntakeWorkspaceAudio.styles';
import { ActionButton, ChipColumn, ItemCard, ItemTitle, QueueActions, QueueMetaChips, SourceChip, WorkspaceLink } from './CoachIntakeWorkspace.styles';
import { HoldReasonFact, HoldReasonFacts, HoldReasonLabel, HoldReasonTitle, QueueHoldReasonPreview } from './CoachIntakeWorkspaceHoldReason.styles';
import {
  activeCoachActionPrompt,
  itemDisplayTitle,
  itemMeta,
  itemReviewHref,
  itemSourceLabel,
  plural,
  queueScopedHref,
  visibleAudioPuzzle,
} from './CoachIntakeWorkspace.utils';

interface CoachIntakeQueueItemCardProps {
  item: CoachIntakeItem;
  active: boolean;
  coachWorkspaceHref: string;
  onCommandPrompt?: (message: string) => void;
  queueScope?: string;
}

function actionableGate(item: CoachIntakeItem): string | null {
  return safeActionableGate(item.nextBlockingGate);
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
  const nextActionLabel = safeCommandActionLabel(item.nextActionLabel);
  const holdReasonLabel = safeHoldReasonLabel(item);
  const reasonFacts = holdReasonFacts(item);
  const displayTitle = itemDisplayTitle(item);

  return (
    <ItemCard
      $active={active}
      aria-current={active ? 'true' : undefined}
      aria-label={`Queue item ${displayTitle}`}
    >
      <ItemTitle>
        <strong>{displayTitle}</strong>
        <span>{itemMeta(item)}</span>
      </ItemTitle>
      <ChipColumn>
        <QueueMetaChips aria-label="Queue item signals">
          <SourceChip>{itemSourceLabel(item)}</SourceChip>
          {active && <SourceChip $tone="gold">Selected intake</SourceChip>}
          {gate && <SourceChip $tone="gold">{gate}</SourceChip>}
          {nextActionLabel && !onCommandPrompt ? <SourceChip $tone="purple">{nextActionLabel}</SourceChip> : null}
        </QueueMetaChips>
        <QueueActions aria-label="Queue item next actions">
          <WorkspaceLink to={queueScopedHref(itemReviewHref(item, coachWorkspaceHref), queueScope)} aria-label={`Review intake ${displayTitle}`} $primary>
            Review
          </WorkspaceLink>
          {nextActionLabel && onCommandPrompt ? (
            <ActionButton type="button" onClick={() => onCommandPrompt(activeCoachActionPrompt(item))}>
              <Brain size={14} aria-hidden="true" />
              {nextActionLabel}
            </ActionButton>
          ) : null}
        </QueueActions>
      </ChipColumn>
      {item.holdReason && holdReasonLabel ? (
        <QueueHoldReasonPreview aria-label="Hold reason preview">
          <div>
            <HoldReasonLabel>Gate reason</HoldReasonLabel>
            <HoldReasonTitle>{holdReasonLabel}</HoldReasonTitle>
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
          <span>{safeAudioConfidenceLabel(audioPuzzle.confidence)}</span>
          {audioPuzzle.needsOrderingReview && <SourceChip $tone="gold">order review</SourceChip>}
        </AudioPuzzleRow>
      )}
    </ItemCard>
  );
}

export default CoachIntakeQueueItemCard;
