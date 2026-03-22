/**
 * ============================================================================
 * FILE: BadgeEarnOverlay.tsx
 * PURPOSE: Full-screen celebration overlay when a user earns a badge/achievement
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Displays a badge earn celebration with rarity-driven
 * particle colors, glow intensity, and a share button for social posting.
 * Badge scales in with spring easing and rarity-colored box-shadow glow.
 *
 * HOW IT FITS IN THE APP: Mounted at app root alongside LevelUpOverlay.
 * Triggered when gamification engine reports a newly earned achievement.
 *
 * KEY DECISIONS: Rarity determines visual intensity. Legendary gets the most
 * particles and brightest glow. Share button dispatches to social feed.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: BadgeEarnOverlay                                 ║
 * ║  PURPOSE: Celebrate achievement unlock with rarity animation  ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────┐
 * │  [Rarity-colored glow backdrop]        │
 * │                                        │
 * │     ✨ rarity particles ✨              │
 * │        ┌──────────┐                    │
 * │        │ Badge Art │ ← spring scale    │
 * │        └──────────┘                    │
 * │     Achievement Unlocked!              │
 * │     "First Workout Complete"           │
 * │          +50 XP                        │
 * │     [ Share ]  [ Continue ]            │
 * └────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { visible, badgeName, badgeEmoji, badgeDescription,
 *              rarity, xpReward, onDismiss, onShare }
 * State:     { dismissing }
 * Children:  None
 *
 * CLICK-OUTCOMES:
 * [Share] → calls onShare prop → creates social post about badge
 * [Continue] / overlay click / Escape → dismisses overlay
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import type { Rarity } from '../../types/gamification';

// ─────────────────────────────────────────────────────────────
// SECTION: Rarity Configuration
// PURPOSE: Map rarity to visual properties (colors, particle count, glow)
// ─────────────────────────────────────────────────────────────

const RARITY_CONFIG: Record<Rarity, {
  color: string;
  glowColor: string;
  glowIntensity: number;
  particleCount: number;
  particleColors: string[];
  label: string;
}> = {
  common: {
    color: '#4070C0',
    glowColor: 'rgba(64, 112, 192, 0.4)',
    glowIntensity: 20,
    particleCount: 12,
    particleColors: ['#4070C0', '#5080D0', '#6090E0'],
    label: 'Common',
  },
  rare: {
    color: '#C6A84B',
    glowColor: 'rgba(198, 168, 75, 0.5)',
    glowIntensity: 30,
    particleCount: 16,
    particleColors: ['#C6A84B', '#D4AF37', '#DAA520'],
    label: 'Rare',
  },
  epic: {
    color: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.5)',
    glowIntensity: 40,
    particleCount: 18,
    particleColors: ['#8B5CF6', '#60C0F0', '#A78BFA'],
    label: 'Epic',
  },
  legendary: {
    color: '#60C0F0',
    glowColor: 'rgba(96, 192, 240, 0.6)',
    glowIntensity: 60,
    particleCount: 20,
    particleColors: ['#002060', '#8B5CF6', '#60C0F0', '#C6A84B'],
    label: 'Legendary',
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframe Animations
// PURPOSE: GPU-composited with transform + opacity only
// ─────────────────────────────────────────────────────────────

const overlayEnter = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

const overlayExit = keyframes`
  0% { opacity: 1; }
  100% { opacity: 0; }
`;

const badgeSpring = keyframes`
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); opacity: 1; }
  70% { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const glowPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.15); opacity: 0.8; }
`;

const textReveal = keyframes`
  0% { transform: translateY(12px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
`;

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Overlay = styled.div<{ $dismissing: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: rgba(10, 10, 15, 0.88);
  animation: ${({ $dismissing }) => $dismissing ? overlayExit : overlayEnter} 0.35s ease-out forwards;
  ${reducedMotion}
`;

const GlowBackdrop = styled.div<{ $color: string; $intensity: number }>`
  position: absolute;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, ${({ $color }) => $color} 0%, transparent 70%);
  animation: ${glowPulse} 2.5s ease-in-out infinite;
  pointer-events: none;
  filter: blur(${({ $intensity }) => $intensity}px);
  ${reducedMotion}
`;

const BadgeCircle = styled.div<{ $glowColor: string; $glowIntensity: number }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #141419 0%, #1A1A24 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3.2rem;
  box-shadow: 0 0 ${({ $glowIntensity }) => $glowIntensity}px ${({ $glowColor }) => $glowColor},
              0 0 ${({ $glowIntensity }) => $glowIntensity * 2}px ${({ $glowColor }) => $glowColor};
  animation: ${badgeSpring} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
  z-index: 1;
  ${reducedMotion}

  @media (max-width: 768px) {
    width: 96px;
    height: 96px;
    font-size: 2.5rem;
  }
`;

const UnlockedLabel = styled.div`
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: #E0ECF4;
  margin-top: 20px;
  animation: ${textReveal} 0.4s ease-out 0.5s both;
  ${reducedMotion}
`;

const BadgeName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.6rem;
  font-weight: 700;
  color: #E0ECF4;
  margin-top: 8px;
  text-align: center;
  max-width: 320px;
  animation: ${textReveal} 0.4s ease-out 0.65s both;
  ${reducedMotion}

  @media (max-width: 768px) {
    font-size: 1.3rem;
    max-width: 280px;
  }
`;

const RarityBadge = styled.span<{ $color: string }>`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => $color}55;
  padding: 3px 10px;
  border-radius: 12px;
  margin-top: 8px;
  animation: ${textReveal} 0.4s ease-out 0.8s both;
  ${reducedMotion}
`;

const XPReward = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.1rem;
  color: #60C0F0;
  margin-top: 12px;
  animation: ${textReveal} 0.4s ease-out 0.95s both;
  ${reducedMotion}
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
  animation: ${textReveal} 0.4s ease-out 1.1s both;
  ${reducedMotion}

  @media (max-width: 768px) {
    flex-direction: column;
    width: 80%;
    max-width: 280px;
  }
`;

const ActionBtn = styled.button<{ $primary?: boolean; $accentColor: string }>`
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 12px 28px;
  border-radius: 8px;
  border: 1px solid ${({ $primary, $accentColor }) => $primary ? $accentColor : 'rgba(224, 236, 244, 0.2)'};
  background: ${({ $primary, $accentColor }) => $primary ? $accentColor + '22' : 'transparent'};
  color: ${({ $primary, $accentColor }) => $primary ? $accentColor : '#E0ECF4'};
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  transition: transform 0.15s ease, opacity 0.15s ease;

  &:hover { transform: scale(1.04); }
  &:active { transform: scale(0.97); }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (max-width: 768px) {
    width: 100%;
    min-height: 56px;
  }
`;

const ParticleLayer = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const Particle = styled.div<{ $color: string; $angle: number; $dist: number; $delay: number; $size: number }>`
  position: absolute;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  animation: ${({ $angle, $dist }) => {
    const rad = ($angle * Math.PI) / 180;
    const x = Math.cos(rad) * $dist;
    const y = Math.sin(rad) * $dist;
    return keyframes`
      0% { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { transform: translate(${x}px, ${y}px) scale(0.2); opacity: 0; }
    `;
  }} 1.5s ease-out ${({ $delay }) => $delay}s forwards;
  opacity: 0;
  ${reducedMotion}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────

export interface BadgeEarnOverlayProps {
  visible: boolean;
  badgeName: string;
  badgeEmoji: string;
  badgeDescription?: string;
  rarity: Rarity;
  xpReward: number;
  onDismiss: () => void;
  onShare?: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const BadgeEarnOverlay: React.FC<BadgeEarnOverlayProps> = ({
  visible,
  badgeName,
  badgeEmoji,
  rarity,
  xpReward,
  onDismiss,
  onShare,
}) => {
  const [dismissing, setDismissing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;

  const handleDismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(() => { setDismissing(false); onDismiss(); }, 350);
  }, [onDismiss]);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) onShare();
  }, [onShare]);

  // Auto-dismiss after 4s
  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(() => handleDismiss(), 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible, handleDismiss]);

  // Escape key
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleDismiss(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, handleDismiss]);

  if (!visible) return null;

  const particles = Array.from({ length: config.particleCount }, (_, i) => ({
    angle: (360 / config.particleCount) * i + (Math.random() * 12 - 6),
    dist: 70 + Math.random() * 50,
    color: config.particleColors[i % config.particleColors.length],
    delay: 0.2 + Math.random() * 0.4,
    size: 5 + Math.random() * 5,
  }));

  return (
    <Overlay
      $dismissing={dismissing}
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-label={`Achievement unlocked: ${badgeName}`}
    >
      <GlowBackdrop $color={config.glowColor} $intensity={config.glowIntensity} />

      <ParticleLayer>
        {particles.map((p, i) => (
          <Particle key={i} $color={p.color} $angle={p.angle} $dist={p.dist} $delay={p.delay} $size={p.size} />
        ))}
      </ParticleLayer>

      <BadgeCircle $glowColor={config.glowColor} $glowIntensity={config.glowIntensity}>
        {badgeEmoji}
      </BadgeCircle>

      <UnlockedLabel>Achievement Unlocked!</UnlockedLabel>
      <BadgeName>{badgeName}</BadgeName>
      <RarityBadge $color={config.color}>{config.label}</RarityBadge>
      {xpReward > 0 && <XPReward>+{xpReward} XP</XPReward>}

      <ButtonRow onClick={(e) => e.stopPropagation()}>
        {onShare && (
          <ActionBtn $primary $accentColor={config.color} onClick={handleShare}>
            Share
          </ActionBtn>
        )}
        <ActionBtn $accentColor={config.color} onClick={handleDismiss}>
          Continue
        </ActionBtn>
      </ButtonRow>
    </Overlay>
  );
};

export default React.memo(BadgeEarnOverlay);
