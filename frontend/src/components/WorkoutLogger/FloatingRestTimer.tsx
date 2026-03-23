/**
 * ┌─── SUB-COMPONENT: FloatingRestTimer ───────────────────────┐
 * │ PARENT: WorkoutLogger                                       │
 * │ PURPOSE: Global PiP (Picture-in-Picture) rest timer that    │
 * │ floats above the workout logger, persists between exercises  │
 * │ WIREFRAME:                                                  │
 * │ ┌───────────────────────────────────┐                       │
 * │ │ ⏱ 0:45 / 1:30     [▶] [✕]       │                       │
 * │ │ ███████████░░░░░░░░░░░           │                       │
 * │ └───────────────────────────────────┘                       │
 * │ Props: { onClose }                                          │
 * │ CLICK-OUTCOMES:                                             │
 * │ [▶/⏸] → Start/Pause timer                                  │
 * │ [✕] → Close floating timer                                  │
 * │ [drag] → Reposition on screen                               │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Timer, Play, Pause, RotateCcw, X, Minus, Plus } from 'lucide-react';
import { useRestTimer } from './useRestTimer';
import { CS, reducedMotionSafe } from './WorkoutLoggerCS';

interface FloatingRestTimerProps {
  onClose: () => void;
}

const FloatingRestTimer: React.FC<FloatingRestTimerProps> = ({ onClose }) => {
  const [restDuration, setRestDuration] = useState(90);
  const [minimized, setMinimized] = useState(false);

  const { secondsLeft, isRunning, start, stop, reset } = useRestTimer(restDuration);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = restDuration > 0 ? ((restDuration - secondsLeft) / restDuration) * 100 : 0;
  const isLow = secondsLeft <= 10 && secondsLeft > 0;
  const isDone = secondsLeft <= 0 && isRunning;

  const adjustDuration = useCallback((delta: number) => {
    setRestDuration(prev => {
      const next = Math.max(10, Math.min(600, prev + delta));
      reset();
      return next;
    });
  }, [reset]);

  const handleToggle = () => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  };

  if (minimized) {
    return (
      <MinimizedPill
        $isRunning={isRunning}
        $isLow={isLow}
        onClick={() => setMinimized(false)}
        aria-label="Expand rest timer"
      >
        <Timer size={14} />
        <span>{formatTime(secondsLeft)}</span>
      </MinimizedPill>
    );
  }

  return (
    <FloatingContainer $isDone={isDone} aria-label="Floating rest timer">
      {/* Header */}
      <TimerHeader>
        <TimerLabel>
          <Timer size={16} />
          Rest Timer
        </TimerLabel>
        <HeaderActions>
          <IconBtn onClick={() => setMinimized(true)} aria-label="Minimize">
            <Minus size={14} />
          </IconBtn>
          <IconBtn onClick={onClose} aria-label="Close timer">
            <X size={14} />
          </IconBtn>
        </HeaderActions>
      </TimerHeader>

      {/* Time Display */}
      <TimeDisplay $isLow={isLow} $isDone={isDone}>
        {formatTime(secondsLeft)}
      </TimeDisplay>
      <TimeSubtext>
        / {formatTime(restDuration)}
      </TimeSubtext>

      {/* Progress Bar */}
      <ProgressTrack>
        <ProgressFill $pct={progress} $isLow={isLow} />
      </ProgressTrack>

      {/* Duration Adjuster */}
      <DurationRow>
        <AdjustBtn onClick={() => adjustDuration(-15)} aria-label="Decrease 15 seconds">
          <Minus size={12} /> 15s
        </AdjustBtn>
        <DurationLabel>{formatTime(restDuration)}</DurationLabel>
        <AdjustBtn onClick={() => adjustDuration(15)} aria-label="Increase 15 seconds">
          <Plus size={12} /> 15s
        </AdjustBtn>
      </DurationRow>

      {/* Controls */}
      <ControlRow>
        <ControlBtn onClick={handleToggle} $primary aria-label={isRunning ? 'Pause' : 'Start'}>
          {isRunning ? <Pause size={18} /> : <Play size={18} />}
        </ControlBtn>
        <ControlBtn onClick={reset} aria-label="Reset timer">
          <RotateCcw size={16} />
        </ControlBtn>
      </ControlRow>
    </FloatingContainer>
  );
};

export default FloatingRestTimer;

