/**
 * SWA-105 Slice 5 — the headless Runner engine.
 * Protocol (single writer, idempotent commands), channel (newer-seq-wins,
 * hello replay), checkpoint (crash resume), activation (one gesture, loud loss).
 */
import { describe, expect, it, vi } from 'vitest';

import {
  createRunnerState, applyCommand, locate, effectiveNow, acceptRemoteState,
  type RunnerCommand, type RunnerState,
} from './runnerProtocol';
import {
  createConsoleEndpoint, createReceiverEndpoint, type ChannelLike, type RunnerMessage,
} from './runnerChannel';
import { checkpointState, checkpointPlan, loadCheckpoint, clearCheckpoint, type StorageLike } from './runnerCheckpoint';
import { acquireAll } from './runnerActivation';
// @ts-expect-error shared core ships untyped .mjs (same pattern as sectionPatterns)
import { ALL_FIXTURES } from '../../../../../shared/bootcamp-core/fixtures.mjs';

const T0 = 1_785_000_000_000;
const plan = () => ALL_FIXTURES.fullBodyStationClass();
const cmd = (type: RunnerCommand['type'], baseSeq: number, atEpochMs: number): RunnerCommand => ({
  cmdId: `${type}-${atEpochMs}`, type, baseSeq, atEpochMs,
});

describe('runner protocol — the single-writer clock', () => {
  it('pause freezes the effective clock; resume shifts, never rewinds', () => {
    const p = plan();
    let s = createRunnerState('fixture_full_body', T0);
    const before = locate(p, s, T0 + 60_000).at.index;

    s = applyCommand(p, s, cmd('PAUSE', s.seq, T0 + 60_000)).state;
    // 5 minutes of wall time pass while paused — position must not move.
    expect(locate(p, s, T0 + 360_000).at.index).toBe(before);

    s = applyCommand(p, s, cmd('RESUME', s.seq, T0 + 360_000)).state;
    expect(s.shiftMs).toBe(300_000);
    expect(locate(p, s, T0 + 360_000).at.index).toBe(before);
  });

  it('pause-while-paused is an accepted no-op, not an error (Kimi R7)', () => {
    const p = plan();
    let s = createRunnerState('fixture_full_body', T0);
    s = applyCommand(p, s, cmd('PAUSE', s.seq, T0 + 1000)).state;
    const r = applyCommand(p, s, cmd('PAUSE', s.seq, T0 + 2000));
    expect(r.reason).toBe('noop');
    expect(r.state.seq).toBe(s.seq); // no bump on noop
  });

  it('a stale baseSeq is rejected with resync and has NO side effect', () => {
    const p = plan();
    const s = createRunnerState('fixture_full_body', T0);
    const r = applyCommand(p, s, cmd('PAUSE', s.seq - 1, T0 + 1000));
    expect(r).toMatchObject({ accepted: false, reason: 'resync' });
    expect(r.state).toBe(s);
  });

  it('SKIP lands exactly on the next segment start; PREV goes back', () => {
    const p = plan();
    let s = createRunnerState('fixture_full_body', T0);
    const now = T0 + 10_000;
    const { at } = locate(p, s, now);

    s = applyCommand(p, s, cmd('SKIP', s.seq, now)).state;
    const after = locate(p, s, now).at;
    expect(after.index).toBe(at.index + 1);
    expect(after.remainingSec).toBe(after.segment.durationSec);

    s = applyCommand(p, s, cmd('PREV', s.seq, now)).state;
    expect(locate(p, s, now).at.index).toBe(at.index);
  });

  it('skipping past the end ends the class explicitly', () => {
    const p = plan();
    let s = createRunnerState('fixture_full_body', T0);
    const { timeline } = locate(p, s, T0);
    s = { ...s, shiftMs: -(timeline.endsAt - T0) }; // jump effective clock to the end
    const r = applyCommand(p, s, cmd('SKIP', s.seq, T0));
    expect(r.state.endedEarly).toBe(true);
  });

  it('EXTEND_60 grants time on THIS exercise, clamped at its start — never a replay of the previous one', () => {
    const p = plan();
    let s = createRunnerState('fixture_full_body', T0);
    // 30s into the 60s warmup: extend restores the full segment (clamp = +30),
    // and the segment index must NOT move backwards.
    const now = T0 + 30_000;
    const before = locate(p, s, now).at;
    s = applyCommand(p, s, cmd('EXTEND_60', s.seq, now)).state;
    const after = locate(p, s, now).at;
    expect(after.index).toBe(before.index);
    expect(after.remainingSec).toBe(after.segment.durationSec); // clamped to segment start
  });

  it('EXTEND_60 grants the full 60 when the segment has room', () => {
    const p = plan();
    let s = createRunnerState('fixture_full_body', T0);
    // Find the 90s round break and stand 70s into it.
    const { timeline } = locate(p, s, T0);
    const roundBreak = timeline.segments.find((seg: { phase: string }) => seg.phase === 'round_break')!;
    const now = roundBreak.startsAt + 70_000;
    const before = locate(p, s, now).at;
    expect(before.segment.phase).toBe('round_break');
    s = applyCommand(p, s, cmd('EXTEND_60', s.seq, now)).state;
    const after = locate(p, s, now).at;
    expect(after.index).toBe(before.index);
    expect(after.remainingSec - before.remainingSec).toBe(60);
  });

  it('receivers take newer seq only', () => {
    const a: RunnerState = { ...createRunnerState('x', T0), seq: 5 };
    const b: RunnerState = { ...createRunnerState('x', T0), seq: 3 };
    expect(acceptRemoteState(a, b)).toBe(a);
    expect(acceptRemoteState(b, a)).toBe(a);
    expect(acceptRemoteState(null, b)).toBe(b);
  });
});

