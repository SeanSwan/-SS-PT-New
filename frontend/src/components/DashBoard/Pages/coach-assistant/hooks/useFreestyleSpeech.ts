/**
 * ============================================================================
 * FILE: useFreestyleSpeech.ts
 * PURPOSE: Web Speech transport for freestyle dictation. NOT "on-device" —
 *          on Chrome this still reaches a cloud recogniser; see below.
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

/**
 * No typing path exists on this surface yet, so the copy must not promise one —
 * an earlier version said "Type your notes instead" and pointed at nothing.
 */
export const FREESTYLE_SPEECH_UNSUPPORTED_COPY =
  'This browser cannot listen continuously. Open Swan Coach in Safari to dictate.';

export const FREESTYLE_SPEECH_DENIED_COPY =
  'Swan Coach needs microphone access to hear you. Enable it in your browser settings, then try again.';

/**
 * No control names in these strings. The surface decides which recovery
 * control exists per state (with retained words, Start is deliberately absent)
 * and appends the instruction itself — a string that names a hidden button is
 * an instruction to do the impossible (GLM, round 4).
 */
export const FREESTYLE_SPEECH_START_FAILED_COPY =
  'Listening could not start.';

export const FREESTYLE_SPEECH_MIC_LOST_COPY =
  'The microphone was disconnected. Check your mic or headset.';

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
  /**
   * Promotes the pending interim to a final phrase (through `onPhrase`) and
   * clears it. Callers MUST flush before a session transition that stops
   * accepting fragments — otherwise the words spoken mid-sentence when the user
   * taps Done/Pause are silently lost. `stop()` flushes on its own; this exists
   * so the surface can flush while the session is still `listening`.
   */
  flush: () => void;
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

  /**
   * Mirrors `interim` so flush paths can read it synchronously. The state value
   * is a render snapshot; `stop()` and `onend` run outside render and must see
   * the words that are pending RIGHT NOW, or they flush stale text.
   */
  const interimRef = useRef('');

  /** Restart pacing (see `onend`): timestamps + a pending backoff timer. */
  const lastEngineStartRef = useRef(0);
  const quickRestartsRef = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supported = getRecognitionCtor() !== null;

  const setInterimBoth = useCallback((text: string) => {
    interimRef.current = text;
    setInterim(text);
  }, []);

  /**
   * The recogniser finalises trailing speech late or never (Safari worst).
   * Promoting the pending interim at every deliberate boundary is what keeps
   * "the words I said as I tapped the button" from silently vanishing.
   */
  const flush = useCallback(() => {
    const pending = interimRef.current.trim();
    if (pending) onPhraseRef.current(pending);
    setInterimBoth('');
  }, [setInterimBoth]);

  const teardown = useCallback(() => {
    if (restartTimerRef.current !== null) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
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
      const finalChunks: string[] = [];
      let interimText = '';
      // Start at resultIndex: earlier results were already emitted, and
      // re-reading them would duplicate every phrase on each event.
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        const chunk = (result[0]?.transcript ?? '').trim();
        if (!chunk) continue;
        if (result.isFinal) finalChunks.push(chunk);
        else interimText += (interimText ? ' ' : '') + chunk;
      }
      // Joined with a space: one event can carry several finals, and naive
      // concatenation welds the last word of one to the first of the next.
      if (finalChunks.length) onPhraseRef.current(finalChunks.join(' '));
      setInterimBoth(interimText);
      quickRestartsRef.current = 0;   // real results mean the engine is healthy
    };

    rec.onerror = (event) => {
      const kind = event?.error ?? '';
      /**
       * FATAL errors — no restart can fix them, so retrying is a lie machine:
       * - not-allowed / service-not-allowed: permission denied.
       * - audio-capture: NO INPUT DEVICE (unplugged mic, dead headset). This
       *   used to fall through to the restart loop — each restart succeeded at
       *   start() (permission intact) and died instantly, forever, while the
       *   UI said "Still listening" over a mic that would never return (GLM,
       *   round 2).
       * 'network' deliberately stays retryable — flaky gym wifi recovers;
       * 'no-speech'/'aborted' are routine engine cycling, not errors.
       *
       * Flush BEFORE clearing the want-flag: every other flush path is gated
       * on it, so a fatal error arriving mid-sentence used to destroy the
       * pending words along with the engine (Codex, round 2). The session is
       * still 'listening' at this instant — the fragment lands, and survives
       * into the failed session's buffer.
       */
      const isDenied = kind === 'not-allowed' || kind === 'service-not-allowed';
      if (isDenied || kind === 'audio-capture') {
        const pending = interimRef.current.trim();
        if (pending) onPhraseRef.current(pending);
        setInterimBoth('');
        wantListeningRef.current = false;
        setError(isDenied ? FREESTYLE_SPEECH_DENIED_COPY : FREESTYLE_SPEECH_MIC_LOST_COPY);
        setListening(false);
      }
    };

    rec.onend = () => {
      // Flush BEFORE clearing: Safari finalises trailing interims late or never,
      // so whatever is pending at engine-end is the best record of those words.
      const pending = interimRef.current.trim();
      if (pending && wantListeningRef.current) onPhraseRef.current(pending);
      setInterimBoth('');
      if (!wantListeningRef.current) { setListening(false); return; }
      /**
       * The engine ended but the user is still talking to us. Restart it — but
       * PACED. An engine that dies instantly (dead zone: Chrome's recogniser
       * needs network) would otherwise hot-loop start/abort forever. Quick
       * deaths back off exponentially, capped at 15s; a healthy result resets
       * the counter (see `onresult`).
       */
      setRestarts(n => n + 1);
      const sinceStart = Date.now() - lastEngineStartRef.current;
      if (sinceStart < 3000) {
        quickRestartsRef.current += 1;
        const delay = Math.min(15000, 500 * 2 ** Math.min(quickRestartsRef.current, 5));
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (wantListeningRef.current) startEngine();
        }, delay);
        return;
      }
      quickRestartsRef.current = 0;
      try { rec.start(); lastEngineStartRef.current = Date.now(); } catch { startEngine(); }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      lastEngineStartRef.current = Date.now();
      setListening(true);
      setError(null);
    } catch (err) {
      /**
       * Only InvalidStateError means "already running" — that one is genuinely
       * already-live. Anything else is a dead engine, and asserting `listening`
       * over it made the UI say "Talk as long as you need" to a mic that never
       * opened (iOS auto-start without a gesture lands exactly here).
       */
      if ((err as DOMException)?.name === 'InvalidStateError') {
        setListening(true);
      } else {
        wantListeningRef.current = false;
        setListening(false);
        setError(FREESTYLE_SPEECH_START_FAILED_COPY);
      }
    }
  }, [lang, teardown, setInterimBoth]);

  const start = useCallback(() => {
    if (!supported) { setError(FREESTYLE_SPEECH_UNSUPPORTED_COPY); return; }
    if (wantListeningRef.current) return;
    wantListeningRef.current = true;
    setRestarts(0);
    quickRestartsRef.current = 0;
    startEngine();
  }, [supported, startEngine]);

  const stop = useCallback(() => {
    // Flush before teardown: `abort()` discards pending results, so tapping Done
    // mid-sentence silently dropped the trailing words. Only flush when we were
    // actually listening — a stop of an idle engine has nothing pending.
    if (wantListeningRef.current) flush();
    wantListeningRef.current = false;
    setListening(false);
    setInterimBoth('');
    teardown();
  }, [teardown, flush, setInterimBoth]);

  /** Release the microphone on unmount — the engine will not stop itself. */
  useEffect(() => () => {
    wantListeningRef.current = false;
    teardown();
  }, [teardown]);

  return { supported, listening, interim, error, restarts, start, stop, flush };
}
