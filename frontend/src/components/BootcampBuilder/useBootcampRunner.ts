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
  type BootcampRunnerSegment,
} from './BootcampRunner.logic';
import { playBootcampRunnerCue } from './bootcampRunAcquisition';

// The exact in-memory plan owns its session. No exercise names or private
// plan content are written into browser storage or reused for another class.
const memoryCheckpoints = new WeakMap<GeneratedBootcamp, ReturnType<typeof createRunnerState>>();

function restoreRunnerState(bootcamp: GeneratedBootcamp, segments: ReturnType<typeof buildBootcampRunnerSegments>) {
  return memoryCheckpoints.get(bootcamp) ?? createRunnerState(segments, Date.now());
}

export function useBootcampRunner(bootcamp: GeneratedBootcamp) {
  // PARENT CONTRACT: `bootcamp` must stay referentially stable while a class is
  // live. The checkpoint map and the restore effect are keyed on the object
  // identity, so a parent that recreates the prop mid-run (same content, new
  // object) silently restarts the class from segment 0. Every current writer
  // (BootcampBuilderPage) unmounts this hook's host before changing the plan —
  // the Run stage gates the edit surfaces off — but a future refetch or context
  // provider that breaks that assumption would discard live progress without
  // any error.
  const segments = useMemo(() => buildBootcampRunnerSegments(bootcamp), [bootcamp]);
  const [state, setState] = useState(() => restoreRunnerState(bootcamp, segments));
  const lastPaintAt = useRef(0);
  const lastCueId = useRef<string | null>(null);

  // Restore only on a REAL plan/segments change. useState's initializer above
  // already covers the first mount. Re-restoring on every effect run would
  // re-read the checkpoint that the cleanup below just wrote — and React
  // StrictMode's mount → cleanup → mount cycle (StrictMode is enabled in
  // frontend/src/main.jsx) runs that sequence immediately, which flipped a
  // brand-new run straight to PAUSED the moment the Run stage opened.
  const lastPlanRef = useRef<{ bootcamp: GeneratedBootcamp; segments: BootcampRunnerSegment[] } | null>(null);
  // Freshness for the checkpoint cleanup above: effects declared earlier run
  // first after every commit, so stateRef is current whenever the checkpoint
  // cleanup (unmount or plan change) reads it.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  useEffect(() => {
    const previous = lastPlanRef.current;
    lastPlanRef.current = { bootcamp, segments };
    if (!previous) return;
    if (previous.bootcamp === bootcamp && previous.segments === segments) return;
    setState(restoreRunnerState(bootcamp, segments));
  }, [bootcamp, segments]);

  useEffect(() => {
    // Checkpoint on stage exit or plan change — the ONLY two moments the
    // snapshot is read again. The effect deliberately does NOT depend on
    // `state`: depending on it re-ran this effect (cleanup + setup) on every
    // rAF tick, continuously overwriting a PAUSED snapshot ~10x/second while
    // the class ran. `stateRef` carries the same freshness to the cleanup
    // without the churn, and narrows the window in which a paused snapshot
    // exists to the exact moments it is meant for (contract 14 §7: "leaving
    // Run pauses the run at the exact command time"). advanceRunnerState()
    // first reconciles any segment that had already elapsed; pauseRunnerState()
    // then freezes the remaining time so restore brings the run back paused,
    // not advanced.
    return () => {
      memoryCheckpoints.set(
        bootcamp,
        pauseRunnerState(advanceRunnerState(stateRef.current, segments, Date.now()), Date.now()),
      );
    };
  }, [bootcamp, segments]);

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
    setState((current) => pauseRunnerState(advanceRunnerState(current, segments, Date.now()), Date.now()));
  }, [segments]);

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
    restartClass: () => setState(createRunnerState(segments, Date.now())),
  };
}
