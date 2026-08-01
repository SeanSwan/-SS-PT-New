import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import {
  expandGeneratedBootcampSegments,
  stationCuesForSegment,
  toPortableClassPlan,
  type PortableTimelineSegment,
} from './BootcampClassPlanAdapter';

export type BootcampRunnerPhase = 'warmup' | 'work' | 'rest' | 'transition' | 'complete';
export type BootcampRunnerStatus = 'running' | 'paused' | 'complete';

export interface BootcampRunnerSegment {
  id: string;
  phase: BootcampRunnerPhase;
  label: string;
  cue: string;
  durationSec: number;
  stationCues: string[];
  round?: number;
  exerciseSlot?: number;
}

export interface BootcampRunnerState {
  segmentIndex: number;
  status: BootcampRunnerStatus;
  segmentEndsAt: number | null;
  remainingMs: number;
  startedAt: number;
}

const runnerPhaseFor = (phase: string): BootcampRunnerPhase => {
  if (phase === 'work') return 'work';
  if (phase === 'warmup' || phase === 'cooldown') return 'warmup';
  if (phase === 'station_transition') return 'transition';
  return 'rest';
};

const runnerLabelFor = (segment: PortableTimelineSegment): string => {
  if (segment.phase === 'warmup') return 'Warm-Up';
  if (segment.phase === 'cooldown') return 'Cooldown';
  if (segment.phase === 'station_transition') return `Rotation ${(segment.visit ?? 0) + 1} Complete`;
  if (segment.phase === 'round_break') return `Round ${segment.round ?? 1} Complete`;
  if (segment.phase === 'rest') return `Round ${segment.round ?? 1} · Recovery`;
  if (segment.phase === 'work' && segment.visit !== null) {
    return `Round ${segment.round ?? 1} · Rotation ${segment.visit + 1} · Set ${(segment.position ?? 0) + 1}`;
  }
  return segment.phase === 'work' ? `Round ${segment.round ?? 1}` : segment.label;
};

const runnerCueFor = (segment: PortableTimelineSegment): string => {
  if (segment.phase === 'work') return 'Work';
  if (segment.phase === 'station_transition') return 'Rotate to the next station';
  if (segment.phase === 'round_break') return 'Recover for the next round';
  if (segment.phase === 'rest') return 'Recover';
  return segment.label;
};

export function buildBootcampRunnerSegments(bootcamp: GeneratedBootcamp): BootcampRunnerSegment[] {
  const plan = toPortableClassPlan(bootcamp);
  const relative = expandGeneratedBootcampSegments(bootcamp);
  const segments = relative.map((segment, index): BootcampRunnerSegment => ({
    id: `portable-${index}-${segment.phase}`,
    phase: runnerPhaseFor(segment.phase),
    label: runnerLabelFor(segment),
    cue: runnerCueFor(segment),
    durationSec: segment.durationSec,
    stationCues: segment.phase === 'warmup' || segment.phase === 'cooldown'
      ? [segment.label]
      : stationCuesForSegment(plan, segment),
    ...(segment.round !== null ? { round: segment.round } : {}),
    ...(segment.position !== null ? { exerciseSlot: segment.position + 1 } : {}),
  }));

  segments.push({
    id: 'complete',
    phase: 'complete',
    label: 'Class Complete',
    cue: 'Class complete',
    durationSec: 0,
    stationCues: [],
  });
  return segments;
}

const segmentDurationMs = (segment: BootcampRunnerSegment): number => (
  Math.max(0, segment.durationSec) * 1_000
);

export const getRunnerTotalDurationMs = (segments: BootcampRunnerSegment[]): number => (
  segments.reduce((total, segment) => total + segmentDurationMs(segment), 0)
);

export function createRunnerState(
  segments: BootcampRunnerSegment[],
  nowMs: number,
): BootcampRunnerState {
  const first = segments[0];
  const complete = !first || first.phase === 'complete';
  return {
    segmentIndex: 0,
    status: complete ? 'complete' : 'running',
    segmentEndsAt: complete ? null : nowMs + segmentDurationMs(first),
    remainingMs: complete ? 0 : segmentDurationMs(first),
    startedAt: nowMs,
  };
}

export function advanceRunnerState(
  state: BootcampRunnerState,
  segments: BootcampRunnerSegment[],
  nowMs: number,
): BootcampRunnerState {
  if (state.status !== 'running' || state.segmentEndsAt === null) return state;

  let segmentIndex = state.segmentIndex;
  let segmentEndsAt = state.segmentEndsAt;
  while (nowMs >= segmentEndsAt) {
    segmentIndex += 1;
    const next = segments[segmentIndex];
    if (!next || next.phase === 'complete') {
      return {
        ...state,
        segmentIndex: Math.min(segmentIndex, Math.max(0, segments.length - 1)),
        status: 'complete',
        segmentEndsAt: null,
        remainingMs: 0,
      };
    }
    segmentEndsAt += segmentDurationMs(next);
  }

  return {
    ...state,
    segmentIndex,
    segmentEndsAt,
    remainingMs: Math.max(0, segmentEndsAt - nowMs),
  };
}

export function pauseRunnerState(state: BootcampRunnerState, nowMs: number): BootcampRunnerState {
  if (state.status !== 'running' || state.segmentEndsAt === null) return state;
  return {
    ...state,
    status: 'paused',
    remainingMs: Math.max(0, state.segmentEndsAt - nowMs),
    segmentEndsAt: null,
  };
}

export function resumeRunnerState(state: BootcampRunnerState, nowMs: number): BootcampRunnerState {
  if (state.status !== 'paused') return state;
  return {
    ...state,
    status: 'running',
    segmentEndsAt: nowMs + state.remainingMs,
  };
}

export function skipRunnerSegment(
  state: BootcampRunnerState,
  segments: BootcampRunnerSegment[],
  nowMs: number,
): BootcampRunnerState {
  const segmentIndex = Math.min(state.segmentIndex + 1, Math.max(0, segments.length - 1));
  const next = segments[segmentIndex];
  if (!next || next.phase === 'complete') {
    return { ...state, segmentIndex, status: 'complete', segmentEndsAt: null, remainingMs: 0 };
  }
  const remainingMs = segmentDurationMs(next);
  return {
    ...state,
    segmentIndex,
    status: 'running',
    segmentEndsAt: nowMs + remainingMs,
    remainingMs,
  };
}

export function restartRunnerSegment(
  state: BootcampRunnerState,
  segments: BootcampRunnerSegment[],
  nowMs: number,
): BootcampRunnerState {
  const current = segments[state.segmentIndex];
  if (!current || current.phase === 'complete') return state;
  const remainingMs = segmentDurationMs(current);
  return {
    ...state,
    status: 'running',
    segmentEndsAt: nowMs + remainingMs,
    remainingMs,
  };
}

export function getRunnerProjectedEndsAt(
  state: BootcampRunnerState,
  segments: BootcampRunnerSegment[],
  nowMs: number,
): number {
  if (state.status === 'complete') return nowMs;
  const currentRemaining = state.status === 'running' && state.segmentEndsAt !== null
    ? Math.max(0, state.segmentEndsAt - nowMs)
    : state.remainingMs;
  const futureMs = segments
    .slice(state.segmentIndex + 1)
    .reduce((total, segment) => total + segmentDurationMs(segment), 0);
  return nowMs + currentRemaining + futureMs;
}

export const formatRunnerTime = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
