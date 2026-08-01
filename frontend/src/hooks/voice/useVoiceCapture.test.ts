/**
 * useVoiceCapture.test.ts — S6 acceptance fence.
 * Locks: permission only on the start() gesture (never on mount); 120s
 * auto-stop; 8MB blob cap; lock-stop retains the blob + sets stoppedByLock;
 * denied permission lands in 'denied' with a type-instead reason.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useVoiceCapture, VOICE_CAPTURE_MAX_SECONDS, VOICE_CAPTURE_MAX_BYTES,
} from './useVoiceCapture';

class FakeRecorder {
  static instances: FakeRecorder[] = [];
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public stream: unknown, public options?: unknown) { FakeRecorder.instances.push(this); }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.onstop?.(); }
  static isTypeSupported() { return true; }
}

const getUserMedia = vi.fn();
const trackStop = vi.fn();
const audioContextResume = vi.fn().mockResolvedValue(undefined);
const audioContextClose = vi.fn().mockResolvedValue(undefined);

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: AudioContextState = 'suspended';
  resume = audioContextResume;
  close = audioContextClose;
  createAnalyser = () => ({ fftSize: 256, getByteTimeDomainData: vi.fn() });
  createMediaStreamSource = () => ({ connect: vi.fn() });
  constructor() { FakeAudioContext.instances.push(this); }
}

const mediaStream = () => ({ getTracks: () => [{ stop: trackStop }] });

beforeEach(() => {
  FakeRecorder.instances = [];
  FakeAudioContext.instances = [];
  trackStop.mockReset();
  audioContextResume.mockClear();
  audioContextClose.mockClear();
  getUserMedia.mockReset().mockResolvedValue(mediaStream());
  vi.stubGlobal('MediaRecorder', FakeRecorder as unknown as typeof MediaRecorder);
  vi.stubGlobal('AudioContext', FakeAudioContext as unknown as typeof AudioContext);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true, value: { getUserMedia },
  });
  vi.useFakeTimers();
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('S6 useVoiceCapture', () => {
  it('never touches the microphone on mount — permission rides the gesture only', () => {
    renderHook(() => useVoiceCapture());
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('starts on gesture with the noise-suppression posture and stops into a blob', async () => {
    const { result } = renderHook(() => useVoiceCapture());
    await act(async () => { await result.current.start(); });
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    expect(result.current.state).toBe('recording');
    const recorder = FakeRecorder.instances[0];
    act(() => { recorder.ondataavailable?.({ data: new Blob(['abc']) }); recorder.stop(); });
    expect(result.current.state).toBe('stopped');
    expect(result.current.audioBlob).not.toBeNull();
    expect(result.current.stoppedByLock).toBe(false);
    expect(audioContextClose).toHaveBeenCalledTimes(1);
  });

  it('auto-stops at the 120s ceiling', async () => {
    const { result } = renderHook(() => useVoiceCapture());
    await act(async () => { await result.current.start(); });
    act(() => { vi.advanceTimersByTime(VOICE_CAPTURE_MAX_SECONDS * 1000 + 50); });
    expect(result.current.state).toBe('stopped');
  });

  it('drops an over-cap blob with an error instead of sending it', async () => {
    const { result } = renderHook(() => useVoiceCapture());
    await act(async () => { await result.current.start(); });
    const recorder = FakeRecorder.instances[0];
    const huge = new Blob([new Uint8Array(1024)]);
    Object.defineProperty(Blob.prototype, 'size', { configurable: true, get() { return VOICE_CAPTURE_MAX_BYTES + 1; } });
    try {
      act(() => { recorder.ondataavailable?.({ data: huge }); recorder.stop(); });
      expect(result.current.state).toBe('error');
      expect(result.current.audioBlob).toBeNull();
    } finally {
      delete (Blob.prototype as { size?: unknown }).size;
    }
  });

  it('screen lock stops the recorder, RETAINS the blob, and flags stoppedByLock', async () => {
    const { result } = renderHook(() => useVoiceCapture());
    await act(async () => { await result.current.start(); });
    const recorder = FakeRecorder.instances[0];
    act(() => { recorder.ondataavailable?.({ data: new Blob(['take']) }); });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(result.current.state).toBe('stopped');
    expect(result.current.audioBlob).not.toBeNull();
    expect(result.current.stoppedByLock).toBe(true);
  });

  it('denied permission lands in "denied" with a type-instead reason', async () => {
    getUserMedia.mockRejectedValue(new DOMException('nope', 'NotAllowedError'));
    const { result } = renderHook(() => useVoiceCapture());
    await act(async () => { await result.current.start(); });
    expect(result.current.state).toBe('denied');
    expect(result.current.error).toMatch(/type instead/i);
    expect(audioContextClose).toHaveBeenCalledTimes(1);
  });

  it('primes and resumes AudioContext inside the start gesture before mic permission settles', async () => {
    let resolvePermission!: (stream: ReturnType<typeof mediaStream>) => void;
    getUserMedia.mockReturnValue(new Promise(resolve => { resolvePermission = resolve; }));
    const { result } = renderHook(() => useVoiceCapture());
    let startPromise!: Promise<void>;
    act(() => { startPromise = result.current.start(); });
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(audioContextResume).toHaveBeenCalledTimes(1);
    await act(async () => { resolvePermission(mediaStream()); await startPromise; });
  });

  it('coalesces repeated starts while the permission request is still pending', async () => {
    let resolvePermission!: (stream: ReturnType<typeof mediaStream>) => void;
    getUserMedia.mockReturnValue(new Promise(resolve => { resolvePermission = resolve; }));
    const { result } = renderHook(() => useVoiceCapture());
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => { first = result.current.start(); second = result.current.start(); });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    await act(async () => { resolvePermission(mediaStream()); await Promise.all([first, second]); });
    expect(FakeRecorder.instances).toHaveLength(1);
  });

  it('stops a late permission stream instead of opening a recorder after unmount', async () => {
    let resolvePermission!: (stream: ReturnType<typeof mediaStream>) => void;
    getUserMedia.mockReturnValue(new Promise(resolve => { resolvePermission = resolve; }));
    const { result, unmount } = renderHook(() => useVoiceCapture());
    let startPromise!: Promise<void>;
    act(() => { startPromise = result.current.start(); });
    unmount();
    resolvePermission(mediaStream());
    await startPromise;
    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(FakeRecorder.instances).toHaveLength(0);
    expect(audioContextClose).toHaveBeenCalledTimes(1);
  });

  it('pagehide always safe-stops even before visibilityState changes', async () => {
    const { result } = renderHook(() => useVoiceCapture());
    await act(async () => { await result.current.start(); });
    const recorder = FakeRecorder.instances[0];
    act(() => { recorder.ondataavailable?.({ data: new Blob(['take']) }); });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(result.current.state).toBe('stopped');
    expect(result.current.stoppedByLock).toBe(true);
  });

  it('a release during the permission prompt never starts an invisible recording later', async () => {
    let resolvePermission!: (stream: ReturnType<typeof mediaStream>) => void;
    getUserMedia.mockReturnValue(new Promise(resolve => { resolvePermission = resolve; }));
    const { result } = renderHook(() => useVoiceCapture());
    let startPromise!: Promise<void>;
    act(() => { startPromise = result.current.start(); });
    act(() => { result.current.stop(); });
    await act(async () => { resolvePermission(mediaStream()); await startPromise; });
    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(FakeRecorder.instances).toHaveLength(0);
    expect(result.current.state).toBe('error');
    expect(result.current.error).toMatch(/hold again/i);
  });
});
