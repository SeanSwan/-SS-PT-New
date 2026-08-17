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

import { useState, useRef, useCallback } from 'react';
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

  /**
   * Cancellation latch for the permission window. `stop()` during 'requesting'
   * has nothing to stop — no recorder exists yet — and the in-flight
   * getUserMedia cannot be aborted. Without this latch, a user could tap stop
   * (or navigate away, unmounting every guard upstream), THEN click "Allow" on
   * the still-open permission bubble, and the microphone went live with no
   * owner and no release path until tab close (GLM, dry-loop round 4). The
   * latch is checked the moment the promise resolves; a late grant is stopped
   * before any recorder is built.
   */
  const cancelRequestedRef = useRef(false);

  /**
   * Per-flight generation. The boolean latch alone guards a world that can
   * contain TWO in-flight getUserMedia requests: start → stop (latch set) →
   * start again (latch CLEARED, second request issued) → grant #1 resolves
   * against the cleared latch and is accepted — then grant #2 overwrites every
   * ref and stream #1's tracks are never stopped by anyone (GLM, round 5).
   * Each start mints a generation; only the CURRENT generation's grant may
   * build a recorder. stop()/reset() invalidate any pending generation.
   */
  const flightSeqRef = useRef(0);

  /**
   * Mirrors `state` for callbacks with empty deps — their closures go stale.
   * Written SYNCHRONOUSLY by every transition via setRecState below: a
   * render-time mirror alone lags one commit, so a stop() issued in the same
   * tick as start() read a stale 'idle', skipped the requesting→idle
   * settlement, and the hook stuck at visible 'requesting' forever after the
   * cancelled flight was forbidden to repair state (Codex, round 6).
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
    /**
     * Detach handlers BEFORE dropping the reference. MediaRecorder queues a
     * final `dataavailable` (then `stop`) after stop() — with the closures
     * still attached, that late chunk arrived AFTER a reset, rebuilt the blob,
     * and flipped state to 'stopped': audio the user had just discarded
     * resurrected itself (Codex, dry-loop round 5).
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
        // build nothing, and touch no state that now belongs to the current
        // flight.
        stream.getTracks().forEach(t => t.stop());
        if (flight === flightSeqRef.current) setRecState('idle');
        return;
      }
      streamRef.current = stream;

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
  }, [cleanup]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    } else {
      // Nothing recording — we may be inside the permission window. Latch the
      // cancellation AND invalidate the pending flight so a late grant is
      // stopped on arrival even if a newer start has cleared the latch since.
      cancelRequestedRef.current = true;
      flightSeqRef.current += 1;
      // The request is dead from the caller's perspective RIGHT NOW — settle
      // to idle here, because the invalidated flight is no longer allowed to
      // touch state when its grant lands. Only from 'requesting': a stray
      // second stop after a finished capture must not wipe 'stopped' + blob.
      if (stateRef.current === 'requesting') setRecState('idle');
    }
  }, []);

  const reset = useCallback(() => {
    cancelRequestedRef.current = true;   // a pending grant must not outlive a reset
    flightSeqRef.current += 1;           // …even one a newer start re-cleared the latch for
    cleanup();
    setRecState('idle');
    setAudioBlob(null);
    setDuration(0);
    setError(null);
  }, [cleanup]);

  return { state, audioBlob, duration, error, start, stop, reset };
}
