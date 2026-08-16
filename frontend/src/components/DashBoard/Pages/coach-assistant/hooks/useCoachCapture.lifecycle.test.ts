/**
 * FILE: useCoachCapture.lifecycle.test.ts
 * PURPOSE: Regression tests for the hot-microphone defect.
 *
 * Before useCoachCapture existed, neither capture pipeline listened for
 * visibilitychange, pagehide, or unmount, and `useVoiceRecorder` has no useEffect
 * at all — so it never released the MediaStream. A capture kept the microphone
 * open across tab-hide, screen lock, and in-app route change with no indication.
 *
 * The mock below models the permission prompt as a DISTINCT, manually-resolved
 * state. An earlier version jumped straight from start() to 'recording', which
 * made the most privacy-critical ordering in the hook — permission granted while
 * the page is hidden — structurally impossible to test. Any future change that
 * removes the 'requesting' step re-blinds this suite.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState, useCallback } from 'react';
import { renderHook, act } from '@testing-library/react';

const recorderStop = vi.fn();
const recorderReset = vi.fn();
const transcriptionReset = vi.fn();
const transcribeSpy = vi.fn(async () => 'transcribed text');

let initialState = 'idle';
let recorderError: string | null = null;
let transcriptionError: string | null = null;
let transcriptionState = 'idle';
let audioBlob: Blob | null = null;

/** Resolves the pending permission prompt from inside a test. */
let grantPermission: (() => void) | null = null;

vi.mock('./useVoiceRecorder', () => ({
  useVoiceRecorder: () => {
    const [state, setState] = useState(initialState);
    const start = useCallback(async () => {
      setState('requesting');
      grantPermission = () => setState('recording');
    }, []);
    const stop = useCallback(() => { recorderStop(); setState('stopped'); }, []);
    return {
      state,
      audioBlob,
      duration: 0,
      error: recorderError,
      start,
      stop,
      reset: recorderReset,
    };
  },
}));

vi.mock('./useGeminiTranscription', () => ({
  useGeminiTranscription: () => ({
    state: transcriptionState,
    text: '',
    error: transcriptionError,
    transcribe: transcribeSpy,
    reset: transcriptionReset,
  }),
}));

import {
  useCoachCapture,
  CAPTURE_PERMISSION_DENIED_COPY,
  CAPTURE_AUTO_STOPPED_COPY,
} from './useCoachCapture';

const setVisibility = (value: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

/** start() + grant permission — the ordinary path to an active capture. */
const beginCapture = async (result: { current: { start: () => Promise<void> } }) => {
  await act(async () => { await result.current.start(); });
  act(() => { grantPermission?.(); });
};

beforeEach(() => {
  vi.clearAllMocks();
  initialState = 'idle';
  recorderError = null;
  transcriptionError = null;
  transcriptionState = 'idle';
  audioBlob = null;
  grantPermission = null;
  setVisibility('visible');
});

describe('useCoachCapture lifecycle policy', () => {
  it('releases the microphone when the tab is hidden mid-capture', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await beginCapture(result);

    expect(recorderStop).not.toHaveBeenCalled();
    act(() => { setVisibility('hidden'); });

    expect(recorderStop).toHaveBeenCalledTimes(1);
    expect(result.current.stoppedAutomatically).toBe(true);
    expect(result.current.error).toBe(CAPTURE_AUTO_STOPPED_COPY);
  });

  it('releases the microphone on pagehide (iOS Safari does not fire beforeunload)', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await beginCapture(result);

    act(() => { window.dispatchEvent(new Event('pagehide')); });

    expect(recorderStop).toHaveBeenCalledTimes(1);
  });

  it('releases the microphone on unmount — the in-app route-change case', async () => {
    const { result, unmount } = renderHook(() => useCoachCapture());
    await beginCapture(result);

    unmount();

    expect(recorderStop).toHaveBeenCalledTimes(1);
  });

  it('does not call stop when nothing is capturing', () => {
    renderHook(() => useCoachCapture());
    act(() => { setVisibility('hidden'); });
    expect(recorderStop).not.toHaveBeenCalled();
  });

  /**
   * THE CRITICAL CASE. Hiding during the permission prompt cannot cancel an
   * in-flight getUserMedia — there is no AbortController to abort. So the user
   * can grant permission while the page is hidden, the recorder goes live, and
   * without the late-arrival guard the microphone is open on a hidden page while
   * the UI says "Recording stopped… Nothing was saved."
   */
  it('stops a capture whose permission is granted AFTER the page is hidden', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await act(async () => { await result.current.start(); });
    expect(result.current.status).toBe('requesting');

    act(() => { setVisibility('hidden'); });
    act(() => { grantPermission?.(); });   // user taps Allow on a hidden page

    expect(recorderStop).toHaveBeenCalled();
    expect(result.current.status).not.toBe('capturing');
  });

  /**
   * Cross-task ordering, not one batched act. A phone locking during navigation
   * fires visibilitychange and pagehide in separate tasks with a render between.
   * A second stop against an already-stopping MediaRecorder throws InvalidStateError.
   */
  it('does not double-stop when lifecycle events arrive in separate tasks', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await beginCapture(result);

    act(() => { setVisibility('hidden'); });
    act(() => { window.dispatchEvent(new Event('pagehide')); });

    expect(recorderStop).toHaveBeenCalledTimes(1);
  });

  /**
   * FABLE F-1 — SMOKE ONLY. THIS TEST DOES NOT PROVE THE FIX.
   *
   * The defect lives between `start()` being called and the mirror effect
   * flushing. `act()` flushes effects synchronously, so by the time this test can
   * dispatch anything the flag is already set by the effect — reverting the
   * synchronous assignment in `start()` kills no test here (verified by mutation).
   *
   * The fix is kept on Fable's reasoning, which is sound: in a real browser that
   * window is open, and a pagehide inside it left the stop latch unset, so
   * permission resolving afterwards took the mic live on a hidden page. Proving it
   * needs Playwright. This test only guards the surrounding ordering.
   */
  it('stops when hidden before permission resolves (smoke — see comment)', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await act(async () => { await result.current.start(); });

    // Hide BEFORE granting: the recorder has not reached 'recording' yet.
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    act(() => { grantPermission?.(); });

    expect(recorderStop).toHaveBeenCalled();
    expect(result.current.status).not.toBe('capturing');
  });

  /**
   * FABLE F-4. reset() used to clear the stop latch. With getUserMedia still in
   * flight the late-arrival guard then never fired, so recording could begin
   * after a reset.
   */
  it('reset() does not re-open the permission window', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await act(async () => { await result.current.start(); });

    act(() => { result.current.reset(); });
    act(() => { grantPermission?.(); });   // prompt resolves after the reset

    expect(result.current.status).not.toBe('capturing');
  });

  it('a user-initiated stop is not reported as automatic', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await beginCapture(result);

    act(() => { result.current.stop(); });

    expect(recorderStop).toHaveBeenCalledTimes(1);
    expect(result.current.stoppedAutomatically).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('start() is a no-op while already capturing, so one tap cannot open two prompts', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await beginCapture(result);

    const before = transcriptionReset.mock.calls.length;
    await act(async () => { await result.current.start(); });

    expect(transcriptionReset.mock.calls.length).toBe(before);
  });
});

