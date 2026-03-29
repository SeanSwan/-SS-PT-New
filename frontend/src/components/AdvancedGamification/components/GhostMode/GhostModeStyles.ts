/**
 * ============================================================================
 * FILE: GhostModeStyles.ts
 * PURPOSE: Styled components for Ghost Mode overlay (Gran Turismo-inspired)
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-29
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides styled components for the ghost mode comparison
 * overlay. Uses the Crystalline Swan dark-first palette with Ice Wing for "ahead"
 * states and Crimson Frost for "behind" states.
 */

import styled, { keyframes, css } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const ghostPulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const ghostSlideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const ghostVictoryBurst = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(96, 192, 240, 0.4); }
  50% { transform: scale(1.02); box-shadow: 0 0 20px 4px rgba(96, 192, 240, 0.3); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(96, 192, 240, 0); }
`;

// Reduced motion: disable all ghost animations for vestibular sensitivities
const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Banner Container
// ─────────────────────────────────────────────────────────────

export const GhostBannerContainer = styled.div<{ $isActive: boolean }>`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid ${({ $isActive }) =>
    $isActive ? 'rgba(96, 192, 240, 0.3)' : 'rgba(224, 236, 244, 0.08)'};
  border-radius: 12px;
  padding: 16px;
  animation: ${ghostSlideIn} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;

  ${({ $isActive }) => $isActive && css`
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.15);
  `}

  ${reducedMotion}
`;

export const GhostHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
`;

export const GhostTitle = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const GhostToggle = styled.button<{ $active: boolean }>`
  min-height: 44px;
  min-width: 44px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) =>
    $active ? 'rgba(96, 192, 240, 0.4)' : 'rgba(224, 236, 244, 0.15)'};
  background: ${({ $active }) =>
    $active ? 'rgba(96, 192, 240, 0.15)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: rgba(96, 192, 240, 0.2);
    border-color: rgba(96, 192, 240, 0.5);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Ghost Stats Display
// ─────────────────────────────────────────────────────────────

export const GhostStatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

export const GhostStatBlock = styled.div<{ $side: 'ghost' | 'current' }>`
  text-align: ${({ $side }) => $side === 'ghost' ? 'right' : 'left'};

  @media (max-width: 430px) {
    text-align: center;
  }
`;

export const GhostStatLabel = styled.span<{ $variant?: 'ghost' | 'current' }>`
  display: block;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 500;
  color: ${({ $variant }) =>
    $variant === 'ghost'
      ? 'rgba(80, 160, 240, 0.7)'
      : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
`;

export const GhostStatValue = styled.span<{ $variant?: 'ghost' | 'current' }>`
  display: block;
  font-family: 'Fira Code', monospace;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ $variant }) =>
    $variant === 'ghost'
      ? 'var(--accent-primary, #50A0F0)'
      : 'var(--text-primary, #E0ECF4)'};
  animation: ${({ $variant }) =>
    $variant === 'ghost' ? css`${ghostPulse} 3s ease-in-out infinite` : 'none'};

  ${reducedMotion}
`;

export const VsIndicator = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-gold, #C6A84B);
  text-align: center;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(198, 168, 75, 0.1);
  border: 1px solid rgba(198, 168, 75, 0.2);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Delta Indicator
// ─────────────────────────────────────────────────────────────

export const DeltaIndicator = styled.div<{ $status: 'ahead' | 'behind' | 'tied' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  font-weight: 600;

  ${({ $status }) => {
    switch ($status) {
      case 'ahead':
        return css`
          color: var(--accent-primary, #60C0F0);
          background: rgba(96, 192, 240, 0.1);
          border: 1px solid rgba(96, 192, 240, 0.25);
          animation: ${ghostVictoryBurst} 2s ease-in-out infinite;
        `;
      case 'behind':
        return css`
          color: #8BA8C8; /* Glacial Ash v2 — WCAG AA 5.2:1 on dark */
          background: rgba(139, 168, 200, 0.1);
          border: 1px solid rgba(139, 168, 200, 0.25);
        `;
      case 'tied':
        return css`
          color: var(--accent-gold, #C6A84B);
          background: rgba(198, 168, 75, 0.1);
          border: 1px solid rgba(198, 168, 75, 0.25);
        `;
    }
  }}

  ${reducedMotion}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Exercise Comparison List
// ─────────────────────────────────────────────────────────────

export const ExerciseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
`;

export const ExerciseRow = styled.div<{ $status: 'beat' | 'tied' | 'lost' | 'skipped' }>`
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border-left: 3px solid ${({ $status }) => {
    switch ($status) {
      case 'beat': return 'var(--accent-primary, #60C0F0)';
      case 'tied': return 'var(--accent-gold, #C6A84B)';
      case 'lost': return '#8BA8C8'; /* Glacial Ash v2 */
      default: return 'rgba(224, 236, 244, 0.15)';
    }
  }};
  font-size: 0.8rem;
`;

export const ExerciseName = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ExerciseVolume = styled.span`
  font-family: 'Fira Code', monospace;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  font-size: 0.75rem;
`;

export const ExerciseDelta = styled.span<{ $positive: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $positive }) =>
    $positive ? 'var(--accent-primary, #60C0F0)' : '#8BA8C8'}; /* Glacial Ash v2 for negative */
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Ghost Source Info
// ─────────────────────────────────────────────────────────────

export const GhostSourceInfo = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(224, 236, 244, 0.06);
`;

export const NoGhostMessage = styled.div`
  text-align: center;
  padding: 24px 16px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;
