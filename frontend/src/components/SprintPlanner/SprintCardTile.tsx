/**
 * ============================================================================
 * FILE: SprintCardTile.tsx — R-H17, the keyboard-operable sprint card.
 *
 * WHY THIS FILE EXISTS (and why it is an extraction rather than an edit):
 * `SprintPlannerPage.tsx` was at 298 lines against the rule-4 cap of 300, so giving the card the
 * keyboard support the register asks for pushed the page over it. Rule 4 says extract — and the card
 * is the right unit, because the interaction belongs WITH the card rather than with the page that
 * lists it. The page keeps the layout; this file owns one card and its activation contract.
 *
 * THE DEFECT IT CLOSES (register row R-H17, `15-audit-findings-and-fix-register.md:65`):
 * "Sprint cards, slots and dialogs support keyboard activation, focus containment/restoration,
 * Escape and named errors." The card was a styled `div` (`SprintCard = styled(Card)`) with a bare
 * `onClick`, so it was reachable by mouse and by nothing else — not by Tab, not by Enter, not by
 * Space — and assistive technology saw no interactive element at all.
 *
 * WHAT THE KEY HANDLER DELIBERATELY DOES NOT DO: it does not activate on "any key". Enter and Space
 * are the two keys the `button` role promises; a handler that fired on everything would be worse than
 * no keyboard support, because a stray keystroke would navigate away from the list. A test pins both
 * halves of that (`SprintPlannerPage.keyboard.test.tsx`): Enter and Space activate, "a" does not.
 *
 * `role="button"` is valid here because the card renders no nested interactive element — only a
 * status badge, meta text and a progress bar. If that ever changes, this element must become a real
 * `<button>` instead, or the nested control becomes unreachable.
 * ============================================================================
 */

import React from 'react';
import type { BootcampSprint } from '../../hooks/useSprintAPI';
import {
  ProgressContainer,
  ProgressFill,
  ProgressText,
  SprintCard,
  SprintCardHeader,
  SprintCardTitle,
  SprintDateRange,
  SprintMeta,
  StatusBadge,
} from './SprintPlannerStyles';

interface SprintCardTileProps {
  sprint: BootcampSprint;
  /** Loads this sprint's detail view. Named `onOpen` so the card does not know how that happens. */
  onOpen: () => void;
}

const SprintCardTile: React.FC<SprintCardTileProps> = ({ sprint, onOpen }) => (
  <SprintCard
    role="button"
    tabIndex={0}
    onClick={onOpen}
    onKeyDown={(event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      // Space would otherwise scroll the page before activating.
      event.preventDefault();
      onOpen();
    }}
  >
    <SprintCardHeader>
      <SprintCardTitle>{sprint.name}</SprintCardTitle>
      <StatusBadge $status={sprint.status}>{sprint.status}</StatusBadge>
    </SprintCardHeader>
    <SprintDateRange>
      {sprint.startDate} &rarr; {sprint.endDate}
    </SprintDateRange>
    <SprintMeta>
      {sprint.durationWeeks} weeks &middot; {sprint.classesPerWeek} classes/week &middot; {sprint.progressionStrategy}
    </SprintMeta>
    <ProgressContainer>
      <ProgressFill $percent={Math.round((sprint.totalClassesCompleted / Math.max(1, sprint.totalClassesPlanned)) * 100)} />
    </ProgressContainer>
    <ProgressText>
      {sprint.totalClassesCompleted}/{sprint.totalClassesPlanned} classes completed
    </ProgressText>
  </SprintCard>
);

export default SprintCardTile;
