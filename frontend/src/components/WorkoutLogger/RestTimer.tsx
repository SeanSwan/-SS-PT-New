/**
 * ┌─── SUB-COMPONENT: RestTimer ───────────────────────────────┐
 * │ PARENT: ExerciseCardComponent (SetRow)                      │
 * │ PURPOSE: Visual countdown timer for rest periods            │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────────┐                │
 * │ │  ⏱ 0:45  [▓▓▓▓▓▓▓░░░]  [Start] [Reset] │                │
 * │ │     ↑         ↑              ↑       ↑   │                │
 * │ │  countdown  progress    toggle btn  reset │                │
 * │ └──────────────────────────────────────────┘                │
 * │ Props: { restSeconds, onComplete?, compact? }               │
 * └──────────────────────────────────────────────────────────────┘
 *
 * CEO Ruling V2.0 Performance:
 * - Custom useTimer hook for RestTimer cleanup
 * - Web Worker for background precision
 * - navigator.vibrate(50) on completion
 * - prefers-reduced-motion: disable pulse animation
 */

import React, { memo, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { CS, reducedMotionSafe } from './WorkoutLoggerCS';
import { useRestTimer } from './useRestTimer';

// ─── Animations ─────────────────────────────────────────────

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 4px ${CS.glow}40; }
  50% { box-shadow: 0 0 12px ${CS.glow}80; }
`;

// ─── Styled Components ──────────────────────────────────────

const TimerContainer = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ $compact }) => ($compact ? '4px' : '8px')};
  min-height: 44px;
`;

const TimeDisplay = styled.span<{ $isRunning: boolean; $isComplete: boolean }>`
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.9rem;
  min-width: 36px;
  text-align: center;
  color: ${({ $isComplete }) => ($isComplete ? CS.successText : CS.text)};

  ${({ $isRunning }) =>
    $isRunning &&
    css`
      animation: ${pulseGlow} 2s ease-in-out infinite;
      ${reducedMotionSafe}
    `}
`;

const ProgressBar = styled.div<{ $compact?: boolean }>`
  flex: 1;
  height: 6px;
  background: ${CS.inputBg};
  border-radius: 3px;
  overflow: hidden;
  min-width: ${({ $compact }) => ($compact ? '40px' : '60px')};
`;

const ProgressFill = styled.div<{ $percent: number; $isLow: boolean }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: ${({ $isLow }) =>
    $isLow
      ? `linear-gradient(90deg, ${CS.error}, ${CS.warning})`
      : `linear-gradient(90deg, ${CS.glow}, ${CS.gaming})`};
  border-radius: 3px;
  transition: width 1s linear;
`;

const TimerButton = styled.button<{ $variant?: 'start' | 'stop' | 'reset' }>`
  min-height: 44px;
  min-width: 44px;
  padding: 4px 8px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'stop' ? CS.warningBorder : CS.border};
  border-radius: 6px;
  background: ${({ $variant }) =>
    $variant === 'stop' ? CS.warningBg : CS.inputBg};
  color: ${({ $variant }) =>
    $variant === 'stop' ? CS.warningText : CS.text};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'stop'
        ? 'rgba(245, 158, 11, 0.2)'
        : 'rgba(80, 160, 240, 0.15)'};
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }
`;

// ─── Component ──────────────────────────────────────────────

interface RestTimerProps {
  /** Rest period in seconds */
  restSeconds: number;
  /** Called when countdown finishes */
  onComplete?: () => void;
  /** Compact mode for inline use in SetRow */
  compact?: boolean;
  /** Auto-start when mounted */
  autoStart?: boolean;
}

const RestTimer = memo(function RestTimer({
  restSeconds,
  onComplete,
  compact = false,
  autoStart = false,
}: RestTimerProps) {
  const { secondsLeft, isRunning, start, stop, reset } = useRestTimer({
    defaultSeconds: restSeconds,
    onComplete,
    enableVibration: true,
  });

  // Auto-start on mount if requested
  React.useEffect(() => {
    if (autoStart && restSeconds > 0) {
      start(restSeconds);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format mm:ss
  const timeStr = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [secondsLeft]);

  const percent = restSeconds > 0 ? (secondsLeft / restSeconds) * 100 : 0;
  const isLow = secondsLeft <= 10 && secondsLeft > 0;
  const isComplete = secondsLeft === 0 && !isRunning;

  return (
    <TimerContainer $compact={compact} role="timer" aria-label={`Rest timer: ${timeStr} remaining`}>
      <TimeDisplay $isRunning={isRunning} $isComplete={isComplete}>
        {timeStr}
      </TimeDisplay>

      {!compact && (
        <ProgressBar $compact={compact}>
          <ProgressFill $percent={percent} $isLow={isLow} />
        </ProgressBar>
      )}

      {isRunning ? (
        <TimerButton
          $variant="stop"
          onClick={stop}
          aria-label="Stop rest timer"
        >
          Stop
        </TimerButton>
      ) : (
        <TimerButton
          $variant="start"
          onClick={() => start(restSeconds)}
          aria-label={`Start ${restSeconds} second rest timer`}
        >
          {isComplete ? 'Again' : 'Start'}
        </TimerButton>
      )}

      {!compact && !isRunning && secondsLeft !== restSeconds && (
        <TimerButton
          $variant="reset"
          onClick={reset}
          aria-label="Reset rest timer"
        >
          Reset
        </TimerButton>
      )}
    </TimerContainer>
  );
});

export default RestTimer;
