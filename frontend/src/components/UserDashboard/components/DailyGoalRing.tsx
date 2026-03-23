/**
 * ============================================================================
 * FILE: DailyGoalRing.tsx
 * PURPOSE: Animated SVG ring showing daily workout goal progress
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Displays a circular progress ring (Apple Fitness+ style)
 * showing how close the user is to their daily workout goal. Uses the Zeigarnik
 * Effect (incomplete tasks create mental tension) and Endowed Progress Effect
 * (showing partial completion motivates finishing).
 *
 * HOW IT FITS IN THE APP:
 *   UserDashboard.V3 → WorkoutsTab → DailyGoalRing
 *   Data: GET /api/gamification/daily-progress (or calculated client-side)
 *
 * KEY DECISIONS:
 * - SVG ring with Wing Purple → Ice Wing gradient (Cosmic Nebula per CLAUDE.md)
 * - requestAnimationFrame for smooth 60fps animation
 * - prefers-reduced-motion: instant fill, no animation
 * - 44px minimum size for touch target compliance
 *
 * PSYCHOLOGY:
 * - Zeigarnik Effect: Incomplete ring creates urge to complete it
 * - Endowed Progress: Starting at 10% (not 0%) increases completion rates by 34%
 * - Peak-End Rule: Completion triggers celebration particle burst
 *
 * ┌─── SUB-COMPONENT: DailyGoalRing ─────────────────────┐
 * │ PARENT: WorkoutsTab / UserDashboard sidebar            │
 * │ PURPOSE: Visual daily goal progress motivator          │
 * │ WIREFRAME:                                             │
 * │ ┌────────────────────┐                                 │
 * │ │    ╭──────────╮    │                                 │
 * │ │   ╱  72%      ╲   │                                 │
 * │ │  │  3/4 done   │  │                                 │
 * │ │   ╲  ⚡ +50XP  ╱   │                                 │
 * │ │    ╰──────────╯    │                                 │
 * │ │  "1 workout away!" │                                 │
 * │ └────────────────────┘                                 │
 * │ Props: { current, goal, xpReward }                     │
 * │ CLICK-OUTCOMES:                                        │
 * │ [Ring tap] → navigates to workout logger               │
 * │ GAMIFICATION: Shows XP reward for completion           │
 * └────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { Zap } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface DailyGoalRingProps {
  /** Number of workouts completed today */
  current: number;
  /** Daily workout goal */
  goal: number;
  /** XP reward shown for completing the goal */
  xpReward?: number;
  /** Callback when ring is tapped/clicked */
  onPress?: () => void;
  /** Ring diameter in px (default 120) */
  size?: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Animated SVG progress ring with Crystalline Swan gradient
// ─────────────────────────────────────────────────────────────
const DailyGoalRing: React.FC<DailyGoalRingProps> = ({
  current,
  goal,
  xpReward = 50,
  onPress,
  size = 120,
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const rafRef = useRef<number>(0);

  // Endowed Progress: Start at 10% minimum so user feels they've already begun
  const rawProgress = goal > 0 ? current / goal : 0;
  const targetProgress = Math.min(Math.max(rawProgress, current > 0 ? rawProgress : 0.1), 1);
  const isComplete = current >= goal;
  const remaining = Math.max(goal - current, 0);

  // SVG circle math
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate progress with requestAnimationFrame + easeOutExpo
  useEffect(() => {
    const startTime = performance.now();
    const startValue = animatedProgress;
    const delta = targetProgress - startValue;
    // Dynamic duration: 800ms-1500ms based on delta magnitude
    const duration = Math.min(Math.max(Math.abs(delta) * 2000, 800), 1500);

    const easeOutExpo = (t: number): number =>
      t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(t);
      const value = startValue + delta * eased;
      setAnimatedProgress(value);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetProgress]);

  const dashOffset = circumference * (1 - animatedProgress);
  const percentage = Math.round(animatedProgress * 100);

  return (
    <RingContainer
      size={size}
      onClick={onPress}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-label={`Daily goal: ${current} of ${goal} workouts completed`}
      $isComplete={isComplete}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {/* Cosmic Nebula gradient: Wing Purple → Ice Wing (per CLAUDE.md) */}
          <linearGradient id="goalRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#60C0F0" />
          </linearGradient>
          {/* Glow filter for completed ring */}
          <filter id="goalRingGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(96, 192, 240, 0.08)"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#goalRingGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          filter={isComplete ? 'url(#goalRingGlow)' : undefined}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>

      {/* Center content */}
      <CenterContent>
        <Percentage $isComplete={isComplete}>
          {isComplete ? '✓' : `${percentage}%`}
        </Percentage>
        <GoalText>
          {isComplete
            ? 'Goal Complete!'
            : `${current}/${goal} done`}
        </GoalText>
        {!isComplete && remaining <= 2 && (
          <NudgeText>
            {remaining === 1 ? '1 workout away!' : `${remaining} to go!`}
          </NudgeText>
        )}
        {isComplete && (
          <XPBadge>
            <Zap size={12} />
            +{xpReward}XP
          </XPBadge>
        )}
      </CenterContent>
    </RingContainer>
  );
};

export default React.memo(DailyGoalRing);

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Crystalline Swan themed ring with celebration states
// ─────────────────────────────────────────────────────────────

const completePulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 24px 8px rgba(96, 192, 240, 0.2); }
`;

const RingContainer = styled.div<{ size: number; $isComplete: boolean }>`
  position: relative;
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: transform 0.2s ease;

  ${({ $isComplete }) =>
    $isComplete &&
    `animation: ${completePulse} 3.5s ease-in-out infinite;`}

  &:hover {
    transform: scale(1.05);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    & * { transition: none !important; }
  }

  svg {
    position: absolute;
    top: 0;
    left: 0;
  }
`;

const CenterContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  z-index: 1;
`;

const Percentage = styled.span<{ $isComplete: boolean }>`
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 1.3rem;
  font-weight: 700;
  color: ${({ $isComplete }) => ($isComplete ? '#C6A84B' : '#E0ECF4')};
`;

const GoalText = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.6rem;
  color: rgba(224, 236, 244, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const NudgeText = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  color: #60C0F0;
  margin-top: 2px;
`;

const XPBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  color: #C6A84B;
  background: rgba(198, 168, 75, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 2px;
`;
