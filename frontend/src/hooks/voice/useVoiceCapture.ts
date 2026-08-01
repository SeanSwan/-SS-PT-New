/**
 * HOOK: useVoiceCapture (S6 — JARVIS blueprint §6.2, failure-mode F1)
 * PURPOSE: THE one microphone for Swan Coach voice. MediaRecorder-primary
 * (SpeechRecognition is demoted), seeded from the proven useVoiceRecorder
 * path. Laws:
 * - Permission is requested ONLY inside start() — a user gesture. Never on
 *   mount, never ambient. Hold-to-talk (press=start, release=stop) and
 *   tap-to-toggle both ride the same two functions.
 * - Noise posture: echoCancellation + noiseSuppression + autoGainControl.
 * - 120s auto-stop; blob hard cap 8MB (over-cap → error, blob dropped).
 * - Screen lock / backgrounding (visibilitychange·pagehide) stops the
 *   recorder and RETAINS the blob with `stoppedByLock` so the UI can ask
 *   "Recording stopped when the screen locked — send it?".
 * - Denied permission → state 'denied' with a human reason; callers must
 *   focus typed input ("Type instead" is one tap away in every state).
 * DARK until S10 cutover (VOICE_MODE_V2). Device matrix (iOS Safari 17+
 * standalone PWA, iOS tab, Android Chrome) is a flag-flip gate recorded in
 * docs/breadcrumbs/S6.md — the flag stays OFF until Sean's device pass.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceCaptureState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'denied' | 'error';

export interface UseVoiceCaptureReturn {
  state: VoiceCaptureState;
  audioBlob: Blob | null;
  mimeType: string;
  durationSeconds: number;
  /** True when the last stop was forced by screen lock / backgrounding. */
  stoppedByLock: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export const VOICE_CAPTURE_MAX_SECONDS = 120;
export const VOICE_CAPTURE_MAX_BYTES = 8 * 1024 * 1024;

const IOS_RE = /iPad|iPhone|iPod/;

/** iOS Safari only reliably records audio/mp4; everyone else prefers opus. */
export const negotiateVoiceMime = (): string => {
  if (typeof MediaRecorder === 'undefined') return '';
  if (IOS_RE.test(navigator.userAgent)) {
    return MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
  }
  for (const mime of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
};

export const isVoiceCaptureSupported = (): boolean =>
  typeof window !== 'undefined'
  && typeof window.MediaRecorder !== 'undefined'
  && typeof navigator.mediaDevices?.getUserMedia === 'function';

const DENIED_REASON = 'Microphone access is off for this site. You can type instead, or enable the mic in your browser settings.';

export function useVoiceCapture(): UseVoiceCaptureReturn {
  const [state, setState] = useState<VoiceCaptureState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [stoppedByLock, setStoppedByLock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const lockStopRef = useRef(false);

  const cleanup = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (maxStopRef.current) { clearTimeout(maxStopRef.current); maxStopRef.current = null; }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  // Lock-safety (F1 de-risk 3): stop + retain the blob, never lose the utterance.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && recorderRef.current?.state === 'recording') {
        lockStopRef.current = true;
        recorderRef.current.stop();
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onHidden);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onHidden);
      recorderRef.current?.state === 'recording' && recorderRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current?.state === 'recording') return; // already live
    try {
      setError(null);
      setAudioBlob(null);
      setDurationSeconds(0);
      setStoppedByLock(false);
      lockStopRef.current = false;
      setState('requesting');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const mime = negotiateVoiceMime();
      setMimeType(mime || 'audio/webm');
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = event => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        if (blob.size > VOICE_CAPTURE_MAX_BYTES) {
          setAudioBlob(null);
          setError('That recording is too large to send — try a shorter take.');
          setState('error');
        } else {
          setAudioBlob(blob);
          setStoppedByLock(lockStopRef.current);
          setState('stopped');
        }
        cleanup();
      };
      recorder.onerror = () => {
        setError('Recording failed — you can type instead.');
        setState('error');
        cleanup();
      };

      recorder.start(250);
      startedAtRef.current = Date.now();
      setState('recording');
      tickRef.current = setInterval(() => {
        setDurationSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 500);
      maxStopRef.current = setTimeout(stop, VOICE_CAPTURE_MAX_SECONDS * 1000);
    } catch (err: unknown) {
      const denied = err instanceof DOMException
        && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      setError(denied ? DENIED_REASON : 'Could not start the microphone — you can type instead.');
      setState(denied ? 'denied' : 'error');
      cleanup();
    }
  }, [cleanup, stop]);

  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setAudioBlob(null);
    setDurationSeconds(0);
    setStoppedByLock(false);
    setError(null);
  }, [cleanup]);

  return { state, audioBlob, mimeType, durationSeconds, stoppedByLock, error, start, stop, reset };
}