/** In-memory bus wiring N ChannelLike endpoints together. */
function makeBus(): () => ChannelLike {
  const handlers: Array<(ev: { data: RunnerMessage }) => void> = [];
  return () => {
    let mine: Array<(ev: { data: RunnerMessage }) => void> = [];
    return {
      postMessage(message: RunnerMessage) {
        // BroadcastChannel semantics: everyone EXCEPT the sender.
        for (const h of handlers) if (!mine.includes(h)) h({ data: message });
      },
      addEventListener(_t, handler) { handlers.push(handler); mine = [...mine, handler]; },
      close() {},
    };
  };
}

describe('runner channel — console publishes, receivers converge', () => {
  it('a late-opened audience window syncs via hello replay, commands flow back', () => {
    const bus = makeBus();
    const p = plan();
    let state = createRunnerState('fixture_full_body', T0);
    const received: RunnerCommand[] = [];

    createConsoleEndpoint({
      channel: bus(),
      getState: () => state,
      getPlan: () => p,
      onCommand: (c) => {
        const r = applyCommand(p, state, c);
        state = r.state;
      },
    });

    const seen: RunnerState[] = [];
    const audience = createReceiverEndpoint({
      channel: bus(),
      role: 'audience',
      onState: (s) => seen.push(s),
    });

    // hello replay delivered the current state
    expect(seen.at(-1)?.seq).toBe(1);

    // a floor command mutates the console state
    audience.sendCommand(cmd('PAUSE', 1, T0 + 5000));
    expect(state.pausedAtEpochMs).toBe(T0 + 5000);
    expect(received.length).toBe(0); // commands are handled, not echoed
  });

  it('stale frames are dropped, never rewound', () => {
    const bus = makeBus();
    const seen: number[] = [];
    createReceiverEndpoint({ channel: bus(), role: 'audience', onState: (s) => seen.push(s.seq) });
    const sender = bus();
    const mk = (seq: number): RunnerMessage => ({ v: 1, kind: 'state', state: { ...createRunnerState('x', T0), seq } });
    sender.postMessage(mk(4));
    sender.postMessage(mk(2)); // stale
    sender.postMessage(mk(5));
    expect(seen).toEqual([4, 5]);
  });
});

function memStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

