/**
 * ============================================================================
 * FILE: SwanCoachDockTeaser.styles.ts
 * PURPOSE: Teaser and upgrade CTA styled-components for SwanCoachDock.
 * AUTHOR: Codex GPT-5 | CREATED: 2026-05-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Holds the non-elite Swan Coach teaser styles so the
 * render component remains focused on behavior and markup.
 */

import styled, { keyframes } from 'styled-components';

const upgradePulse = keyframes`
  0%, 100% {
    box-shadow:
      0 0 0 0 color-mix(in srgb, var(--accent-purple, #8B5CF6) 0%, transparent),
      0 4px 16px color-mix(in srgb, var(--accent-purple, #8B5CF6) 25%, transparent);
  }
  50% {
    box-shadow:
      0 0 0 6px color-mix(in srgb, var(--accent-purple, #8B5CF6) 12%, transparent),
      0 4px 24px color-mix(in srgb, var(--accent-purple, #8B5CF6) 40%, transparent);
  }
`;

const teaserFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
`;

export const TeaserLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const TeaserTop = styled.div`
  display: flex;
  align-items: center;
  gap: 0.875rem;
`;

export const TeaserIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  border: 2px solid color-mix(in srgb, var(--accent-purple, #8B5CF6) 40%, transparent);
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 35%,
    color-mix(in srgb, var(--accent-purple, #8B5CF6) 12%, transparent) 0%,
    var(--bg-base, #0A0A0F) 70%
  );
  color: var(--accent-purple, #8B5CF6);
  flex-shrink: 0;
  animation: ${teaserFloat} 3.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const TeaserText = styled.div`
  flex: 1;
  min-width: 0;
`;

export const TeaserTitle = styled.p`
  margin: 0 0 0.2rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
`;

export const TeaserSub = styled.p`
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.75rem;
  line-height: 1.4;
`;

export const PillRow = styled.div`
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 320px) {
    flex-wrap: wrap;
    overflow-x: visible;
  }
`;

export const CapabilityPill = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 0.3rem;
  padding: 0.3rem 0.65rem;
  border: 1px solid color-mix(in srgb, var(--accent-purple, #8B5CF6) 18%, transparent);
  border-radius: 20px;
  background: color-mix(in srgb, var(--accent-purple, #8B5CF6) 7%, transparent);
  color: color-mix(in srgb, var(--accent-purple, #8B5CF6) 75%, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
`;

export const LockDot = styled.span`
  display: inline-block;
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-purple, #8B5CF6) 40%, transparent);
`;

export const UpgradeCTA = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 44px;
  padding: 0 1.25rem;
  border: 1px solid color-mix(in srgb, var(--accent-purple, #8B5CF6) 50%, transparent);
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    var(--accent-purple, #8B5CF6) 0%,
    color-mix(in srgb, var(--accent-purple, #8B5CF6) 70%, transparent) 100%
  );
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  animation: ${upgradePulse} 3s ease-in-out infinite;
  transition: opacity 0.18s ease, transform 0.12s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-purple, #8B5CF6);
    outline-offset: 2px;
  }

  svg {
    flex-shrink: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const UpgradeLabel = styled.span`
  flex: 1;
  text-align: left;
`;
