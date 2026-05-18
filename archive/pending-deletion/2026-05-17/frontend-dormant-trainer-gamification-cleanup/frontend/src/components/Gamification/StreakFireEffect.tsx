/**
 * ============================================================================
 * FILE: StreakFireEffect.tsx
 * PURPOSE: Animated fire/ice particle effect for streak milestones
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders animated particles around a streak counter
 * element when the user hits milestone streaks (7, 30, 90, 365 days).
 * Uses pure CSS keyframes for performance. Supports prefers-reduced-motion
 * by falling back to a simple static glow.
 *
 * HOW IT FITS IN THE APP: Wraps or overlays the streak counter in profile
 * headers, gamification dashboards, and social profile cards.
 *
 * KEY DECISIONS: CSS-only animation (no JS animation libraries). Fire
 * particles for 7/30-day streaks, ice particles for 90/365-day streaks
 * to match the Crystalline Swan theme progression. All animations use
 * transform + opacity only.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: StreakFireEffect                                  ║
 * ║  PURPOSE: Particle effect around streak counter at milestones ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────┐
 * │  🔥  *  ·                  │
 * │    · [STREAK: 30] *  🔥   │
 * │  *   ·              ·     │
 * └────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { streakDays, children }
 * State:     None (pure CSS-driven)
 * Children:  Wraps streak counter element
 */

