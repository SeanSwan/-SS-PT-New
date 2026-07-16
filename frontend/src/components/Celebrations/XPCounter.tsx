/**
 * ============================================================================
 * FILE: XPCounter.tsx
 * PURPOSE: Animated XP count-up display with easeOutExpo easing
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders an animated numeric counter that counts from
 * a starting XP value to a target XP value using requestAnimationFrame and
 * easeOutExpo easing. Used in post-workout celebrations and level-up screens.
 *
 * HOW IT FITS IN THE APP:
 *   PostWorkoutCelebration â†’ XPCounter (animated display)
 *   CelebrationPortal â†’ XPCounter (level-up overlay)
 *
 * â”Œâ”€â”€â”€ SUB-COMPONENT: XPCounter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 * â”‚ PARENT: PostWorkoutCelebration                              â”‚
 * â”‚ PURPOSE: Animated count-up from startXP to endXP            â”‚
 * â”‚ WIREFRAME:                                                  â”‚
 * â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                                â”‚
 * â”‚ â”‚       +125 XP            â”‚  â† tabular-nums, Fira Code    â”‚
 * â”‚ â”‚    â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘         â”‚  â† optional progress bar       â”‚
 * â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                â”‚
 * â”‚ Props: { startXP, endXP, duration?, onComplete? }           â”‚
 * â”‚ CLICK-OUTCOMES: None (display only)                         â”‚
 * â”‚ GAMIFICATION: Displays XP earned from point award events    â”‚
 * â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
 */

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SECTION: Types
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface XPCounterProps {
  startXP: number;
  endXP: number;
  duration?: number; // ms â€” auto-calculated if not provided
  onComplete?: () => void;
  label?: string;
  showDelta?: boolean;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SECTION: Easing Function
// PURPOSE: easeOutExpo â€” fast start, graceful deceleration
// WHY: Kahneman's Peak-End Rule â€” the ending impression matters most.
//      Fast initial counting creates excitement, slow final digits
//      build anticipation for the exact number.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

export const normalizeXpCounterValue = (value: unknown): number => {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.trim())
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SECTION: Styled Components
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CounterContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const XPValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  color: ${({ theme }) => theme?.iceWing || '#60C0F0'};
  text-shadow: 0 0 20px rgba(96, 192, 240, 0.6);
  letter-spacing: 0.05em;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const XPLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  color: ${({ theme }) => theme?.frostWhite || '#E0ECF4'};
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const DeltaChip = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 1rem;
  color: ${({ theme }) => theme?.gildedFern || '#C6A84B'};
  opacity: 0.9;
`;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SECTION: Component
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const XPCounter: React.FC<XPCounterProps> = ({
  startXP,
  endXP,
  duration: manualDuration,
  onComplete,
  label = 'XP EARNED',
  showDelta = true,
}) => {
  const safeStartXP = normalizeXpCounterValue(startXP);
  const safeEndXP = Math.max(safeStartXP, normalizeXpCounterValue(endXP));
  const [displayValue, setDisplayValue] = useState(safeStartXP);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Auto-calculate duration based on delta magnitude
  const delta = safeEndXP - safeStartXP;
  const parsedManualDuration = typeof manualDuration === 'number' ? manualDuration : Number.NaN;
  const duration = Number.isFinite(parsedManualDuration) && parsedManualDuration > 0
    ? parsedManualDuration
    : (delta < 100 ? 800 : delta < 1000 ? 1200 : 1500);

  // Increment logic: <100 by 1s, <1000 by 5s, 1000+ by 25s


  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    if (prefersReducedMotion) {
      setDisplayValue(safeEndXP);
      onComplete?.();
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      const currentValue = Math.round(safeStartXP + delta * easedProgress);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Guarantee exact final value
        setDisplayValue(safeEndXP);
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [safeStartXP, safeEndXP, duration, delta, onComplete]);

  return (
    <CounterContainer
      role="status"
      aria-live="polite"
      aria-label={`${displayValue} experience points`}
    >
      <XPValue>
        {displayValue.toLocaleString()}
      </XPValue>
      <XPLabel>{label}</XPLabel>
      {showDelta && delta > 0 && (
        <DeltaChip>+{delta.toLocaleString()} XP</DeltaChip>
      )}
    </CounterContainer>
  );
};

export default XPCounter;
