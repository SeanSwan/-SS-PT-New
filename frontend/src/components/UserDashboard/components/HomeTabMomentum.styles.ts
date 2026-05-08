/**
 * ============================================================================
 * FILE: HomeTabMomentum.styles.ts
 * PURPOSE: Momentum-card styled-components for the /user-dashboard Home tab.
 * AUTHOR: Codex GPT-5 | CREATED: 2026-05-07
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Owns the HomeTab streak, level, and XP presentation
 * styles that were previously embedded in HomeTab.tsx.
 *
 * HOW IT FITS IN THE APP: Imported only by HomeTab.tsx to keep the canonical
 * Home surface under the repo file-size cap without changing runtime behavior.
 *
 * KEY DECISIONS:
 * - Keeps existing Crystalline Swan token fallbacks.
 * - Uses styled-components css helper for interpolated animation fragments.
 * - Reduced-motion handling remains in CSS plus the HomeTab motion hook.
 */

import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';

const streakPulse = keyframes`
  0%, 100% { filter: drop-shadow(0 0 6px var(--accent-gold, #C6A84B)); }
  50%       { filter: drop-shadow(0 0 16px var(--accent-gold, #C6A84B)); }
`;

const xpShimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`;

export const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
`;

export const MomentumCard = styled(motion.div)`
  display: flex;
  align-items: stretch;
  background: var(--bg-elevated, color-mix(in srgb, var(--surface-primary, #003080) 85%, transparent));
  backdrop-filter: blur(24px);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent);
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent),
    0 16px 40px color-mix(in srgb, var(--bg-base, #0A0A0F) 25%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 4%, transparent);

  @media (max-width: 768px) {
    flex-direction: column;
    border-radius: 16px;
  }

  @media (max-width: 414px) {
    border-radius: 14px;
  }
`;

export const MomentumSection = styled.div<{ $center?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  gap: 0.5rem;
  text-align: center;

  ${({ $center }) =>
    $center &&
    css`
      background: color-mix(in srgb, var(--bg-base, #0A0A0F) 35%, transparent);
    `}

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    text-align: left;
    padding: 1.25rem 1.25rem;
    gap: 1rem;
  }

  @media (max-width: 375px) {
    padding: 1rem;
  }
`;

export const MomentumDivider = styled.div`
  width: 1px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent);
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    height: 1px;
  }
`;

export const MomentumLabel = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted, #64748b);
  margin: 0;
`;

export const MomentumCaption = styled.p<{ $accent?: boolean }>`
  font-size: 0.8rem;
  font-weight: 500;
  color: ${({ $accent }) =>
    $accent
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--text-secondary, #94a3b8)'};
  margin: 0;
`;

export const StreakValue = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: 'Fira Code', monospace;
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1;
  color: ${({ $active }) =>
    $active ? 'var(--accent-gold, #C6A84B)' : 'var(--text-muted, #64748b)'};

  ${({ $active }) =>
    $active &&
    css`
      animation: ${streakPulse} 3s ease-in-out infinite;
    `}

  svg {
    color: ${({ $active }) =>
      $active ? 'var(--accent-gold, #C6A84B)' : 'var(--text-muted, #64748b)'};
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const LevelBadge = styled.div<{ $tierColor: string }>`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    circle at 35% 35%,
    ${({ $tierColor }) => $tierColor}1A 0%,
    var(--bg-base, #0A0A0F) 70%
  );
  border: 2px solid ${({ $tierColor }) => $tierColor};
  box-shadow:
    0 0 20px ${({ $tierColor }) => $tierColor}29,
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 52px;
    height: 52px;
  }

  @media (max-width: 375px) {
    width: 44px;
    height: 44px;
  }
`;

export const LevelNumber = styled.span`
  font-family: 'Fira Code', monospace;
  font-weight: 800;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--text-primary, #E0ECF4);

  @media (max-width: 768px) {
    font-size: 1.375rem;
  }

  @media (max-width: 375px) {
    font-size: 1.125rem;
  }
`;

export const XPBarTrack = styled.div`
  width: 100%;
  max-width: 160px;
  height: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);

  @media (max-width: 768px) {
    max-width: 120px;
  }
`;

export const XPBarFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--accent-primary, #60C0F0) 0%,
    var(--accent-purple, #8B5CF6) 50%,
    var(--accent-primary, #60C0F0) 100%
  );
  background-size: 200% 100%;
  border-radius: 4px;
  box-shadow: 0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  animation: ${xpShimmer} 2.5s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-size: 100% 100%;
  }
`;
