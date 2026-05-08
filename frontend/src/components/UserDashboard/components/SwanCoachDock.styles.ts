/**
 * ============================================================================
 * FILE: SwanCoachDock.styles.ts
 * PURPOSE: Shared and elite styled-components for SwanCoachDock.
 * AUTHOR: Codex GPT-5 | CREATED: 2026-05-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Holds the container and elite quick-action styles for
 * SwanCoachDock so the render component stays under the repo line limit.
 */

import { motion } from 'framer-motion';
import styled, { css, keyframes } from 'styled-components';

export const coachPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-primary, #60C0F0) 0%, transparent);
  }
  50% {
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  }
`;

export const DockCard = styled(motion.div)<{ $elite: boolean }>`
  position: relative;
  overflow: hidden;
  border: 1px solid
    ${({ $elite }) =>
      $elite
        ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent)'
        : 'color-mix(in srgb, var(--accent-purple, #8B5CF6) 20%, transparent)'};
  border-radius: 20px;
  background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
  backdrop-filter: blur(24px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.03),
    0 8px 32px rgba(0, 0, 0, 0.2);

  ${({ $elite }) =>
    $elite &&
    css`
      animation: ${coachPulse} 4s ease-in-out infinite;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 414px) {
    border-radius: 16px;
  }
`;

export const DockAccent = styled.div<{ $elite: boolean }>`
  height: 3px;
  background: ${({ $elite }) =>
    $elite
      ? 'linear-gradient(90deg, var(--accent-primary, #60C0F0) 0%, var(--accent-purple, #8B5CF6) 50%, var(--accent-gold, #C6A84B) 100%)'
      : 'linear-gradient(90deg, var(--accent-purple, #8B5CF6) 0%, color-mix(in srgb, var(--accent-purple, #8B5CF6) 30%, transparent) 100%)'};
`;

export const DockInner = styled.div`
  padding: 1.25rem 1.5rem 1.5rem;

  @media (max-width: 414px) {
    padding: 1rem 1rem 1.25rem;
  }

  @media (max-width: 320px) {
    padding: 0.875rem 0.875rem 1rem;
  }
`;

export const EliteHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  margin-bottom: 1.125rem;
`;

export const CoachAvatar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  border: 2px solid var(--accent-primary, #60C0F0);
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 35%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent) 0%,
    var(--bg-base, #0A0A0F) 70%
  );
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

export const EliteGreeting = styled.div`
  flex: 1;
  min-width: 0;
`;

export const GreetingName = styled.p`
  overflow: hidden;
  margin: 0 0 0.2rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const GreetingSubtext = styled.p`
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.775rem;
  font-weight: 400;
  line-height: 1.4;
`;

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const ActionChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 44px;
  height: 44px;
  padding: 0 0.875rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 22px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
  white-space: nowrap;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  svg {
    flex-shrink: 0;
  }

  @media (max-width: 375px) {
    padding: 0 0.75rem;
    font-size: 0.75rem;
  }
`;
