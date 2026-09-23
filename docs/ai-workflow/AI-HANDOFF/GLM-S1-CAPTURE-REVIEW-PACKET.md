# GLM-5.3 hostile review — S1 unified capture engine

## Context correcting your own S1 spec
Your build order said 'three transcription paths... unify into one; the three legacy hooks are
wrappers or deleted.' On reading the source that framing is WRONG and I did not follow it:

- useVoiceRecorder (MediaRecorder -> Blob) and useGeminiTranscription (Blob -> text) are TWO
  STAGES OF ONE PIPELINE, not two competing paths. Their mutual references are docblock
  comments only - verified, no circular import.
- useCoachBrowserSpeechInput is a genuinely DIFFERENT strategy (Web Speech API, live interim
  text straight into a field, tightly coupled to composer callbacks).

So: 2 strategies, not 3 duplicates. Deleting or wrapping them into one would destroy the
interim-text capability freestyle needs. What WAS actually missing, and what I built:

**No lifecycle policy anywhere.** grep for visibilitychange / pagehide / beforeunload across
useVoiceRecorder, useCoachBrowserSpeechInput and VoiceRecordingOverlay returned ZERO hits.
A recording survived tab-hide, screen lock, and in-app route change with the mic still open.
That is a privacy defect and it is what the freestyle retention contract requires closed.

## Consumers (verified)
- Pipeline RECORD: VoiceRecordingOverlay.tsx (uses both hooks)
- Pipeline LIVE: CoachInputBar.tsx, CoachCommandCenter.voiceCapture.ts, and
  ClientTrainingCommandBar.tsx (OUTSIDE the Coach page - deliberately out of scope)

## Verification run this session
- 9/9 new lifecycle tests pass
- MUTATION CHECK: removing the lifecycle listeners kills 4 of 9 -> the tests have teeth
- tsc --noEmit exit 0, 0 errors repo-wide
- npm run build exit 0
- coach-assistant suite: 681/683 pass; the 2 failures are PRE-EXISTING (reproduced with my
  files deleted) and concern CoachCommandCenterPage.tsx content on a stale branch

## YOUR REMIT
Attack this. Specifically: is the ref-mirroring correct or does it have a stale-closure or
race bug? Is stop() idempotent under real event ordering? Does the unmount cleanup fire
stop() in a way that leaks or double-stops? Is the error-precedence right? Does the mocked
test prove what it claims, or is it self-confirming? What did I MISS that freestyle will need?
Rank worst-first. Cite lines. Do not praise.