describe('useCoachCapture unified surface', () => {
  it('maps a permission failure to one shared wording regardless of entry point', () => {
    initialState = 'error';
    recorderError = 'NotAllowedError: Permission denied';
    const { result } = renderHook(() => useCoachCapture());

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe(CAPTURE_PERMISSION_DENIED_COPY);
  });

  it('passes through a non-permission error rather than mislabelling it', () => {
    initialState = 'error';
    recorderError = 'No audio track available';
    const { result } = renderHook(() => useCoachCapture());

    expect(result.current.error).toBe('No audio track available');
  });

  /**
   * Precedence must favour the real error. If "you left this screen" won, a
   * permission revocation discovered after an auto-stop would be masked and the
   * user would retry forever against the wrong explanation.
   */
  it('a real error outranks a lingering auto-stop notice', async () => {
    const { result, rerender } = renderHook(() => useCoachCapture());
    await beginCapture(result);
    act(() => { setVisibility('hidden'); });
    expect(result.current.error).toBe(CAPTURE_AUTO_STOPPED_COPY);

    recorderError = 'NotAllowedError: Permission denied';
    rerender();

    expect(result.current.error).toBe(CAPTURE_PERMISSION_DENIED_COPY);
  });

  it('dismissNotice clears an auto-stop banner without a restart', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await beginCapture(result);
    act(() => { setVisibility('hidden'); });
    expect(result.current.error).toBe(CAPTURE_AUTO_STOPPED_COPY);

    act(() => { result.current.dismissNotice(); });

    expect(result.current.error).toBeNull();
  });

  it('exposes the RECORD pipeline end to end rather than advertising dead states', async () => {
    audioBlob = new Blob(['x'], { type: 'audio/webm' });
    const { result } = renderHook(() => useCoachCapture());

    let text = '';
    await act(async () => { text = await result.current.transcribe(); });

    expect(transcribeSpy).toHaveBeenCalledWith(audioBlob);
    expect(text).toBe('transcribed text');
  });

  it('transcribe() is a no-op with no audio instead of calling the API', async () => {
    const { result } = renderHook(() => useCoachCapture());

    let text = 'unset';
    await act(async () => { text = await result.current.transcribe(); });

    expect(transcribeSpy).not.toHaveBeenCalled();
    expect(text).toBe('');
  });

  it("reports 'ready' when capture has finished and audio awaits transcription", async () => {
    audioBlob = new Blob(['x'], { type: 'audio/webm' });
    const { result } = renderHook(() => useCoachCapture());
    await beginCapture(result);

    act(() => { result.current.stop(); });

    // Must be distinguishable from a session that never started.
    expect(result.current.status).toBe('ready');
    expect(result.current.audioBlob).toBe(audioBlob);
  });

  it('surfaces the transcribing and done states the status machine advertises', () => {
    transcriptionState = 'transcribing';
    const { result, rerender } = renderHook(() => useCoachCapture());
    expect(result.current.status).toBe('transcribing');

    transcriptionState = 'done';
    rerender();
    expect(result.current.status).toBe('done');
  });
});
