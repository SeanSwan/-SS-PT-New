/**
 * ┌─── SUB-COMPONENT: OverloadSuggestion ─────────────────────┐
 * │ PARENT: ExerciseCardComponent                               │
 * │ PURPOSE: Shows a tappable pill suggesting progressive       │
 * │ overload (+2.5 lbs or +1 rep) based on last session data.   │
 * │ Tap to apply the suggestion instantly.                       │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────┐                                  │
 * │ │ ↑ +2.5 lbs             │ (tappable cyan pill)            │
 * │ └────────────────────────┘                                  │
 * │ Props: { suggestion, onApply }                              │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import styled from 'styled-components';
import { TrendingUp } from 'lucide-react';
import { CS, reducedMotionSafe, withAlpha } from './WorkoutLoggerCS';
import type { OverloadSuggestion as OverloadSuggestionType } from './useGhostPreFill';

interface OverloadSuggestionProps {
  suggestion: OverloadSuggestionType | null;
  onApply: () => void;
}

const OverloadSuggestionComponent: React.FC<OverloadSuggestionProps> = React.memo(({
  suggestion,
  onApply,
}) => {
  if (!suggestion) return null;

  return (
    <Pill
      type="button"
      onClick={onApply}
      aria-label={`Apply progressive overload: ${suggestion.label}`}
      title={`Last: ${suggestion.current} lbs → Suggested: ${suggestion.suggested} lbs`}
    >
      <TrendingUp size={12} />
      {suggestion.label}
    </Pill>
  );
});

OverloadSuggestionComponent.displayName = 'OverloadSuggestion';
export default OverloadSuggestionComponent;

// ── Styled Components ──

const Pill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  min-width: 44px;
  background: ${withAlpha(CS.gaming, 0.1)};
  border: 1px solid ${withAlpha(CS.gaming, 0.25)};
  border-radius: 999px;
  color: ${CS.gaming};
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.15;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  svg {
    flex-shrink: 0;
    color: ${CS.gaming};
  }

  &:hover {
    background: ${withAlpha(CS.gaming, 0.2)};
    border-color: ${withAlpha(CS.gaming, 0.5)};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${withAlpha(CS.gaming, 0.2)};
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }

  ${reducedMotionSafe}
`;
