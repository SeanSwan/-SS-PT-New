/**
 * ============================================================================
 * FILE: useFreestyleSpeech.ts
 * PURPOSE: On-device continuous speech capture for freestyle dictation.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-16
 * ============================================================================
 *
 * TRANSPORT AND ITS UNRESOLVED PRIVACY PROBLEM — READ BEFORE EXTENDING
 * --------------------------------------------------------------------
 * The other capture path (useCoachCapture → useGeminiTranscription) uploads the
 * recorded audio to a server-side model. For freestyle that is unacceptable: Sean
 * talks about real clients BY NAME, so the audio itself is PII-dense, and every
 * text-tokenisation scheme in this repo protects the TRANSCRIPT and does nothing
 * for the audio.
 *
 * This hook uses the Web Speech API instead. That removes SwanStudios from the
 * transport — we create, upload and persist no audio.
 *
 * IT DOES NOT SATISFY "ZERO PII TO MODELS", AND MUST NOT BE DESCRIBED AS IF IT
 * DOES. Chrome's implementation streams audio to a Google cloud recogniser. We
 * invoke that API, so PII-dense audio still reaches a third-party model with us as
 * the invoking party. Whose servers perform the transmission is not the constraint;
 * the constraint is whether client audio reaches a model at all.
 *
 * What genuinely holds on-device is Safari/WebKit with on-device dictation. What
 * this hook currently lacks — and what any real fix requires — is capability
 * detection, a gate that refuses cloud-backed recognisers, and a typed fallback.
 * Until that exists this path is a TRANSPORT IMPROVEMENT, not a privacy guarantee.
 * The owner decision (gate, accept-and-document, or on-device model) is open.
 *
 * THE RESTART PROBLEM
 * -------------------
 * `continuous = true` is not honoured indefinitely. Browsers end a session after a
 * silence window — iOS Safari most aggressively — firing `onend` with no error. A
 * ten-minute dictation would therefore die silently after the first pause. This
 * hook restarts recognition transparently whenever it ends while the caller still
 * wants to listen, and reports `restarts` so the surface can prove it is alive.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// SECTION: Browser API shims
// ─────────────────────────────────────────────────────────────

interface SpeechResultAlternative { transcript: string }
interface SpeechResult {
  isFinal: boolean;
  0: SpeechResultAlternative;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}
interface SpeechRecognitionErrorLike { error?: string }
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

const getRecognitionCtor = (): SpeechRecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const FREESTYLE_SPEECH_UNSUPPORTED_COPY =
  'This browser cannot listen continuously. Type your notes instead, or open Swan Coach in Safari.';

export const FREESTYLE_SPEECH_DENIED_COPY =
  'Swan Coach needs microphone access to hear you. Enable it in your browser settings, then try again.';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface UseFreestyleSpeechOptions {
  /** Called for each FINAL phrase. Interim text is never sent here. */
  onPhrase: (text: string) => void;
  lang?: string;
}

export interface UseFreestyleSpeechReturn {
  supported: boolean;
  listening: boolean;
  /** Live partial phrase — display only, never stored. */
  interim: string;
  error: string | null;
  /** How many times recognition was transparently restarted. */
  restarts: number;
  start: () => void;
  stop: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useFreestyleSpeech(
  options: UseFreestyleSpeechOptions,
): UseFreestyleSpeechReturn {
  const { onPhrase, lang = 'en-US' } = options;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [restarts, setRestarts] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  /** What the CALLER wants. Distinct from whether the engine happens to be up. */
  const wantListeningRef = useRef(false);
  const onPhraseRef = useRef(onPhrase);
  onPhraseRef.current = onPhrase;

  const supported = getRecognitionCtor() !== null;

  const teardown = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try { rec.abort(); } catch { /* already dead */ }
    recognitionRef.current = null;
  }, []);

  const startEngine = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) { setError(FREESTYLE_SPEECH_UNSUPPORTED_COPY); return; }

    teardown();
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      // Start at resultIndex: earlier results were already emitted, and
      // re-reading them would duplicate every phrase on each event.
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        const chunk = result[0]?.transcript ?? '';
        if (result.isFinal) finalText += chunk;
        else interimText += chunk;
      }
      if (finalText.trim()) onPhraseRef.current(finalText.trim());
      setInterim(interimText);
    };

    rec.onerror = (event) => {
      const kind = event?.error ?? '';
      if (kind === 'not-allowed' || kind === 'service-not-allowed') {
        wantListeningRef.current = false;      // do not fight a denied permission
        setError(FREESTYLE_SPEECH_DENIED_COPY);
        setListening(false);
        return;
      }
      // 'no-speech' and 'aborted' are routine during a long dictation: the user
      // paused, or the engine cycled. Neither is an error worth showing.
    };

    rec.onend = () => {
      setInterim('');
      if (!wantListeningRef.current) { setListening(false); return; }
      /**
       * The engine ended but the user is still talking to us. Restart it.
       * Without this a ten-minute session dies at the first long pause, silently,
       * with the UI still claiming to listen.
       */
      setRestarts(n => n + 1);
      try { rec.start(); } catch { startEngine(); }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
      setError(null);
    } catch {
      // start() throws if an engine is already running; treat as already-live.
      setListening(true);
    }
  }, [lang, teardown]);

  const start = useCallback(() => {
    if (!supported) { setError(FREESTYLE_SPEECH_UNSUPPORTED_COPY); return; }
    if (wantListeningRef.current) return;
    wantListeningRef.current = true;
    setRestarts(0);
    startEngine();
  }, [supported, startEngine]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    setListening(false);
    setInterim('');
    teardown();
  }, [teardown]);

  /** Release the microphone on unmount — the engine will not stop itself. */
  useEffect(() => () => {
    wantListeningRef.current = false;
    teardown();
  }, [teardown]);

  return { supported, listening, interim, error, restarts, start, stop };
}
