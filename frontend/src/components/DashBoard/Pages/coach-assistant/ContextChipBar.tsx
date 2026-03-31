/**
 * ┌─── SUB-COMPONENT: ContextChipBar ──────────────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Scrollable row of context chips for quick switching│
 * │ Props: { activeContext, onContextChange, userRole }         │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useMemo } from 'react';
import { ChipBarWrap, ContextChipBtn } from './SwanCoachStyles';
import { CONTEXT_CHIPS } from './SwanCoachConstants';
import type { CoachContext } from './SwanCoachTypes';

interface ContextChipBarProps {
  activeContext: CoachContext;
  onContextChange: (context: CoachContext) => void;
  userRole?: 'admin' | 'trainer' | 'client';
}

const ContextChipBarComponent: React.FC<ContextChipBarProps> = ({
  activeContext,
  onContextChange,
  userRole = 'admin',
}) => {
  const visibleChips = useMemo(
    () => CONTEXT_CHIPS.filter(c => c.roles.includes(userRole)),
    [userRole]
  );

  return (
    <ChipBarWrap role="toolbar" aria-label="AI context selector">
      {visibleChips.map(chip => (
        <ContextChipBtn
          key={chip.key}
          $active={activeContext === chip.key}
          onClick={() => onContextChange(chip.key)}
          aria-pressed={activeContext === chip.key}
          aria-label={`Switch to ${chip.label} context`}
        >
          <span aria-hidden="true">{chip.emoji}</span>
          {chip.label}
        </ContextChipBtn>
      ))}
    </ChipBarWrap>
  );
};

export const ContextChipBar = memo(ContextChipBarComponent);
