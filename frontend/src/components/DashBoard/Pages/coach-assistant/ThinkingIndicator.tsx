/**
 * ┌─── SUB-COMPONENT: ThinkingIndicator ──────────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Crystalline diamond "AI is thinking" indicator     │
 * │ Props: { isThinking: boolean }                              │
 * │ CLICK-OUTCOMES: None (display only)                         │
 * │ AI VILLAGE VALIDATED: 2026-03-31                            │
 * │ DESIGN-2 UPGRADE: 2026-04-06 — Diamond shimmer via         │
 * │   clip-path polygon, zero rotation, GPU-composited.         │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { diamondShimmer } from './styles/CoachAnimations';

// ─────────────────────────────────────────────────────────────
// SECTION: Thinking Stages (rotate every 3s while thinking)
// ─────────────────────────────────────────────────────────────
const THINKING_STAGES = [
  'Analyzing your question...',
  'Consulting training knowledge...',
  'Forming response...',
  'Reviewing for accuracy...',
];

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components (DESIGN-2 Crystalline Diamond)
// ─────────────────────────────────────────────────────────────
const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  max-width: 320px;
  border-radius: 16px 16px 16px 4px;
  background: rgba(var(--royal-depth-rgb, 0, 48, 128), 0.5);
  backdrop-filter: blur(var(--glass-blur, 12px));
  -webkit-backdrop-filter: blur(var(--glass-blur, 12px));
  border: 1px solid rgba(var(--ice-wing-rgb, 96, 192, 240), 0.12);
  border-left: 3px solid var(--ice-wing, rgb(96, 192, 240));
  animation: ${fadeInUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const DiamondsWrap = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

/** DESIGN-2: Diamond via clip-path — zero rotation transforms, GPU-composited */
const Diamond = styled.span<{ $delay: string }>`
  width: 12px;
  height: 12px;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  background: linear-gradient(
    135deg,
    var(--color-ice-wing-peak, #80E0FF),
    var(--ice-wing, rgb(96, 192, 240)),
    var(--color-swan-lavender-base, #50A0D0)
  );
  will-change: transform, opacity;
  animation: ${diamondShimmer} 1.6s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`;

const StageText = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  animation: ${fadeInUp} 0.25s ease;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────
interface ThinkingIndicatorProps {
  isThinking: boolean;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = memo(({ isThinking }) => {
  const [stageIndex, setStageIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isThinking) {
      setStageIndex(0);
      intervalRef.current = setInterval(() => {
        setStageIndex(prev => (prev + 1) % THINKING_STAGES.length);
      }, 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isThinking]);

  if (!isThinking) return null;

  return (
    <Wrap aria-label="Swan Coach is thinking" role="status" aria-live="polite">
      <DiamondsWrap>
        <Diamond $delay="var(--animation-shimmer-stagger-1, 0s)" />
        <Diamond $delay="var(--animation-shimmer-stagger-2, 0.2s)" />
        <Diamond $delay="var(--animation-shimmer-stagger-3, 0.4s)" />
      </DiamondsWrap>
      <StageText key={stageIndex}>{THINKING_STAGES[stageIndex]}</StageText>
    </Wrap>
  );
});

ThinkingIndicator.displayName = 'ThinkingIndicator';

export default ThinkingIndicator;