describe('runner checkpoint — crash lands in place', () => {
  it('roundtrips state + plan and resumes in place', () => {
    const storage = memStorage();
    const p = plan();
    const s = { ...createRunnerState('fixture_full_body', T0), seq: 7, shiftMs: 90_000 };
    checkpointPlan(p, storage);
    checkpointState(s, storage);

    const resumed = loadCheckpoint(storage);
    expect(resumed?.state).toEqual(s);
    // The position derived after reload equals the position before the crash.
    const now = T0 + 600_000;
    expect(locate(resumed!.plan, resumed!.state, now).at.index)
      .toBe(locate(p, s, now).at.index);
  });

  it('a mismatched or corrupt checkpoint is cleared, not resumed', () => {
    const storage = memStorage();
    checkpointPlan({ planId: 'other_plan' }, storage);
    checkpointState(createRunnerState('fixture_full_body', T0), storage);
    expect(loadCheckpoint(storage)).toBeNull();
    expect(loadCheckpoint(storage)).toBeNull(); // and it stayed cleared

    storage.setItem('swan.bootcamp.runner.state.v1', '{not json');
    expect(loadCheckpoint(storage)).toBeNull();
  });

  it('clearCheckpoint means tomorrow starts fresh', () => {
    const storage = memStorage();
    checkpointPlan(plan(), storage);
    checkpointState(createRunnerState('fixture_full_body', T0), storage);
    clearCheckpoint(storage);
    expect(loadCheckpoint(storage)).toBeNull();
  });
});

describe('runner activation — one gesture, loud loss', () => {
  const mkTargets = (over: Record<string, unknown> = {}) => {
    const degraded: Array<[string, string]> = [];
    let releaseHandler: (() => void) | null = null;
    let visHandler: (() => void) | null = null;
    const targets = {
      fullscreenEl: { requestFullscreen: vi.fn(async () => {}) },
      videos: [{ play: vi.fn(async () => {}), muted: false }],
      audioContext: { state: 'suspended', resume: vi.fn(async () => {}) },
      wakeLockApi: {
        request: vi.fn(async () => ({
          addEventListener: (_: 'release', fn: () => void) => { releaseHandler = fn; },
        })),
      },
      documentRef: {
        visibilityState: 'visible',
        addEventListener: (_: 'visibilitychange', fn: () => void) => { visHandler = fn; },
      },
      onDegraded: (f: string, d: string) => degraded.push([f, d]),
      onWakeLockRestored: vi.fn(),
      ...over,
    };
    return { targets, degraded, fireRelease: () => releaseHandler?.(), fireVisibility: () => visHandler?.() };
  };

  it('acquires everything in one call and mutes videos before play', async () => {
    const { targets, degraded } = mkTargets();
    const result = await acquireAll(targets as never);
    expect(result).toEqual({ fullscreen: true, wakeLock: true, audio: true, video: true });
    expect(targets.videos[0].muted).toBe(true);
    expect(degraded).toHaveLength(0);
  });

  it('a missing wake lock API degrades LOUDLY, not silently', async () => {
    const { targets, degraded } = mkTargets({ wakeLockApi: null });
    const result = await acquireAll(targets as never);
    expect(result.wakeLock).toBe(false);
    expect(degraded.some(([f]) => f === 'wake_lock')).toBe(true);
  });

  it('re-acquires the lock when visibility returns (the alt-tab-at-minute-8 bug)', async () => {
    const { targets, fireVisibility } = mkTargets();
    await acquireAll(targets as never);
    fireVisibility();
    await Promise.resolve();
    expect((targets.wakeLockApi.request as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it('a release WHILE VISIBLE is reported as degradation', async () => {
    const { targets, degraded, fireRelease } = mkTargets();
    await acquireAll(targets as never);
    fireRelease();
    expect(degraded.some(([, d]) => d.includes('released while visible'))).toBe(true);
  });

  it('blocked audio is reported — silent cues would strand the whole class', async () => {
    const { targets, degraded } = mkTargets({
      audioContext: { state: 'suspended', resume: vi.fn(async () => { throw new Error('blocked'); }) },
    });
    const result = await acquireAll(targets as never);
    expect(result.audio).toBe(false);
    expect(degraded.some(([f]) => f === 'audio')).toBe(true);
  });
});