import React, { useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Streak Milestone Configuration
// PURPOSE: Define which milestones trigger effects and their style
// ─────────────────────────────────────────────────────────────

type StreakTier = 'none' | 'fire_7' | 'fire_30' | 'ice_90' | 'ice_365';

interface StreakConfig {
  tier: StreakTier;
  particleCount: number;
  colors: string[];
  glowColor: string;
}

/**
 * Determine streak tier from day count.
 * Higher milestones override lower ones.
 */
function getStreakConfig(days: number): StreakConfig {
  if (days >= 365) {
    return {
      tier: 'ice_365',
      particleCount: 14,
      colors: ['#60C0F0', '#E0ECF4', '#8B5CF6', '#C6A84B'],
      glowColor: 'rgba(96, 192, 240, 0.5)',
    };
  }
  if (days >= 90) {
    return {
      tier: 'ice_90',
      particleCount: 12,
      colors: ['#60C0F0', '#50A0F0', '#E0ECF4'],
      glowColor: 'rgba(96, 192, 240, 0.4)',
    };
  }
  if (days >= 30) {
    return {
      tier: 'fire_30',
      particleCount: 10,
      colors: ['#FF6B35', '#FFD700', '#FF4500'],
      glowColor: 'rgba(255, 107, 53, 0.4)',
    };
  }
  if (days >= 7) {
    return {
      tier: 'fire_7',
      particleCount: 8,
      colors: ['#FF6B35', '#FF8C00', '#FFA500'],
      glowColor: 'rgba(255, 107, 53, 0.3)',
    };
  }
  return { tier: 'none', particleCount: 0, colors: [], glowColor: 'transparent' };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframe Animations
// PURPOSE: CSS-only particle movement using transform + opacity
// ─────────────────────────────────────────────────────────────

// Fire particle: rises and fades
const fireRise = keyframes`
  0% {
    transform: translateY(0) scale(1);
    opacity: 0.9;
  }
  50% {
    transform: translateY(-18px) scale(1.1);
    opacity: 0.6;
  }
  100% {
    transform: translateY(-36px) scale(0.4);
    opacity: 0;
  }
`;

// Ice particle: drifts outward and fades
const iceDrift = keyframes`
  0% {
    transform: translate(0, 0) scale(0.8);
    opacity: 0.8;
  }
  50% {
    transform: translate(var(--dx, 8px), var(--dy, -12px)) scale(1);
    opacity: 0.5;
  }
  100% {
    transform: translate(calc(var(--dx, 8px) * 2), calc(var(--dy, -12px) * 2)) scale(0.3);
    opacity: 0;
  }
`;

// Ambient glow pulse (reduced-motion fallback uses this alone)
const ambientGlow = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
  }
`;

const Wrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const ParticleField = styled.div`
  position: absolute;
  inset: -16px;
  pointer-events: none;
  overflow: visible;
`;

const FireParticle = styled.div<{
  $color: string;
  $left: string;
  $delay: number;
  $duration: number;
}>`
  position: absolute;
  bottom: 0;
  left: ${({ $left }) => $left};
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  animation: ${fireRise} ${({ $duration }) => $duration}s ease-out ${({ $delay }) => $delay}s infinite;
  ${reducedMotion}
`;

const IceParticle = styled.div<{
  $color: string;
  $top: string;
  $left: string;
  $dx: number;
  $dy: number;
  $delay: number;
  $duration: number;
}>`
  position: absolute;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  --dx: ${({ $dx }) => $dx}px;
  --dy: ${({ $dy }) => $dy}px;
  animation: ${iceDrift} ${({ $duration }) => $duration}s ease-out ${({ $delay }) => $delay}s infinite;
  ${reducedMotion}
`;

const GlowRing = styled.div<{ $glowColor: string; $active: boolean }>`
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: transparent;
  box-shadow: ${({ $active, $glowColor }) => $active ? `0 0 16px ${$glowColor}, 0 0 32px ${$glowColor}` : 'none'};
  animation: ${({ $active }) => $active ? css`${ambientGlow} 2.5s ease-in-out infinite` : 'none'};
  pointer-events: none;

  /* Reduced motion: show static glow only */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: ${({ $active }) => $active ? 0.5 : 0};
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Props & Component
// ─────────────────────────────────────────────────────────────

export interface StreakFireEffectProps {
  /** Current streak in days */
  streakDays: number;
  /** The streak counter element to wrap */
  children: React.ReactNode;
  /** Optional className for styling the wrapper */
  className?: string;
}

const StreakFireEffect: React.FC<StreakFireEffectProps> = ({
  streakDays,
  children,
  className,
}) => {
  const config = useMemo(() => getStreakConfig(streakDays), [streakDays]);

  // Memoize particle data to avoid regenerating on every render
  const particles = useMemo(() => {
    if (config.tier === 'none') return [];
    const isIce = config.tier === 'ice_90' || config.tier === 'ice_365';

    return Array.from({ length: config.particleCount }, (_, i) => {
      const color = config.colors[i % config.colors.length];
      if (isIce) {
        // Ice particles: distributed around the element
        const angle = (360 / config.particleCount) * i;
        const rad = (angle * Math.PI) / 180;
        return {
          type: 'ice' as const,
          color,
          top: `${50 + Math.sin(rad) * 40}%`,
          left: `${50 + Math.cos(rad) * 40}%`,
          dx: Math.cos(rad) * 12,
          dy: Math.sin(rad) * -12,
          delay: (i * 0.3) % 2,
          duration: 2 + Math.random() * 1.5,
        };
      }
      // Fire particles: rise from bottom
      return {
        type: 'fire' as const,
        color,
        left: `${10 + (80 / config.particleCount) * i + Math.random() * 8}%`,
        delay: (i * 0.25) % 2,
        duration: 1.2 + Math.random() * 0.8,
      };
    });
  }, [config]);

  if (config.tier === 'none') {
    return <>{children}</>;
  }

  return (
    <Wrapper className={className}>
      <GlowRing $glowColor={config.glowColor} $active />
      <ParticleField aria-hidden="true">
        {particles.map((p, i) =>
          p.type === 'fire' ? (
            <FireParticle
              key={i}
              $color={p.color}
              $left={p.left!}
              $delay={p.delay}
              $duration={p.duration}
            />
          ) : (
            <IceParticle
              key={i}
              $color={p.color}
              $top={(p as any).top}
              $left={(p as any).left}
              $dx={(p as any).dx}
              $dy={(p as any).dy}
              $delay={p.delay}
              $duration={p.duration}
            />
          )
        )}
      </ParticleField>
      {children}
    </Wrapper>
  );
};

export default React.memo(StreakFireEffect);