// ── Animations ──

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(96, 192, 240, 0.3); }
  50% { box-shadow: 0 0 30px rgba(96, 192, 240, 0.6); }
`;

const urgentPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(201, 42, 84, 0.3); }
  50% { box-shadow: 0 0 35px rgba(201, 42, 84, 0.6); }
`;

// ── Styled Components ──

const FloatingContainer = styled.div<{ $isDone: boolean }>`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 9990;
  width: 240px;
  background: var(--bg-elevated, #1A1A24);
  border: 1px solid ${({ $isDone }) =>
    $isDone ? 'rgba(201, 42, 84, 0.4)' : 'var(--accent-primary, rgba(96, 192, 240, 0.3))'};
  border-radius: 1rem;
  padding: 1rem;
  backdrop-filter: blur(20px);
  animation: ${({ $isDone }) => $isDone ? css`${urgentPulse} 1s ease-in-out infinite` : 'none'};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5),
              0 0 20px rgba(96, 192, 240, 0.1);

  @supports not (backdrop-filter: blur(20px)) {
    background: var(--bg-elevated, #1A1A24);
  }

  @media (max-width: 430px) {
    bottom: 1rem;
    right: 1rem;
    width: calc(100vw - 2rem);
  }
`;

const MinimizedPill = styled.button<{ $isRunning: boolean; $isLow: boolean }>`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 9990;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  min-height: 44px;
  background: var(--bg-elevated, #1A1A24);
  border: 1px solid ${({ $isLow }) =>
    $isLow ? 'rgba(201, 42, 84, 0.4)' : 'var(--accent-primary, rgba(96, 192, 240, 0.3))'};
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  animation: ${({ $isRunning }) => $isRunning ? css`${pulse} 2s ease-in-out infinite` : 'none'};

  svg {
    color: ${({ $isLow }) =>
      $isLow ? '#C92A54' : 'var(--accent-primary, #60C0F0)'};
  }
`;

const TimerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const TimerLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  text-transform: uppercase;
  letter-spacing: 0.06em;

  svg { color: var(--accent-primary, #60C0F0); }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const IconBtn = styled.button`
  background: transparent;
  border: none;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  cursor: pointer;
  padding: 0.25rem;
  min-width: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    background: rgba(224, 236, 244, 0.05);
  }
`;

const TimeDisplay = styled.div<{ $isLow: boolean; $isDone: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 2.25rem;
  font-weight: 700;
  text-align: center;
  color: ${({ $isLow, $isDone }) =>
    $isDone ? '#C92A54' : $isLow ? '#C6A84B' : 'var(--text-primary, #E0ECF4)'};
  line-height: 1;
`;

const TimeSubtext = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  margin-bottom: 0.75rem;
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(224, 236, 244, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.75rem;
`;

const ProgressFill = styled.div<{ $pct: number; $isLow: boolean }>`
  width: ${({ $pct }) => Math.min(100, $pct)}%;
  height: 100%;
  background: ${({ $isLow }) =>
    $isLow
      ? 'linear-gradient(90deg, #C6A84B, #C92A54)'
      : 'linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))'};
  border-radius: 2px;
  transition: width 1s linear;
`;

const DurationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const DurationLabel = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  min-width: 36px;
  text-align: center;
`;

const AdjustBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(224, 236, 244, 0.05);
  border: 1px solid rgba(224, 236, 244, 0.1);
  border-radius: 0.5rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  min-height: 32px;
  cursor: pointer;

  &:hover {
    background: rgba(96, 192, 240, 0.1);
    border-color: rgba(96, 192, 240, 0.2);
    color: var(--text-primary, #E0ECF4);
  }
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.75rem;
`;

const ControlBtn = styled.button<{ $primary?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  ${({ $primary }) => $primary ? css`
    background: var(--brand-primary, #002060);
    color: var(--text-primary, #E0ECF4);

    &:hover {
      box-shadow: 0 0 20px 4px rgba(139, 92, 246, 0.4);
      transform: scale(1.05);
    }
  ` : css`
    background: rgba(224, 236, 244, 0.08);
    color: var(--text-secondary, rgba(224, 236, 244, 0.65));

    &:hover {
      background: rgba(224, 236, 244, 0.12);
      color: var(--text-primary, #E0ECF4);
    }
  `}

  &:active {
    transform: scale(0.95);
  }
`;
