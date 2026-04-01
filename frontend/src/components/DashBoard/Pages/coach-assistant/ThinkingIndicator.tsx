/**
 * ┌─── SUB-COMPONENT: ThinkingIndicator ──────────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Animated "AI is thinking" indicator with stages    │
 * │ Props: { isThinking: boolean }                              │
 * │ CLICK-OUTCOMES: None (display only)                         │
 * │ AI VILLAGE VALIDATED: 2026-03-31                            │
 * │ DESIGN CONSENSUS: Composite-only ::after glow + transform   │
 * │ scale. GPU-composited — 60fps on low-end devices.           │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

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
// SECTION: Animations (GPU-composited: transform + opacity ONLY)
// Design consensus: composite-only ::after glow + transform scale
// box-shadow is STATIC (painted once), glow toggled via opacity
// ─────────────────────────────────────────────────────────────
const swanScale = keyframes`
  0%, 100% { transform: scale(0.8); }
  50% { transform: scale(1.2); }
`;

const swanGlow = keyframes`
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const ThinkingWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  max-width: 320px;
  border-radius: 16px 16px 16px 4px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  animation: ${fadeInUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const DotsWrap = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const Dot = styled.span<{ $delay: number }>`
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-primary, #002060);
  will-change: transform;
  animation: ${swanScale} 1.5s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;

  /* Glow pseudo-element: static box-shadow, animated opacity */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px var(--accent-primary, #60C0F0);
    opacity: 0;
    will-change: opacity;
    animation: ${swanGlow} 1.5s ease-in-out infinite;
    animation-delay: ${({ $delay }) => $delay}s;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &::after { animation: none; opacity: 0.5; }
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
    <ThinkingWrap aria-label="AI is thinking" role="status" aria-live="polite">
      <DotsWrap>
        <Dot $delay={0} />
        <Dot $delay={0.2} />
        <Dot $delay={0.4} />
      </DotsWrap>
      <StageText key={stageIndex}>{THINKING_STAGES[stageIndex]}</StageText>
    </ThinkingWrap>
  );
});

ThinkingIndicator.displayName = 'ThinkingIndicator';

export default ThinkingIndicator;
