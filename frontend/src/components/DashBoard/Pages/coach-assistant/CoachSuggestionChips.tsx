/**
 * ┌─── SUB-COMPONENT: CoachSuggestionChips ───────────────────┐
 * │ PARENT: SwanCoachMessagesPanel                              │
 * │ PURPOSE: B1a — role-aware next-action chips after a reply   │
 * │ Props: { chips, visible, onSelect }                         │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Chip click] → onSelect(chipText) → same send path as text │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Quiet glass buttons (C12), not glow CTAs — they invite the next
 * action without shouting over the Coach's reply above them.
 * Visibility is opacity/pointer-events driven on an always-mounted slot
 * (chips stay in the DOM), so toggling never shifts the message list —
 * same CLS contract as ThinkingIndicator's StableSlot (Phase 11.1).
 */

import React, { memo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { fadeIn } from './styles/CoachAnimations';

const chipsEnter = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const ChipsSlot = styled.div<{ $visible: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0 8px;
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  pointer-events: ${(p) => (p.$visible ? 'auto' : 'none')};
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  /* Rule 43: keyframes interpolation requires the css\`\` helper. */
  ${(p) =>
    p.$visible &&
    css`
      animation: ${chipsEnter} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;

const Chip = styled.button`
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, var(--bg-elevated, #141419));
    border-color: var(--accent-primary, #60C0F0);
    color: var(--text-primary, #E0ECF4);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  /* Rule 43: keyframes interpolation requires the css\`\` helper. */
  ${css`
    animation: ${fadeIn} 0.25s ease;
  `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;

    &:hover,
    &:active {
      transform: none;
    }
  }
`;

interface CoachSuggestionChipsProps {
  chips: string[];
  visible: boolean;
  onSelect: (chip: string) => void;
}

const CoachSuggestionChips: React.FC<CoachSuggestionChipsProps> = memo(
  ({ chips, visible, onSelect }) => (
    <ChipsSlot
      $visible={visible}
      aria-hidden={!visible}
      data-testid="coach-suggestion-chips"
      role="group"
      aria-label="Suggested next actions"
    >
      {chips.map((chip) => (
        <Chip
          type="button"
          key={chip}
          onClick={() => onSelect(chip)}
          tabIndex={visible ? 0 : -1}
        >
          {chip}
        </Chip>
      ))}
    </ChipsSlot>
  ),
);

CoachSuggestionChips.displayName = 'CoachSuggestionChips';

export default CoachSuggestionChips;
