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
  state = 'recording';
  ondataavailable: unknown = null;
  onstop: unknown = null;
  onerror: unknown = null;
  start() { /* recording begins */ }
  stop() { this.state = 'inactive'; }
}

let resolveGrant: ((stream: unknown) => void) | null = null;
const trackStop = vi.fn();
const fakeStream = { getTracks: () => [{ stop: trackStop }] };

beforeEach(() => {
  trackStop.mockClear();
  resolveGrant = null;
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(() => new Promise((res) => { resolveGrant = res; })),
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

    await act(async () => { resolveGrant?.(fakeStream); });

    expect(trackStop).toHaveBeenCalled();              // late grant stopped on arrival
    expect(result.current.state).toBe('idle');
  });

  it('a grant that arrives after reset() is released immediately', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    act(() => { void result.current.start(); });
    act(() => { result.current.reset(); });

    await act(async () => { resolveGrant?.(fakeStream); });

    expect(trackStop).toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });

  it('an uncancelled grant still records normally', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    act(() => { void result.current.start(); });
    await act(async () => { resolveGrant?.(fakeStream); });

    expect(result.current.state).toBe('recording');
    expect(trackStop).not.toHaveBeenCalled();
  });
});
