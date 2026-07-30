/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ StageRail — SESSION SHELL zone 3.                           │
 * │ Setup · Train · Finish as FREE tabs (M2): non-gating,       │
 * │ re-enterable, no completion semantics — dots, never         │
 * │ checkmarks, and NEVER gold (gold = earned only). The active │
 * │ tab wears the world accent; switching goes through          │
 * │ switchSessionStage so scroll memory is saved pre-swap.      │
 * │ Recipes may render this as tabs/segmented/detents (§3);     │
 * │ v1 ships the tab form.                                      │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import {
  SESSION_STAGES,
  switchSessionStage,
  useSessionStage,
  type SessionStageStore,
} from '../useSessionStage';
import { STAGE_LABELS } from '../primitives/StageCanvas';

const Rail = styled.div`
  display: flex;
  gap: 6px;
  padding: 6px 12px;
  font-family: 'Sora', sans-serif;
`;

const StageTab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex: 1;
  min-height: 44px;
  border-radius: 10px;
  font: 700 0.82rem 'Sora', sans-serif;
  cursor: pointer;
  border: 1px solid ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--world-accent, #60c0f0) 55%, transparent)'
      : 'color-mix(in srgb, var(--text-primary, #e0ecf4) 12%, transparent)'};
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--world-accent, #60c0f0) 14%, transparent)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--text-primary, #e0ecf4)' : 'var(--text-muted, #94a3b8)'};

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;

/** A view dot — world accent when active, dim otherwise. NEVER gold. */
const Dot = styled.span<{ $active: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $active }) =>
    $active ? 'var(--world-accent, #60c0f0)' : 'color-mix(in srgb, var(--text-muted, #94a3b8) 55%, transparent)'};
`;

const StageRail: React.FC<{ store: SessionStageStore }> = ({ store }) => {
  const [stage] = useSessionStage(store);

  return (
    <Rail data-shell-zone='stage-rail' role='tablist' aria-label='Session stages'>
      {SESSION_STAGES.map((target) => (
        <StageTab
          key={target}
          type='button'
          role='tab'
          aria-selected={stage === target}
          $active={stage === target}
          onClick={() => switchSessionStage(store, target)}
        >
          <Dot $active={stage === target} aria-hidden='true' />
          {STAGE_LABELS[target]}
        </StageTab>
      ))}
    </Rail>
  );
};

export default StageRail;