## SOURCE: useCoachCapture.ts
```ts
/**
 * ============================================================================
 * FILE: useCoachCapture.ts
 * PURPOSE: Single entry point for microphone capture beneath Swan Coach.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-16
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * Coach had two independent capture pipelines and no shared lifecycle policy:
 *
 *   Pipeline LIVE    useCoachBrowserSpeechInput  — Web Speech API, interim text
 *                                                  straight into a field.
 *   Pipeline RECORD  useVoiceRecorder            — MediaRecorder → Blob,
 *                    → useGeminiTranscription      then server-side transcript.
 *
 * These are NOT redundant implementations of one thing; they are two strategies
 * with different strengths. LIVE gives words on screen as you speak but is
 * restart-limited on iOS Safari for long sessions. RECORD survives long-form
 * capture and produces the authoritative transcript, but shows nothing while
 * it runs. Freestyle dictation needs both at once — interim feedback from LIVE,
 * authoritative text from RECORD.
 *
 * What was genuinely missing, and what this hook adds, is a shared LIFECYCLE
 * POLICY. Neither pipeline listened for `visibilitychange`, `pagehide`, or
 * unmount, so an in-flight recording survived tab-hide and route changes: a hot
 * microphone the user could not see. That is a privacy defect, not an untidiness
 * one, and it is what the freestyle retention contract requires be closed
 * (docs/ai-workflow/AI-HANDOFF/SWAN-COACH-FREESTYLE-RETENTION-CONTRACT-2026-08-16.md).
 *
 * SCOPE: this hook owns lifecycle + a unified status/error surface. It delegates
 * capture itself to the existing hooks rather than reimplementing them, so the
 * transcript output of the existing file-upload path is unchanged.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceRecorder } from './useVoiceRecorder';
import { useGeminiTranscription } from './useGeminiTranscription';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

/** Which capture strategy a caller wants. */
export type CaptureStrategy = 'record';

/**
 * Unified capture status. Collapses useVoiceRecorder's RecordingState and
 * useGeminiTranscription's TranscriptionState into one machine so callers
 * render one set of states instead of reconciling two.
 */
export type CaptureStatus =
  | 'idle'
  | 'requesting'   // waiting on the mic permission prompt
  | 'capturing'
  | 'transcribing'
  | 'done'
  | 'error';

/** Why capture ended. `auto` means the lifecycle policy stopped it, not the user. */
export type CaptureStopReason = 'user' | 'auto-hidden' | 'auto-unmount';

export interface UseCoachCaptureReturn {
  status: CaptureStatus;
  /** Seconds elapsed in the current capture. */
  duration: number;
  /** Authoritative transcript, populated once transcription completes. */
  transcript: string;
  /** User-facing error copy. One wording for every entry point. */
  error: string | null;
  /** True when the last stop was triggered by the lifecycle policy. */
  stoppedAutomatically: boolean;
  start: () => Promise<void>;
  stop: (reason?: CaptureStopReason) => void;
  reset: () => void;
}

/**
 * Single source of permission-denied copy. Previously each entry point phrased
 * this differently, so the same failure read as a different problem depending
 * on where the user hit it.
 */
export const CAPTURE_PERMISSION_DENIED_COPY =
  'Swan Coach needs microphone access to hear you. Enable it in your browser settings, then try again.';

export const CAPTURE_AUTO_STOPPED_COPY =
  'Recording stopped because you left this screen. Nothing was saved.';

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useCoachCapture(): UseCoachCaptureReturn {
  const recorder = useVoiceRecorder();
  const transcription = useGeminiTranscription();

  const [stoppedAutomatically, setStoppedAutomatically] = useState(false);
  const [autoStopCopy, setAutoStopCopy] = useState<string | null>(null);

  /**
   * Mirrors recorder state for the lifecycle listeners. Reading React state
   * inside a native event handler would capture a stale value from the closure
   * the listener was registered in.
   */
  const isCapturingRef = useRef(false);
  useEffect(() => {
    isCapturingRef.current = recorder.state === 'recording' || recorder.state === 'requesting';
  }, [recorder.state]);

  const recorderStopRef = useRef(recorder.stop);
  useEffect(() => { recorderStopRef.current = recorder.stop; }, [recorder.stop]);

  const stop = useCallback((reason: CaptureStopReason = 'user') => {
    if (!isCapturingRef.current) return;
    isCapturingRef.current = false;
    if (reason !== 'user') {
      setStoppedAutomatically(true);
      setAutoStopCopy(CAPTURE_AUTO_STOPPED_COPY);
    }
    recorderStopRef.current();
  }, []);

  /**
   * LIFECYCLE POLICY — the reason this hook exists.
   *
   * `visibilitychange` covers tab switch, app background, and screen lock.
   * `pagehide` covers navigation away and bfcache eviction; it is used instead
   * of `beforeunload` because Safari does not fire `beforeunload` reliably on
   * iOS. Unmount covers in-app route changes, which fire neither event.
   */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') stop('auto-hidden');
    };
    const onPageHide = () => stop('auto-hidden');

    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
      // Unmount is a route change: release the microphone rather than leaving
      // a capture running against a component that no longer exists.
      stop('auto-unmount');
    };
  }, [stop]);

  const start = useCallback(async () => {
    setStoppedAutomatically(false);
    setAutoStopCopy(null);
    transcription.reset();
    await recorder.start();
  }, [recorder, transcription]);

  const reset = useCallback(() => {
    setStoppedAutomatically(false);
    setAutoStopCopy(null);
    recorder.reset();
    transcription.reset();
  }, [recorder, transcription]);

  // Map the two underlying machines onto one status.
  let status: CaptureStatus = 'idle';
  if (recorder.state === 'error' || transcription.state === 'error') status = 'error';
  else if (recorder.state === 'requesting') status = 'requesting';
  else if (recorder.state === 'recording') status = 'capturing';
  else if (transcription.state === 'transcribing') status = 'transcribing';
  else if (transcription.state === 'done') status = 'done';

  /**
   * Error precedence: an auto-stop notice outranks the underlying error,
   * because "you navigated away" explains the failure better than whatever
   * the recorder reports after having its stream pulled.
   */
  const rawError = recorder.error ?? transcription.error ?? null;
  const error = autoStopCopy
    ?? (rawError && /permission|denied|notallowed/i.test(rawError)
      ? CAPTURE_PERMISSION_DENIED_COPY
      : rawError);

  return {
    status,
    duration: recorder.duration,
    transcript: transcription.text,
    error,
    stoppedAutomatically,
    start,
    stop,
    reset,
  };
}
```

