/**
 * ============================================================================
 * FILE: AegisHudStyles.ts
 * PURPOSE: Styled components for the Aegis HUD needs panel
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Dark-first styled components for the RPG needs bars.
 * Stacked horizontal bars with glow effects, icons, and animated fills.
 * Uses CSS custom properties for theme compatibility.
 */

import styled, { keyframes, css } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframe Animations
// ─────────────────────────────────────────────────────────────

const barFillIn = keyframes`
  from { width: 0%; opacity: 0.5; }
  to { opacity: 1; }
`;

const glowPulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const moodletEntrance = keyframes`
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Container
// ─────────────────────────────────────────────────────────────

export const HudContainer = styled.div<{ $compact?: boolean }>`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 16px;
  padding: ${({ $compact }) => ($compact ? '12px 16px' : '20px 24px')};
  position: relative;
  overflow: hidden;

  /* Subtle inner glow */
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg,
      transparent 0%,
      var(--accent-primary, #60C0F0) 50%,
      transparent 100%
    );
    opacity: 0.3;
  }
`;

export const HudHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

export const HudTitle = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-secondary, #94a3b8);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg { color: var(--accent-primary, #60C0F0); }
`;

export const OverallHealth = styled.span<{ $value: number }>`
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  font-weight: 500;
  color: ${({ $value }) =>
    $value >= 70 ? 'var(--accent-primary, #60C0F0)' :
    $value >= 40 ? 'var(--accent-gold, #C6A84B)' :
    '#C92A54'
  };
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Need Bar
// ─────────────────────────────────────────────────────────────

export const NeedBarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;

  &:not(:last-child) {
    border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  }
`;

export const NeedIcon = styled.div<{ $color: string }>`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 12%, transparent)`};
  color: ${({ $color }) => $color};
  flex-shrink: 0;

  svg { width: 16px; height: 16px; }
`;

export const NeedInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const NeedLabelRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 4px;
`;

export const NeedLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
  letter-spacing: 0.3px;
`;

export const NeedValue = styled.span<{ $color: string; $value: number }>`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 500;
  color: ${({ $value }) =>
    $value >= 70 ? 'var(--text-primary, #E0ECF4)' :
    $value >= 30 ? 'var(--text-secondary, #94a3b8)' :
    '#C92A54'
  };
`;

export const BarTrack = styled.div`
  width: 100%;
  height: 6px;
  background: var(--bg-base, #0A0A0F);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
`;

export const BarFill = styled.div<{ $width: number; $color: string; $animate?: boolean }>`
  height: 100%;
  border-radius: 3px;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  position: relative;
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);

  ${({ $animate }) => $animate && css`
    animation: ${barFillIn} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  `}

  /* Glow effect on the bar */
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    right: -2px;
    bottom: -2px;
    width: 20px;
    border-radius: 3px;
    background: ${({ $color }) => $color};
    filter: blur(6px);
    opacity: 0.4;
    animation: ${glowPulse} 2s ease-in-out infinite;
  }

  /* Shimmer on high values */
  ${({ $width }) => $width >= 80 && css`
    background-size: 200% 100%;
    background-image: linear-gradient(
      90deg,
      ${({ $color }: { $color: string }) => $color} 0%,
      ${({ $color }: { $color: string }) => `color-mix(in srgb, ${$color} 70%, white)`} 50%,
      ${({ $color }: { $color: string }) => $color} 100%
    );
    animation: ${shimmer} 3s ease-in-out infinite;
  `}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Moodlet Badge
// ─────────────────────────────────────────────────────────────

export const MoodletContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  animation: ${moodletEntrance} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

export const MoodletPill = styled.span<{ $size?: 'sm' | 'md' | 'lg' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: ${({ $size }) =>
    $size === 'sm' ? '2px 8px' :
    $size === 'lg' ? '6px 14px' :
    '4px 10px'
  };
  border-radius: 100px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: ${({ $size }) => $size === 'sm' ? '10px' : $size === 'lg' ? '13px' : '11px'};
  font-weight: 500;
  color: var(--accent-primary, #60C0F0);
  letter-spacing: 0.3px;
  white-space: nowrap;

  svg { width: ${({ $size }) => $size === 'sm' ? '10px' : '12px'}; height: auto; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Loading State
// ─────────────────────────────────────────────────────────────

const skeletonShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const SkeletonBar = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    90deg,
    var(--bg-base, #0A0A0F) 25%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, var(--bg-base, #0A0A0F)) 50%,
    var(--bg-base, #0A0A0F) 75%
  );
  background-size: 200% 100%;
  animation: ${skeletonShimmer} 1.5s ease-in-out infinite;
`;

export const SkeletonLabel = styled.div`
  width: 80px;
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--bg-base, #0A0A0F) 25%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, var(--bg-base, #0A0A0F)) 50%,
    var(--bg-base, #0A0A0F) 75%
  );
  background-size: 200% 100%;
  animation: ${skeletonShimmer} 1.5s ease-in-out infinite;
`;
