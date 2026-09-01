/**
 * ============================================================================
 * FILE: useVoiceRecorder.ts
 * PURPOSE: MediaRecorder hook for capturing audio blobs from the microphone
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Manages browser MediaRecorder lifecycle — request mic permission, start/stop
 * recording, collect audio chunks, produce a Blob for upload to the backend
 * transcription endpoint.
 *
 * HOW IT FITS IN THE APP:
 * VoiceRecordingOverlay → useVoiceRecorder (this) → produces audioBlob
 *   → useGeminiTranscription → POST /api/ai-chat/transcribe → text result
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { safeMicrophoneFailure } from '../CoachIntakeOperationalText.logic';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';

export interface UseVoiceRecorderReturn {
  state: RecordingState;
  audioBlob: Blob | null;
  duration: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  /** Live mic RMS 0..1 for level-reactive UI; 0 when unavailable. */
  getAudioLevel: () => number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Preferred MIME types (ordered by browser support)
// ─────────────────────────────────────────────────────────────
const MIME_CANDIDATES_DESKTOP = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

function getSupportedMime(): string {
  // iOS Safari only reliably supports audio/mp4
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
  }
  for (const mime of MIME_CANDIDATES_DESKTOP) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────
export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  /**
   * Cancellation latch for the permission window. `stop()` during 'requesting'
   * has nothing to stop — no recorder exists yet — and the in-flight
   * getUserMedia cannot be aborted. Without this latch a user could tap stop
   * (or navigate away, unmounting every guard upstream), THEN click "Allow" on
   * the still-open permission bubble, and the microphone went live with no
   * owner and no release path until tab close. Checked the moment the promise
   * resolves; a late grant is stopped before any recorder is built.
   */
  const cancelRequestedRef = useRef(false);

  /**
   * Per-flight generation. The boolean latch alone guards a world that can hold
   * TWO in-flight getUserMedia requests: start → stop (latch set) → start again
   * (latch CLEARED, second request issued) → grant #1 resolves against the
   * cleared latch and is accepted — then grant #2 overwrites every ref and
   * stream #1's tracks are never stopped by anyone. Each start mints a
   * generation; only the CURRENT generation's grant may build a recorder.
   */
  const flightSeqRef = useRef(0);

  /**
   * Mirrors `state` for callbacks with empty deps — their closures go stale.
   * Written SYNCHRONOUSLY by every transition via setRecState: a render-time
   * mirror alone lags one commit, so a stop() issued in the same tick as
   * start() read a stale 'idle', skipped the requesting→idle settlement, and
   * the hook stuck at visible 'requesting' forever.
   */
  const stateRef = useRef<RecordingState>('idle');
  stateRef.current = state;

  const setRecState = useCallback((next: RecordingState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    levelBufferRef.current = null;
    /**
     * Detach handlers BEFORE dropping the reference. MediaRecorder queues a
     * final `dataavailable` (then `stop`) after stop() — with the closures
     * still attached, that late chunk arrived AFTER a reset, rebuilt the blob,
     * and flipped state to 'stopped': audio the user had just discarded
     * resurrected itself.
     */
    if (recorderRef.current) {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = null;
      recorderRef.current.onerror = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = useCallback(async () => {
    const flight = ++flightSeqRef.current;
    /**
     * SUPERSEDE SAFELY. A second start while a recorder/stream exists — live,
     * or stopped-with-queued-final-events — used to overwrite the only refs:
     * the old stream's tracks became unreachable (mic live until tab close) and
     * the old recorder's still-attached onstop then built a blob from the NEW
     * flight's chunks and cleanup()'d the NEW refs. Release anything held,
     * synchronously, before creating anything new.
     */
    if (recorderRef.current || streamRef.current) cleanup();
    try {
      cancelRequestedRef.current = false;   // only a new start clears the latch
      setError(null);
      setAudioBlob(null);
      setDuration(0);
      setRecState('requesting');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelRequestedRef.current || flight !== flightSeqRef.current) {
        // Stop/reset was requested while the prompt was open, or a NEWER start
        // superseded this flight. Either way the grant arrived for a request
        // that no longer owns the microphone — release the tracks immediately,
        // build nothing, and touch no state that now belongs to another flight.
        stream.getTracks().forEach(t => t.stop());
        if (flight === flightSeqRef.current) setRecState('idle');
        return;
      }
      streamRef.current = stream;

      // Optional level meter — recording works fine without it.
      try {
        const AudioContextCtor = window.AudioContext
          || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextCtor) {
          const audioContext = new AudioContextCtor();
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          audioContext.createMediaStreamSource(stream).connect(analyser);
          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
          levelBufferRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
        }
      } catch {
        analyserRef.current = null;
      }

      const mimeType = getSupportedMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setRecState('stopped');
        cleanup();
      };

      recorder.onerror = () => {
        setError('Recording failed');
        setRecState('error');
        cleanup();
      };

      recorder.start(250); // Collect chunks every 250ms
      startTimeRef.current = Date.now();
      setRecState('recording');

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } catch {
      // A stale flight's rejection must not clobber the current flight's state.
      if (flight === flightSeqRef.current) {
        setError(safeMicrophoneFailure());
        setRecState('error');
        cleanup();
      }
    }
  }, [cleanup, setRecState]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      /**
       * Release the TRACKS synchronously, handlers still attached.
       * MediaRecorder.stop() only QUEUES the final dataavailable/stop work —
       * on pagehide/screen-lock the page can freeze before that queue runs,
       * leaving the microphone live after the event that promised silence. The
       * recorder finalises from already-captured data, so the blob still lands
       * when the queued onstop runs; cleanup()'s later track-stop is a no-op.
       */
      streamRef.current?.getTracks().forEach(t => t.stop());
    } else {
      // Nothing recording — we may be inside the permission window. Latch the
      // cancellation AND invalidate the pending flight so a late grant is
      // stopped on arrival even if a newer start has cleared the latch since.
      cancelRequestedRef.current = true;
      flightSeqRef.current += 1;
      // The request is dead from the caller's perspective RIGHT NOW. Only from
      // 'requesting': a stray stop after a finished capture must not wipe
      // 'stopped' + blob.
      if (stateRef.current === 'requesting') setRecState('idle');
    }
  }, [setRecState]);

  const getAudioLevel = useCallback((): number => {
    const analyser = analyserRef.current;
    const buffer = levelBufferRef.current;
    if (!analyser || !buffer) return 0;
    analyser.getByteTimeDomainData(buffer);
    let sumOfSquares = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const centered = (buffer[i] - 128) / 128;
      sumOfSquares += centered * centered;
    }
    // RMS of speech peaks well under 1.0 — scale up, clamp for UI use.
    return Math.min(1, Math.sqrt(sumOfSquares / buffer.length) * 3);
  }, []);

  const reset = useCallback(() => {
    cancelRequestedRef.current = true;   // a pending grant must not outlive a reset
    flightSeqRef.current += 1;           // …even one a newer start re-cleared the latch for
    cleanup();
    setRecState('idle');
    setAudioBlob(null);
    setDuration(0);
    setError(null);
  }, [cleanup, setRecState]);

  /**
   * The primitive is fail-closed BY ITSELF. This hook shipped for months with
   * no unmount cleanup at all — the microphone outlived every consumer that
   * forgot to call stop(), and VoiceRecordingOverlay consumes it directly.
   * Unmount latches cancellation, invalidates any pending permission flight,
   * and releases everything.
   */
  useEffect(() => () => {
    cancelRequestedRef.current = true;
    flightSeqRef.current += 1;
    cleanup();
  }, [cleanup]);

  return { state, audioBlob, duration, error, start, stop, reset, getAudioLevel };
}
