/**
 * ┌─── SUB-COMPONENT: ContextChipBar ──────────────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Informational capability taxonomy — describes what │
 * │          Swan Coach can help with. NON-interactive.         │
 * │ Props: { userRole }                                         │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Phase 9.1 hotfix 2026-04-14:
 * Previously this row rendered as interactive chip controls that called
 * coach.switchContext on tap. Users perceived them as dead — the visual
 * affordance was misleading for what is really just a capability
 * description. Per the Phase 3 design spec, the row is now an
 * informational taxonomy with a clear section heading, no click
 * handlers, no hover/active states, and default cursor.
 *
 * The programmatic switchContext API remains available on
 * useCoachAssistant for internal callers (Neural Link pill etc) — only
 * the prominent visible strip is informational.
 */

import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { CONTEXT_CHIPS } from './SwanCoachConstants';

interface ContextChipBarProps {
  userRole?: 'admin' | 'trainer' | 'client';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styles — informational taxonomy, non-interactive
// ─────────────────────────────────────────────────────────────

const InfoBar = styled.section`
  padding: 8px 16px 10px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));

  @media (min-width: 1024px) {
    padding: 10px 24px 12px;
  }

  @media (min-width: 2560px) {
    padding: 12px 32px 14px;
  }
`;

const InfoLabel = styled.h2`
  margin: 0 0 6px 0;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '';
    width: 14px;
    height: 1px;
    background: var(--accent-primary, #60C0F0);
    opacity: 0.5;
  }

  @media (min-width: 1200px) {
    font-size: 11.5px;
  }
`;

const InfoList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;

  @media (min-width: 1024px) {
    gap: 8px 14px;
  }
`;

const InfoItem = styled.li`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 0;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  white-space: nowrap;
  /* Non-interactive: the row is a capability list, not a control. No
     hover state, no transform, default cursor, no focus outline. */
  cursor: default;
  user-select: none;

  @media (max-width: 430px) {
    font-size: 11px;
    gap: 3px;
  }

  @media (min-width: 768px) {
    font-size: 12.5px;
  }

  @media (min-width: 2560px) {
    font-size: 14px;
  }
`;

const InfoItemEmoji = styled.span`
  font-size: 13px;
  line-height: 1;
  opacity: 0.85;

  @media (max-width: 430px) {
    font-size: 12px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ContextChipBarComponent: React.FC<ContextChipBarProps> = ({ userRole = 'admin' }) => {
  const visibleChips = useMemo(
    () => CONTEXT_CHIPS.filter((c) => c.roles.includes(userRole)),
    [userRole],
  );

  if (visibleChips.length === 0) return null;

  return (
    <InfoBar aria-label="Swan Coach capabilities">
      <InfoLabel>What Swan Coach Can Help With</InfoLabel>
      <InfoList>
        {visibleChips.map((chip) => (
          <InfoItem key={chip.key}>
            <InfoItemEmoji aria-hidden="true">{chip.emoji}</InfoItemEmoji>
            {chip.label}
          </InfoItem>
        ))}
      </InfoList>
    </InfoBar>
  );
};

export const ContextChipBar = memo(ContextChipBarComponent);
