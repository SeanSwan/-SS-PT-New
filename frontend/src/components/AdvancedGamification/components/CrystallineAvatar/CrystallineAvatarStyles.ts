/**
 * ============================================================================
 * FILE: CrystallineAvatarStyles.ts
 * PURPOSE: Styled components for the evolving geometric crystal avatar
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * ============================================================================
 */

import styled, { keyframes, css } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframe Animations
// ─────────────────────────────────────────────────────────────

const crystalFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-3px) rotate(1deg); }
  75% { transform: translateY(3px) rotate(-1deg); }
`;

const crystalRotate = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const innerGlow = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 0.7; transform: scale(1.1); }
`;

const facetShimmer = keyframes`
  0% { opacity: 0.1; }
  50% { opacity: 0.4; }
  100% { opacity: 0.1; }
`;

const legendaryPulse = keyframes`
  0% {
    filter: drop-shadow(0 0 12px var(--glow-1)) drop-shadow(0 0 24px var(--glow-2));
  }
  33% {
    filter: drop-shadow(0 0 16px var(--glow-2)) drop-shadow(0 0 32px var(--glow-3));
  }
  66% {
    filter: drop-shadow(0 0 12px var(--glow-3)) drop-shadow(0 0 24px var(--glow-1));
  }
  100% {
    filter: drop-shadow(0 0 12px var(--glow-1)) drop-shadow(0 0 24px var(--glow-2));
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Container
// ─────────────────────────────────────────────────────────────

export const AvatarContainer = styled.div<{ $size: number; $animated: boolean }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  ${({ $animated }) => $animated && css`
    animation: ${crystalFloat} 4s ease-in-out infinite;
  `}

  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    * { animation: none !important; }
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Crystal SVG Wrapper
// ─────────────────────────────────────────────────────────────

export const CrystalSvg = styled.svg<{ $glowColor: string; $isLegendary: boolean }>`
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 8px ${({ $glowColor }) => $glowColor});

  ${({ $isLegendary }) => $isLegendary && css`
    --glow-1: #002060;
    --glow-2: #8B5CF6;
    --glow-3: #60C0F0;
    animation: ${legendaryPulse} 3s ease-in-out infinite;
  `}
`;

export const CrystalBody = styled.polygon<{ $primary: string; $secondary: string; $opacity: number }>`
  fill: ${({ $primary }) => $primary};
  fill-opacity: ${({ $opacity }) => $opacity};
  stroke: ${({ $secondary }) => $secondary};
  stroke-width: 1;
  stroke-opacity: 0.6;
`;

export const CrystalFacet = styled.polygon<{ $color: string; $delay: number }>`
  fill: ${({ $color }) => $color};
  fill-opacity: 0.15;
  animation: ${facetShimmer} 3s ease-in-out ${({ $delay }) => $delay}s infinite;
`;

export const InnerGlowCircle = styled.circle<{ $color: string }>`
  fill: ${({ $color }) => $color};
  fill-opacity: 0.3;
  animation: ${innerGlow} 2.5s ease-in-out infinite;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Job Class Icon Overlay
// ─────────────────────────────────────────────────────────────

export const JobClassOverlay = styled.div<{ $color: string }>`
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1.5px solid ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 0 8px color-mix(in srgb, ${({ $color }) => $color} 40%, transparent);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Tier Label
// ─────────────────────────────────────────────────────────────

export const TierLabel = styled.div<{ $color: string }>`
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Sora', sans-serif;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ $color }) => $color};
  white-space: nowrap;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Orbital Ring (high tiers only)
// ─────────────────────────────────────────────────────────────

export const OrbitalRing = styled.div<{ $color: string; $speed: number }>`
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, ${({ $color }) => $color} 20%, transparent);
  animation: ${crystalRotate} ${({ $speed }) => $speed}s linear infinite;

  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 50%;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    box-shadow: 0 0 6px ${({ $color }) => $color};
  }
`;
