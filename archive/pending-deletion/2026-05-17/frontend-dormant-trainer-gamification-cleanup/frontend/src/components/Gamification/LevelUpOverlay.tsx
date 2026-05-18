/**
 * ============================================================================
 * FILE: LevelUpOverlay.tsx
 * PURPOSE: Full-screen celebration overlay when a user levels up
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a full-screen overlay with tier-colored glow
 * pulse, particle burst, spring-animated level number, and XP count-up when
 * the gamification engine reports a level-up event.
 *
 * HOW IT FITS IN THE APP: Mounted at app root, listens for level-up events
 * dispatched by the gamification slice. Auto-dismisses after 4s or on click.
 *
 * KEY DECISIONS: Pure CSS keyframes (no framer-motion) for GPU performance.
 * All animations use only transform + opacity for compositing.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: LevelUpOverlay                                   ║
 * ║  PURPOSE: Celebrate user level-up with tier-themed animation  ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────┐
 * │  [Radial glow pulse background]        │
 * │                                        │
 * │     ✨ particles burst outward ✨       │
 * │                                        │
 * │         LEVEL UP!                      │
 * │           42                           │
 * │      Silver Edge                       │
 * │    1200 → 1350 XP                     │
 * │                                        │
 * └────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { visible, newLevel, previousXP, newXP, tierName, onDismiss }
 * State:     { displayedXP (animated counter) }
 * Children:  None (self-contained)
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import type { TierName } from '../../types/gamification';
import { TIER_DISPLAY } from '../../types/gamification';

// ─────────────────────────────────────────────────────────────
// SECTION: Tier Color Map
// PURPOSE: Map tier names to hex colors for dynamic theming
// ─────────────────────────────────────────────────────────────

const TIER_COLORS: Record<TierName, string> = {
  bronze_forge: '#CD7F32',
  silver_edge: '#C0C0C0',
  titanium_core: '#878681',
  obsidian_warrior: '#0A0A0F',
  crystalline_swan: '#60C0F0',
};

// Crystalline swan uses an animated gradient; pick a fallback for particles
const TIER_PARTICLE_COLORS: Record<TierName, string[]> = {
  bronze_forge: ['#CD7F32', '#B87333', '#DAA520'],
  silver_edge: ['#C0C0C0', '#A8A8A8', '#E0E0E0'],
  titanium_core: ['#878681', '#6B6B66', '#A0A09A'],
  obsidian_warrior: ['#3D3D3D', '#1A1A24', '#8B5CF6'],
  crystalline_swan: ['#002060', '#60C0F0', '#C6A84B', '#8B5CF6'],
};

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframe Animations
// PURPOSE: GPU-composited animations using transform + opacity only
// ─────────────────────────────────────────────────────────────

const tierGlowPulse = keyframes`
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.2); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
`;

const levelNumberSpring = keyframes`
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  80% { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const particleBurst = keyframes`
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { opacity: 0; }
`;

const fadeInUp = keyframes`
  0% { transform: translateY(16px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
`;

const overlayFadeIn = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

const overlayFadeOut = keyframes`
  0% { opacity: 1; }
  100% { opacity: 0; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Layout and themed presentation
// ─────────────────────────────────────────────────────────────

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

const Overlay = styled.div<{ $dismissing: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: rgba(10, 10, 15, 0.85);
  cursor: pointer;
  animation: ${({ $dismissing }) => $dismissing ? overlayFadeOut : overlayFadeIn} 0.4s ease-out forwards;
  ${reducedMotion}
`;

const GlowPulse = styled.div<{ $color: string }>`
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, ${({ $color }) => $color}66 0%, transparent 70%);
  animation: ${tierGlowPulse} 2s ease-out forwards;
  pointer-events: none;
  ${reducedMotion}
`;

const LevelLabel = styled.div`
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: #E0ECF4;
  animation: ${fadeInUp} 0.5s ease-out 0.2s both;
  ${reducedMotion}
`;

const LevelNumber = styled.div<{ $color: string; $isCrystalline: boolean }>`
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  font-size: 5rem;
  font-weight: 800;
  line-height: 1;
  margin: 8px 0;
  color: ${({ $isCrystalline }) => $isCrystalline ? '#E0ECF4' : '#E0ECF4'};
  text-shadow: 0 0 40px ${({ $color }) => $color}99, 0 0 80px ${({ $color }) => $color}44;
  animation: ${levelNumberSpring} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
  ${reducedMotion}

  @media (max-width: 768px) {
    font-size: 3.5rem;
  }
`;

const TierLabel = styled.div<{ $color: string }>`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1.5rem;
  color: ${({ $color }) => $color};
  animation: ${fadeInUp} 0.5s ease-out 0.6s both;
  ${reducedMotion}

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const XPCounter = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.1rem;
  color: #60C0F0;
  margin-top: 16px;
  animation: ${fadeInUp} 0.5s ease-out 0.9s both;
  ${reducedMotion}

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const ParticleContainer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Particle = styled.div<{ $color: string; $angle: number; $distance: number; $delay: number }>`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  opacity: 0;
  /* Use custom property to drive the final position via transform */
  animation: ${({ $angle, $distance }) => {
    const rad = ($angle * Math.PI) / 180;
    const x = Math.cos(rad) * $distance;
    const y = Math.sin(rad) * $distance;
    return keyframes`
      0% { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { transform: translate(${x}px, ${y}px) scale(0.3); opacity: 0; }
    `;
  }} 1.5s ease-out ${({ $delay }) => $delay}s forwards;
  ${reducedMotion}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Props Interface