## SOURCE: useCoachCapture.lifecycle.test.ts
```ts
/**
 * FILE: useCoachCapture.lifecycle.test.ts
 * PURPOSE: Regression tests for the hot-microphone defect.
 *
 * Before useCoachCapture existed, neither capture pipeline listened for
 * visibilitychange, pagehide, or unmount. A recording started in Coach kept the
 * microphone open when the user switched tabs, locked the phone, or navigated to
 * another route — with no visible indication. These tests fail against that
 * behaviour and pass against the lifecycle policy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState, useCallback } from 'react';
import { renderHook, act } from '@testing-library/react';

const recorderStop = vi.fn();
const recorderReset = vi.fn();
const transcriptionReset = vi.fn();

/** Seeds the mock's initial state so error cases can be set up before render. */
let initialState = 'idle';
let recorderError: string | null = null;

/**
 * The stand-in for useVoiceRecorder must hold REAL React state. An earlier
 * version returned a plain object over a module-level variable; `start()`
 * mutated it but nothing re-rendered, so the hook under test never observed
 * the 'recording' transition and every lifecycle assertion failed. The real
 * useVoiceRecorder holds useState, so the mock has to as well or the test is
 * measuring the mock rather than the hook.
 */
vi.mock('./useVoiceRecorder', () => ({
  useVoiceRecorder: () => {
    const [state, setState] = useState(initialState);
    const start = useCallback(async () => { setState('recording'); }, []);
    const stop = useCallback(() => { recorderStop(); setState('stopped'); }, []);
    return {
      state,
      audioBlob: null,
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
    state: 'idle',
    text: '',
    error: null,
    transcribe: vi.fn(),
    reset: transcriptionReset,
  }),
}));

import { useCoachCapture, CAPTURE_PERMISSION_DENIED_COPY, CAPTURE_AUTO_STOPPED_COPY } from './useCoachCapture';

const setVisibility = (value: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useCoachCapture lifecycle policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initialState = 'idle';
    recorderError = null;
    setVisibility('visible');
  });

  it('releases the microphone when the tab is hidden mid-capture', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await act(async () => { await result.current.start(); });

    expect(recorderStop).not.toHaveBeenCalled();
    act(() => { setVisibility('hidden'); });

    expect(recorderStop).toHaveBeenCalledTimes(1);
    expect(result.current.stoppedAutomatically).toBe(true);
    expect(result.current.error).toBe(CAPTURE_AUTO_STOPPED_COPY);
  });

  it('releases the microphone on pagehide (iOS Safari does not fire beforeunload)', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await act(async () => { await result.current.start(); });

    act(() => { window.dispatchEvent(new Event('pagehide')); });

    expect(recorderStop).toHaveBeenCalledTimes(1);
    expect(result.current.stoppedAutomatically).toBe(true);
  });

  it('releases the microphone on unmount — the in-app route-change case', async () => {
    const { result, unmount } = renderHook(() => useCoachCapture());
    await act(async () => { await result.current.start(); });

    unmount();

    expect(recorderStop).toHaveBeenCalledTimes(1);
  });

  it('does not call stop when nothing is capturing', () => {
    renderHook(() => useCoachCapture());
    act(() => { setVisibility('hidden'); });
    expect(recorderStop).not.toHaveBeenCalled();
  });

  it('stops only once when several lifecycle events fire together', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await act(async () => { await result.current.start(); });

    act(() => {
      setVisibility('hidden');
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(recorderStop).toHaveBeenCalledTimes(1);
  });

  it('a user-initiated stop is not reported as automatic', async () => {
    const { result } = renderHook(() => useCoachCapture());
    await act(async () => { await result.current.start(); });

    act(() => { result.current.stop('user'); });

    expect(recorderStop).toHaveBeenCalledTimes(1);
    expect(result.current.stoppedAutomatically).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useCoachCapture unified surface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initialState = 'idle';
    recorderError = null;
    setVisibility('visible');
  });

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

  it('collapses the two underlying machines into one status', async () => {
    const { result } = renderHook(() => useCoachCapture());
    expect(result.current.status).toBe('idle');

    await act(async () => { await result.current.start(); });
    expect(result.current.status).toBe('capturing');
  });
});
```
