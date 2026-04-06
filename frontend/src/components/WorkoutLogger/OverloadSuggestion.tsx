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
import { CS, reducedMotionSafe } from './WorkoutLoggerCS';
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
  padding: 0.2rem 0.5rem;
  min-height: 28px;
  min-width: 44px;
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 999px;
  color: ${CS.gaming};
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  svg {
    flex-shrink: 0;
    color: ${CS.gaming};
  }

  &:hover {
    background: rgba(96, 192, 240, 0.2);
    border-color: rgba(96, 192, 240, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(96, 192, 240, 0.2);
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
