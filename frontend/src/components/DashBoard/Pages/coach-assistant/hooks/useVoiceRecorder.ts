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

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = useCallback(async () => {
    try {
      cancelRequestedRef.current = false;   // only a new start clears the latch
      setError(null);
      setAudioBlob(null);
      setDuration(0);
      setState('requesting');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelRequestedRef.current) {
        // Stop was requested while the permission prompt was open. The grant
        // arrived anyway — release the tracks immediately, build nothing.
        stream.getTracks().forEach(t => t.stop());
        setState('idle');
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
        setState('stopped');
        cleanup();
      };

      recorder.onerror = () => {
        setError('Recording failed');
        setState('error');
        cleanup();
      };

      recorder.start(250); // Collect chunks every 250ms
      startTimeRef.current = Date.now();
      setState('recording');

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } catch {
      setError(safeMicrophoneFailure());
      setState('error');
      cleanup();
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    } else {
      // Nothing recording — we may be inside the permission window. Latch the
      // cancellation so a late grant is stopped on arrival (see the ref above).
      cancelRequestedRef.current = true;
    }
  }, []);

  const reset = useCallback(() => {
    cancelRequestedRef.current = true;   // a pending grant must not outlive a reset
    cleanup();
    setState('idle');
    setAudioBlob(null);
    setDuration(0);
    setError(null);
  }, [cleanup]);

  return { state, audioBlob, duration, error, start, stop, reset };
}
