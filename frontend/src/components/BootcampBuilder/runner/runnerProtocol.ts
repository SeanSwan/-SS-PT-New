/**
 * ============================================================================
 * FILE: runner/runnerProtocol.ts
 * PURPOSE: The pure Runner protocol — state envelope, idempotent commands,
 *          and the single-writer law. SWA-105 Slice 5.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 * ============================================================================
 *
 * LAWS (from the consult synthesis, enforced here rather than remembered):
 *  - The CONSOLE is the single source of truth. Every state carries a
 *    monotonic `seq`; consumers apply a state only if its seq is newer.
 *  - Commands are IDEMPOTENT and versioned: pause-while-paused is an accepted
 *    no-op, never an error; a command whose baseSeq is stale is REJECTED with
 *    `resync` so the sender refreshes — Sean tapping pause on a 4-second-stale
 *    phone must not skip a station (Kimi R7).
 *  - Time is never accumulated. The state stores `startedAtEpochMs` plus
 *    `shiftMs` (time lost to pauses/gaps); the effective clock is
 *    `now - shiftMs`, resolved against the compiled timeline's absolute
 *    deadlines. Background throttling degrades render rate, never truth.
 */

import { compileTimeline, segmentAt } from '../../../../../shared/bootcamp-core/timeline.mjs';

export interface RunnerState {
  seq: number;
  planId: string;
  startedAtEpochMs: number;
  /** Milliseconds of wall time that did not count (pauses, reconciled gaps). */
  shiftMs: number;
  /** Non-null while paused: the epoch-ms instant the clock stopped. */
  pausedAtEpochMs: number | null;
  /** Set when the class was ended early; the Runner shows S7. */
  endedEarly: boolean;
}

export type RunnerCommandType = 'PAUSE' | 'RESUME' | 'SKIP' | 'PREV' | 'EXTEND_60' | 'END_CLASS';

export interface RunnerCommand {
  cmdId: string;
  type: RunnerCommandType;
  /** The state seq the sender believed current — stale => resync, no effect. */
  baseSeq: number;
  atEpochMs: number;
}

export interface CommandResult {
  state: RunnerState;
  accepted: boolean;
  /** 'noop' = idempotent accept; 'resync' = sender must refresh its state. */
  reason: 'applied' | 'noop' | 'resync' | 'unknown_command';
}

export function createRunnerState(planId: string, startedAtEpochMs: number): RunnerState {
  return { seq: 1, planId, startedAtEpochMs, shiftMs: 0, pausedAtEpochMs: null, endedEarly: false };
}

/** The clock the timeline sees: wall time minus everything that didn't count. */
export function effectiveNow(state: RunnerState, nowEpochMs: number): number {
  const frozenAt = state.pausedAtEpochMs;
  return (frozenAt ?? nowEpochMs) - state.shiftMs;
}

/** Where the class is right now — one pure lookup, correct at any sample rate. */
export function locate(plan: object, state: RunnerState, nowEpochMs: number) {
  const timeline = compileTimeline(plan, state.startedAtEpochMs);
  return { timeline, at: segmentAt(timeline, effectiveNow(state, nowEpochMs)) };
}

const bump = (state: RunnerState, patch: Partial<RunnerState>): RunnerState => ({
  ...state, ...patch, seq: state.seq + 1,
});

export function applyCommand(
  plan: object,
  state: RunnerState,
  cmd: RunnerCommand,
): CommandResult {
  // Single-writer law: a stale sender gets a resync, never a side effect.
  if (cmd.baseSeq !== state.seq) return { state, accepted: false, reason: 'resync' };

  switch (cmd.type) {
    case 'PAUSE': {
      if (state.pausedAtEpochMs !== null) return { state, accepted: true, reason: 'noop' };
      return { state: bump(state, { pausedAtEpochMs: cmd.atEpochMs }), accepted: true, reason: 'applied' };
    }
    case 'RESUME': {
      if (state.pausedAtEpochMs === null) return { state, accepted: true, reason: 'noop' };
      const pausedMs = Math.max(0, cmd.atEpochMs - state.pausedAtEpochMs);
      return {
        state: bump(state, { pausedAtEpochMs: null, shiftMs: state.shiftMs + pausedMs }),
        accepted: true,
        reason: 'applied',
      };
    }
    case 'SKIP':
    case 'PREV': {
      const { timeline, at } = locate(plan, state, cmd.atEpochMs);
      const target = cmd.type === 'SKIP' ? at.index + 1 : Math.max(0, at.index - 1);
      const seg = timeline.segments[target];
      if (!seg) {
        // Skipping past the end ends the class — an explicit state, not a crash.
        return { state: bump(state, { endedEarly: true }), accepted: true, reason: 'applied' };
      }
      // Move the effective clock to the target's start: shift = wall - wanted.
      const wallNow = state.pausedAtEpochMs ?? cmd.atEpochMs;
      return {
        state: bump(state, { shiftMs: wallNow - seg.startsAt }),
        accepted: true,
        reason: 'applied',
      };
    }
    case 'EXTEND_60': {
      // Up to 60 more seconds ON THIS exercise, clamped at the segment start —
      // an unclamped shift rewinds INTO the previous exercise (or before the
      // class began), which this slice's own test caught. Outside a running
      // segment there is nothing to extend.
      const { at } = locate(plan, state, cmd.atEpochMs);
      if (at.status !== 'running' || !at.segment) return { state, accepted: true, reason: 'noop' };
      const wallNow = state.pausedAtEpochMs ?? cmd.atEpochMs;
      const effNow = effectiveNow(state, cmd.atEpochMs);
      const targetEff = Math.max(effNow - 60_000, at.segment.startsAt);
      return { state: bump(state, { shiftMs: wallNow - targetEff }), accepted: true, reason: 'applied' };
    }
    case 'END_CLASS': {
      if (state.endedEarly) return { state, accepted: true, reason: 'noop' };
      return { state: bump(state, { endedEarly: true }), accepted: true, reason: 'applied' };
    }
    default:
      return { state, accepted: false, reason: 'unknown_command' };
  }
}

/** Newer-seq-wins merge for receivers (audience screen, floor card). */
export function acceptRemoteState(local: RunnerState | null, remote: RunnerState): RunnerState {
  if (!local || remote.seq > local.seq) return remote;
  return local;
}
