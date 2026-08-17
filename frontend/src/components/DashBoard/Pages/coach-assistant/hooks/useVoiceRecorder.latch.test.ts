/**
 * FILE: useVoiceRecorder.latch.test.ts
 * PURPOSE: Regression tests for the permission-window cancellation latch.
 *
 * GLM (dry-loop round 4): `stop()` during 'requesting' had nothing to stop —
 * no recorder exists yet and the in-flight getUserMedia cannot be aborted — so
 * a user could stop (or unmount every guard upstream), THEN click "Allow" on
 * the still-open permission bubble, and the microphone went live with no owner
 * and no release path until tab close. The latch stops a late grant on arrival.
 *
 * MediaRecorder is stubbed as WORKING on purpose: without the stub, jsdom's
 * missing MediaRecorder made the pre-fix code throw into its catch-cleanup,
 * which stopped the tracks by accident and made a broken implementation pass.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceRecorder } from './useVoiceRecorder';

class FakeMediaRecorder {
  static isTypeSupported() { return true; }
  static last: FakeMediaRecorder | null = null;
  state = 'recording';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { FakeMediaRecorder.last = this; }
  start() { /* recording begins */ }
  /** Real recorders deliver a final chunk then stop AFTER stop() returns. */
  stop() {
    this.state = 'inactive';
    setTimeout(() => {
      this.ondataavailable?.({ data: new Blob(['late final chunk']) });
      this.onstop?.();
    }, 0);
  }
}

let grantResolvers: Array<(stream: unknown) => void> = [];
/** The most recent pending grant — single-flight tests use this. */
const resolveGrant = (stream: unknown) => grantResolvers[grantResolvers.length - 1]?.(stream);
const trackStop = vi.fn();
const fakeStream = { getTracks: () => [{ stop: trackStop }] };

beforeEach(() => {
  trackStop.mockClear();
  grantResolvers = [];
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(() => new Promise((res) => { grantResolvers.push(res); })),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useVoiceRecorder — permission-window cancellation latch (GLM round 4)', () => {
  it('a grant that arrives after stop() is released immediately, nothing records', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    act(() => { void result.current.start(); });      // permission prompt open
    expect(result.current.state).toBe('requesting');

    act(() => { result.current.stop(); });             // nothing recording → latch

    await act(async () => { resolveGrant(fakeStream); });

    expect(trackStop).toHaveBeenCalled();              // late grant stopped on arrival
    expect(result.current.state).toBe('idle');
  });

  it('a grant that arrives after reset() is released immediately', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    act(() => { void result.current.start(); });
    act(() => { result.current.reset(); });

    await act(async () => { resolveGrant(fakeStream); });

    expect(trackStop).toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });

  it('an uncancelled grant still records normally', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    act(() => { void result.current.start(); });
    await act(async () => { resolveGrant(fakeStream); });

    expect(result.current.state).toBe('recording');
    expect(trackStop).not.toHaveBeenCalled();
  });

  /**
   * ROUND-5 REGRESSION (Codex HIGH). MediaRecorder delivers a final chunk
   * (then stop) AFTER stop() returns. With the old handlers still attached,
   * that late chunk arrived after reset(), rebuilt the blob, and flipped state
   * to 'stopped' — audio the user had just discarded resurrected itself.
   */
  it('a discarded recording cannot resurrect from a late final chunk', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useVoiceRecorder());
      act(() => { void result.current.start(); });
      await act(async () => { resolveGrant(fakeStream); });
      expect(result.current.state).toBe('recording');

      // stop() queues the late events; reset() lands before they deliver.
      act(() => { FakeMediaRecorder.last!.stop(); result.current.reset(); });
      act(() => { vi.runAllTimers(); });        // the late chunk arrives

      expect(result.current.state).toBe('idle');
      expect(result.current.audioBlob).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a normal stop still produces the blob', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useVoiceRecorder());
      act(() => { void result.current.start(); });
      await act(async () => { resolveGrant(fakeStream); });

      act(() => { FakeMediaRecorder.last!.stop(); });
      act(() => { vi.runAllTimers(); });

      expect(result.current.state).toBe('stopped');
      expect(result.current.audioBlob).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * ROUND-6 REGRESSION (Codex HIGH). The state mirror was render-time only, so
   * a stop() in the SAME TICK as start() read a stale 'idle', skipped the
   * requesting→idle settlement, and — because the cancelled flight is
   * forbidden to repair state — the hook stuck at visible 'requesting'
   * forever. Transitions now write the mirror synchronously.
   */
  it('stop in the same tick as start settles to idle immediately', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    act(() => {
      void result.current.start();
      result.current.stop();               // same tick — no render in between
    });

    expect(result.current.state).toBe('idle');

    await act(async () => { resolveGrant(fakeStream); });
    expect(trackStop).toHaveBeenCalled();  // the late grant still released
    expect(result.current.state).toBe('idle');
  });

  /**
   * ROUND-5 REGRESSION (GLM S2). start → stop (latch set) → start again
   * cleared the boolean latch while grant #1 was still pending — grant #1 was
   * then ACCEPTED against the cleared latch, and grant #2 overwrote every ref,
   * orphaning stream #1 with its microphone tracks live until tab close. The
   * per-flight generation makes a superseded grant release its tracks no
   * matter what the boolean says.
   */
  it('a superseded first flight releases its stream when two starts race', async () => {
    const track1Stop = vi.fn();
    const track2Stop = vi.fn();
    const stream1 = { getTracks: () => [{ stop: track1Stop }] };
    const stream2 = { getTracks: () => [{ stop: track2Stop }] };

    const { result } = renderHook(() => useVoiceRecorder());

    act(() => { void result.current.start(); });      // flight #1 pending
    act(() => { result.current.stop(); });             // user regrets the prompt
    act(() => { void result.current.start(); });      // flight #2 pending — old latch semantics cleared

    await act(async () => { grantResolvers[0]?.(stream1); });   // late grant for the DEAD flight
    expect(track1Stop).toHaveBeenCalled();             // stream #1 released, not adopted

    await act(async () => { grantResolvers[1]?.(stream2); });   // the live flight lands
    expect(result.current.state).toBe('recording');
    expect(track2Stop).not.toHaveBeenCalled();
  });
});
