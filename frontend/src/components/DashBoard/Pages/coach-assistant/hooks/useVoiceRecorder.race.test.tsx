/**
 * G06/T31 hostile round 2 — prove the getUserMedia race guard.
 *
 * abort()/reset() during the 'requesting' phase (permission prompt pending)
 * must prevent a late getUserMedia resolve from starting an invisible
 * recording: the stream's tracks are stopped immediately and no recorder,
 * blob or transcription handoff ever happens.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVoiceRecorder } from './useVoiceRecorder';

class MockMediaRecorder {
  static instances: MockMediaRecorder[] = [];
  static isTypeSupported() {
    return true;
  }
  state = 'inactive';
  stream: MediaStream;
  ondataavailable: ((event: { data: { size: number } }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start = vi.fn(() => {
    this.state = 'recording';
  });
  stop = vi.fn(() => {
    this.state = 'inactive';
  });
  constructor(stream: MediaStream) {
    this.stream = stream;
    MockMediaRecorder.instances.push(this);
  }
}

function makeTrack() {
  return { stop: vi.fn(), kind: 'audio' };
}

describe('useVoiceRecorder abort race (G06/T31, hostile round 2)', () => {
  let resolveGetUserMedia: ((stream: MediaStream) => void) | null = null;
  let track: ReturnType<typeof makeTrack>;

  beforeEach(() => {
    MockMediaRecorder.instances = [];
    track = makeTrack();
    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = MockMediaRecorder;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      writable: true,
      value: {
        getUserMedia: vi.fn(() => new Promise<MediaStream>((resolve) => {
          resolveGetUserMedia = (stream) => resolve(stream);
        })),
      },
    });
  });

  afterEach(() => {
    delete (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder;
  });

  it('a late getUserMedia resolve after abort stops the tracks and never records', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    let startPromise: Promise<void> | null = null;
    act(() => {
      startPromise = result.current.start();
    });
    expect(result.current.state).toBe('requesting');

    // Surface loses the foreground while the permission prompt is pending.
    await act(async () => {
      result.current.abort();
    });
    expect(result.current.state).toBe('idle');

    // The permission grant arrives AFTER the abort.
    await act(async () => {
      resolveGetUserMedia?.({ getTracks: () => [track] } as unknown as MediaStream);
      await startPromise;
    });

    // The mic was released; no recorder was ever constructed; no blob.
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(MockMediaRecorder.instances).toHaveLength(0);
    expect(result.current.state).toBe('idle');
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('reset() closes the same race: a pending prompt can never attach a stream', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    let startPromise: Promise<void> | null = null;
    act(() => {
      startPromise = result.current.start();
    });
    await act(async () => {
      result.current.reset();
    });
    await act(async () => {
      resolveGetUserMedia?.({ getTracks: () => [track] } as unknown as MediaStream);
      await startPromise;
    });

    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(MockMediaRecorder.instances).toHaveLength(0);
    expect(result.current.state).toBe('idle');
  });
});
