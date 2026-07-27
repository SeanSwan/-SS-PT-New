/**
 * COMPONENT: FloatingRestTimer
 * PARENT: WorkoutLogger
 * PURPOSE: Global picture-in-picture rest timer for daily workout logging.
 * WIREFRAME:
 *   +----------------------------------+
 *   | Rest Timer              [-] [x]  |
 *   |              1:15                |
 *   |          [ -15s ] [ +15s ]       |
 *   |             [start] [reset]      |
 *   +----------------------------------+
 * CLICK OUTCOMES:
 *   - Minimize collapses to a small timer pill.
 *   - Close removes the floating timer.
 *   - Duration controls adjust the next rest interval.
 *   - Start/Pause and Reset control the current countdown.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Pause, Play, Plus, RotateCcw, SkipForward, Timer, X } from 'lucide-react';
import { useRestTimer } from './useRestTimer';
import { AI_REST_ADJUST, AI_REST_SKIP, type AIWorkoutEventAck } from '../../utils/aiWorkoutEvents';
import {
  AdjustBtn,
  ControlBtn,
  ControlRow,
  DurationLabel,
  DurationRow,
  FloatingContainer,
  HeaderActions,
  IconBtn,
  MinimizedPill,
  ProgressFill,
  ProgressTrack,
  TimeDisplay,
  TimeSubtext,
  TimerHeader,
  TimerLabel,
} from './FloatingRestTimer.styles';

interface FloatingRestTimerProps {
  onClose: () => void;
}

const clampRestDuration = (seconds: number) => Math.max(10, Math.min(600, seconds));

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const FloatingRestTimer: React.FC<FloatingRestTimerProps> = ({ onClose }) => {
  const [restDuration, setRestDuration] = useState(90);
  const [minimized, setMinimized] = useState(false);

  const { secondsLeft, isRunning, start, stop, reset } = useRestTimer({
    defaultSeconds: restDuration,
  });

  const progress = restDuration > 0 ? ((restDuration - secondsLeft) / restDuration) * 100 : 0;
  const isLow = secondsLeft <= 10 && secondsLeft > 0;
  const isDone = secondsLeft <= 0 && isRunning;

  const adjustDuration = useCallback((delta: number) => {
    setRestDuration((previousDuration) => {
      const nextDuration = clampRestDuration(previousDuration + delta);
      reset();
      return nextDuration;
    });
  }, [reset]);

  const handleToggle = () => {
    if (isRunning) {
      stop();
      return;
    }

    start();
  };

  // L3 (Kimi-binding): aria-live announcements at the 30/10/0 marks + skip; end haptic pulse.
  const [announcement, setAnnouncement] = useState('');
  const announcedRef = useRef<Set<number>>(new Set());
  // Hostile-round fix: a NEW countdown must re-announce its marks — reset the set whenever the
  // timer refills above the first mark (fresh start/reset), else rest #2+ goes silent.
  useEffect(() => {
    if (secondsLeft > 30) announcedRef.current.clear();
  }, [secondsLeft]);
  useEffect(() => {
    if (!isRunning) return;
    if ((secondsLeft === 30 || secondsLeft === 10) && !announcedRef.current.has(secondsLeft)) {
      announcedRef.current.add(secondsLeft);
      setAnnouncement(`${secondsLeft} seconds of rest left`);
    }
    if (secondsLeft === 0 && !announcedRef.current.has(0)) {
      announcedRef.current.add(0);
      setAnnouncement('Rest complete — back to work');
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
        && typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)')?.matches) {
        navigator.vibrate([30, 50, 30]);
      }
    }
  }, [secondsLeft, isRunning]);

  const handleSkip = useCallback(() => {
    stop();
    announcedRef.current.clear();
    setAnnouncement('Rest skipped — back to work');
  }, [stop]);

  // Voice lane (existing AI event family — no parallel registry): skip + validated ±15..±60 adjust.
  const adjustRef = useRef(adjustDuration);
  adjustRef.current = adjustDuration;
  const skipRef = useRef(handleSkip);
  skipRef.current = handleSkip;
  useEffect(() => {
    const ack = (e: Event, handled: boolean) =>
      ((e as CustomEvent<AIWorkoutEventAck>).detail)?.acknowledgeAIWorkoutEvent?.(handled);
    const onSkip = (e: Event) => { skipRef.current(); ack(e, true); };
    const onAdjust = (e: Event) => {
      const delta = Number((e as CustomEvent<{ deltaSeconds?: unknown }>).detail?.deltaSeconds);
      if (!Number.isFinite(delta) || Math.abs(delta) < 15 || Math.abs(delta) > 60) return ack(e, false);
      adjustRef.current(delta);
      ack(e, true);
    };
    window.addEventListener(AI_REST_SKIP, onSkip);
    window.addEventListener(AI_REST_ADJUST, onAdjust);
    return () => {
      window.removeEventListener(AI_REST_SKIP, onSkip);
      window.removeEventListener(AI_REST_ADJUST, onAdjust);
    };
  }, []);

  if (minimized) {
    return (
      <MinimizedPill
        type="button"
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
      <TimerHeader>
        <TimerLabel>
          <Timer size={16} />
          Rest Timer
        </TimerLabel>
        <HeaderActions>
          <IconBtn type="button" onClick={() => setMinimized(true)} aria-label="Minimize">
            <Minus size={14} />
          </IconBtn>
          <IconBtn type="button" onClick={onClose} aria-label="Close timer">
            <X size={14} />
          </IconBtn>
        </HeaderActions>
      </TimerHeader>

      <TimeDisplay $isLow={isLow} $isDone={isDone}>
        {formatTime(secondsLeft)}
      </TimeDisplay>
      <TimeSubtext>/ {formatTime(restDuration)}</TimeSubtext>

      <ProgressTrack>
        <ProgressFill $pct={progress} $isLow={isLow} />
      </ProgressTrack>

      <DurationRow>
        <AdjustBtn type="button" onClick={() => adjustDuration(-15)} aria-label="Decrease 15 seconds">
          <Minus size={12} /> 15s
        </AdjustBtn>
        <DurationLabel>{formatTime(restDuration)}</DurationLabel>
        <AdjustBtn type="button" onClick={() => adjustDuration(15)} aria-label="Increase 15 seconds">
          <Plus size={12} /> 15s
        </AdjustBtn>
      </DurationRow>

      <ControlRow>
        <ControlBtn type="button" onClick={handleToggle} $primary aria-label={isRunning ? 'Pause' : 'Start'}>
          {isRunning ? <Pause size={18} /> : <Play size={18} />}
        </ControlBtn>
        <ControlBtn type="button" onClick={handleSkip} aria-label="Skip rest">
          <SkipForward size={16} />
        </ControlBtn>
        <ControlBtn type="button" onClick={reset} aria-label="Reset timer">
          <RotateCcw size={16} />
        </ControlBtn>
      </ControlRow>
      <span
        data-testid="rest-live-region"
        aria-live="polite"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}
      >
        {announcement}
      </span>
    </FloatingContainer>
  );
};

export default FloatingRestTimer;
