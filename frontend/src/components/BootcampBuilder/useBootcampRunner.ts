import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import {
  advanceRunnerState,
  buildBootcampRunnerSegments,
  createRunnerState,
  formatRunnerTime,
  getRunnerProjectedEndsAt,
  getRunnerTotalDurationMs,
  pauseRunnerState,
  restartRunnerSegment,
  resumeRunnerState,
  skipRunnerSegment,
} from './BootcampRunner.logic';
import { playBootcampRunnerCue } from './bootcampRunAcquisition';

export function useBootcampRunner(bootcamp: GeneratedBootcamp) {
  const segments = useMemo(() => buildBootcampRunnerSegments(bootcamp), [bootcamp]);
  const [state, setState] = useState(() => createRunnerState(segments, Date.now()));
  const lastPaintAt = useRef(0);
  const lastCueId = useRef<string | null>(null);

  useEffect(() => {
    setState(createRunnerState(segments, Date.now()));
  }, [segments]);

  useEffect(() => {
    if (state.status !== 'running') return undefined;
    let frameId = 0;
    const tick = (paintTime: number) => {
      if (paintTime - lastPaintAt.current >= 100) {
        lastPaintAt.current = paintTime;
        setState((current) => advanceRunnerState(current, segments, Date.now()));
      }
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [segments, state.status]);

  const pause = useCallback(() => {
    setState((current) => pauseRunnerState(current, Date.now()));
  }, []);

  const resume = useCallback(() => {
    setState((current) => resumeRunnerState(current, Date.now()));
  }, []);

  const skip = useCallback(() => {
    setState((current) => skipRunnerSegment(current, segments, Date.now()));
  }, [segments]);

  const restart = useCallback(() => {
    setState((current) => restartRunnerSegment(current, segments, Date.now()));
  }, [segments]);

  const currentSegment = segments[state.segmentIndex] ?? segments[segments.length - 1];
  useEffect(() => {
    if (!currentSegment || lastCueId.current === currentSegment.id) return;
    lastCueId.current = currentSegment.id;
    playBootcampRunnerCue(currentSegment.phase);
  }, [currentSegment]);
  const nextSegment = segments[state.segmentIndex + 1] ?? null;
  const segmentDurationMs = Math.max(1, (currentSegment?.durationSec ?? 0) * 1_000);
  const progress = state.status === 'complete'
    ? 1
    : Math.max(0, Math.min(1, 1 - state.remainingMs / segmentDurationMs));
  const nowMs = Date.now();

  return {
    state,
    segments,
    currentSegment,
    nextSegment,
    progress,
    remainingLabel: formatRunnerTime(state.remainingMs),
    plannedEndsAt: state.startedAt + getRunnerTotalDurationMs(segments),
    projectedEndsAt: getRunnerProjectedEndsAt(state, segments, nowMs),
    pause,
    resume,
    skip,
    restart,
  };
}
