/**
 * useCoachBrowserSpeechInput.ts
 * Browser Web Speech dictation for the Swan Coach composer.
 *
 * Contract (2026-07-13 rework — "stops early / places partial text" fix):
 * dictation is USER-controlled. Tap the mic to start; speech streams into
 * the composer as finals land; tap the mic again to finish; the user
 * reviews and presses Send. There is NO silence-based auto-stop and NO
 * auto-send — the previous 750ms silence window fired on a mid-sentence
 * breath and submitted half a thought. Chrome also ends continuous
 * sessions on its own (~60s / service blips), so while armed the hook
 * transparently restarts recognition instead of dying silently.
 * Runtime support is stricter than constructor detection: browsers can
 * expose SpeechRecognition while the backing service is unavailable (Brave).
 * Those failures surface so the recorder/transcription lane can take over.
 * G06: session-scoped echo dedupe (appendUniqueFinal), reset on stop.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/** Rapid-fire engine restarts tolerated before failing over. Normal quiet
 * cycles (Chrome ends sessions every ~7s of silence) do NOT count - only
 * sessions that die within FAST_END_MS of starting look like a broken
 * service. */
const MAX_AUTO_RESTARTS = 6;
const FAST_END_MS = 3000;

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface BrowserSpeechRecognitionEvent {
  /** Index of the first CHANGED result; earlier entries were already seen. */
  resultIndex?: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
}

interface BrowserSpeechRecognitionErrorEvent {
  error?: string;
}

interface BrowserSpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognitionInstance;

export type CoachSpeechRuntimeFailure = {
  message: string;
  canTryRecorder: boolean;
};

function getBrowserSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

const RUNTIME_FAILURES: Record<string, CoachSpeechRuntimeFailure> = {
  'not-allowed': {
    message: 'Microphone access was blocked. Allow microphone permission, then try again.',
    canTryRecorder: false,
  },
  'audio-capture': {
    message: 'No working microphone was detected. Check the input device and browser permission.',
    canTryRecorder: false,
  },
  network: {
    message: 'The browser speech service lost its connection. Recorder fallback is available.',
    canTryRecorder: true,
  },
};

function runtimeFailureFor(error?: string): CoachSpeechRuntimeFailure {
  return RUNTIME_FAILURES[error ?? ''] ?? {
    message: 'Browser dictation stopped unexpectedly. Recorder fallback is available.',
    canTryRecorder: true,
  };
}

/** Join a final transcript chunk onto existing composer text with one space. */
function appendTranscript(previous: string, chunk: string): string {
  const trimmedChunk = chunk.trim();
  if (!trimmedChunk) return previous;
  if (!previous) return trimmedChunk;
  return /\s$/.test(previous) ? previous + trimmedChunk : `${previous} ${trimmedChunk}`;
}

/**
 * G06/T30 — append one final chunk unless it repeats one of the last two
 * finals of this session (speaker echo / restart re-emission): one final
 * draft segment per spoken segment. The two-final window catches restarts
 * that re-emit an adjacent [A, B] pair; non-adjacent repeats are legitimate
 * speech and pass. Returns the joined text plus the cursor to persist.
 */
export function appendUniqueFinal(
  previous: string,
  chunk: string,
  recentFinals: string[],
): { text: string; recentFinals: string[] } {
  const trimmed = chunk.trim();
  if (!trimmed || recentFinals.includes(trimmed)) {
    return { text: previous, recentFinals };
  }
  return {
    text: appendTranscript(previous, trimmed),
    recentFinals: [trimmed, ...recentFinals].slice(0, 2),
  };
}

interface UseCoachBrowserSpeechInputParams {
  onRuntimeUnavailable?: (failure: CoachSpeechRuntimeFailure) => void;
  setText: Dispatch<SetStateAction<string>>;
  setInputError: Dispatch<SetStateAction<string | null>>;
}

