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
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      setDuration(0);
      setState('requesting');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    }
  }, []);

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
    cleanup();
    setState('idle');
    setAudioBlob(null);
    setDuration(0);
    setError(null);
  }, [cleanup]);

  return { state, audioBlob, duration, error, start, stop, reset, getAudioLevel };
}