// ─────────────────────────────────────────────────────────────

export interface LevelUpOverlayProps {
  visible: boolean;
  newLevel: number;
  previousXP: number;
  newXP: number;
  tierName: TierName;
  onDismiss: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const LevelUpOverlay: React.FC<LevelUpOverlayProps> = ({
  visible,
  newLevel,
  previousXP,
  newXP,
  tierName,
  onDismiss,
}) => {
  const [displayedXP, setDisplayedXP] = useState(previousXP);
  const [dismissing, setDismissing] = useState(false);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const tierColor = TIER_COLORS[tierName] || '#60C0F0';
  const tierDisplay = TIER_DISPLAY[tierName];
  const particleColors = TIER_PARTICLE_COLORS[tierName] || ['#60C0F0'];

  // XP count-up animation using requestAnimationFrame
  useEffect(() => {
    if (!visible) return;
    setDisplayedXP(previousXP);
    const start = performance.now();
    const duration = 1500; // 1.5s count-up
    const diff = newXP - previousXP;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedXP(Math.round(previousXP + diff * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    // Delay start until number is visible (0.9s)
    const delayTimer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate);
    }, 900);

    return () => {
      clearTimeout(delayTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [visible, previousXP, newXP]);

  // Auto-dismiss after 4s
  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(() => handleDismiss(), 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(() => {
      setDismissing(false);
      onDismiss();
    }, 400);
  }, [onDismiss]);

  // Escape key handler
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleDismiss(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, handleDismiss]);

  if (!visible) return null;

  // Generate 16 particles at evenly spaced angles
  const particles = Array.from({ length: 16 }, (_, i) => ({
    angle: (360 / 16) * i + (Math.random() * 10 - 5),
    distance: 80 + Math.random() * 60,
    color: particleColors[i % particleColors.length],
    delay: 0.3 + Math.random() * 0.3,
  }));

  return (
    <Overlay
      $dismissing={dismissing}
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-label={`Level up! You reached level ${newLevel}`}
    >
      <GlowPulse $color={tierColor} />

      <ParticleContainer>
        {particles.map((p, i) => (
          <Particle
            key={i}
            $color={p.color}
            $angle={p.angle}
            $distance={p.distance}
            $delay={p.delay}
          />
        ))}
      </ParticleContainer>

      <LevelLabel>Level Up!</LevelLabel>
      <LevelNumber $color={tierColor} $isCrystalline={tierName === 'crystalline_swan'}>
        {newLevel}
      </LevelNumber>
      <TierLabel $color={tierColor}>
        {tierDisplay?.name || 'Unknown Tier'}
      </TierLabel>
      <XPCounter>
        {displayedXP.toLocaleString()} XP
      </XPCounter>
    </Overlay>
  );
};

export default React.memo(LevelUpOverlay);
