/**
 * ┌─── SUB-COMPONENT: ThinkingIndicator ──────────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Animated "AI is thinking" indicator with stages    │
 * │ Props: { isThinking: boolean }                              │
 * │ CLICK-OUTCOMES: None (display only)                         │
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
// SECTION: Animations
// ─────────────────────────────────────────────────────────────
const pulse = keyframes`
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
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
  gap: 4px;
  flex-shrink: 0;
`;

const Dot = styled.span<{ $delay: number }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-primary, #60C0F0);
  animation: ${pulse} 1.4s infinite ease-in-out;
  animation-delay: ${({ $delay }) => $delay}ms;
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
        <Dot $delay={160} />
        <Dot $delay={320} />
      </DotsWrap>
      <StageText key={stageIndex}>{THINKING_STAGES[stageIndex]}</StageText>
    </ThinkingWrap>
  );
});

ThinkingIndicator.displayName = 'ThinkingIndicator';

export default ThinkingIndicator;