export function useCoachBrowserSpeechInput({
  onRuntimeUnavailable,
  setText,
  setInputError,
}: UseCoachBrowserSpeechInputParams) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [runtimeUnavailable, setRuntimeUnavailable] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognitionInstance | null>(null);
  // armed = the USER wants dictation running; engine-initiated ends restart.
  const armedRef = useRef(false);
  const restartsRef = useRef(0);
  const lastStartAtRef = useRef(0);
  // Fallback dedupe cursor for engines whose events omit resultIndex.
  const seenResultsRef = useRef(0);
  // G06/T30 — last two finals appended this session; an adjacent repeat is echo.
  const recentFinalsRef = useRef<string[]>([]);

  const clearInterim = useCallback(() => {
    setInterim('');
  }, []);

  const reportRuntimeFailure = useCallback((failure: CoachSpeechRuntimeFailure) => {
    armedRef.current = false;
    setListening(false);
    setInterim('');
    setRuntimeUnavailable(true);
    setInputError(failure.message);
    onRuntimeUnavailable?.(failure);
  }, [onRuntimeUnavailable, setInputError]);

  const startRecognition = useCallback((SpeechRecognition: SpeechRecognitionCtor) => {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    seenResultsRef.current = 0;

    recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      // Late event from an abandoned instance (user stop + quick restart).
      if (recognitionRef.current !== recognition) return;
      // A healthy result stream resets the restart budget.
      restartsRef.current = 0;
      const startIndex = typeof event.resultIndex === 'number'
        ? event.resultIndex
        : seenResultsRef.current;
      let finalText = '';
      let interimText = '';
      // Per-result dedupe: the cursor persists across events and engine
      // restarts for the whole armed session, so echoed/re-emitted finals
      // land once while distinct finals still append with spacing.
      let recentFinals = recentFinalsRef.current;
      for (let i = startIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          const merged = appendUniqueFinal(finalText, result[0].transcript, recentFinals);
          finalText = merged.text;
          recentFinals = merged.recentFinals;
        } else {
          interimText += result[0].transcript;
        }
      }
      // Advance the fallback cursor past every finalized result.
      let finalizedCount = 0;
      for (let i = 0; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) finalizedCount = i + 1;
      }
      seenResultsRef.current = Math.max(seenResultsRef.current, finalizedCount);

      if (finalText) {
        setText((previous) => appendTranscript(previous, finalText));
      }
      recentFinalsRef.current = recentFinals;
      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      if (event.error === 'aborted') return;
      // With keep-alive, a quiet stretch is normal — onend restarts us.
      if (event.error === 'no-speech') return;
      reportRuntimeFailure(runtimeFailureFor(event.error));
    };

    recognition.onend = () => {
      // Real engines fire onend ASYNCHRONOUSLY after stop(); a late end from
      // an abandoned instance must never restart over the live one.
      if (recognitionRef.current !== recognition) return;
      setInterim('');
      if (!armedRef.current) {
        setListening(false);
        return;
      }
      // Engine-initiated end while the user still wants dictation: restart
      // transparently. Quiet cycles (session lived >= FAST_END_MS) are normal
      // and unlimited; only rapid-fire deaths count against the budget.
      const fastEnd = Date.now() - lastStartAtRef.current < FAST_END_MS;
      if (fastEnd) {
        restartsRef.current += 1;
        if (restartsRef.current >= MAX_AUTO_RESTARTS) {
          reportRuntimeFailure(runtimeFailureFor());
          return;
        }
      }
      try {
        startRecognition(getBrowserSpeechRecognition() as SpeechRecognitionCtor);
      } catch {
        reportRuntimeFailure(runtimeFailureFor());
      }
    };

    recognitionRef.current = recognition;
    lastStartAtRef.current = Date.now();
    recognition.start();
  }, [reportRuntimeFailure, setText]);

  const stopListening = useCallback(() => {
    // A one-way stop for lifecycle transitions. Null first so a late onend
    // from the browser cannot restart recognition after eligibility ends.
    armedRef.current = false;
    const current = recognitionRef.current;
    recognitionRef.current = null;
    current?.stop();
    setListening(false);
    setInterim('');
    // G06/T32 — a stop ends the session: resumption starts a fresh dedupe
    // cursor so a resumed session is a new capture, never a continuation.
    recentFinalsRef.current = [];
  }, []);

  const toggleListening = useCallback(() => {
    const SpeechRecognition = getBrowserSpeechRecognition();
    if (!SpeechRecognition || runtimeUnavailable) return;

    if (listening) {
      // Intentional finish: text stays in the composer for review + Send.
      stopListening();
      return;
    }

    try {
      setInputError(null);
      armedRef.current = true;
      restartsRef.current = 0;
      recentFinalsRef.current = [];
      startRecognition(SpeechRecognition);
      setListening(true);
    } catch {
      reportRuntimeFailure(runtimeFailureFor());
    }
  }, [
    listening,
    reportRuntimeFailure,
    runtimeUnavailable,
    setInputError,
    startRecognition,
    stopListening,
  ]);

  useEffect(() => () => {
    armedRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  return {
    listening,
    interim,
    clearInterim,
    stopListening,
    toggleListening,
    speechSupported: Boolean(getBrowserSpeechRecognition()) && !runtimeUnavailable,
  };
}
