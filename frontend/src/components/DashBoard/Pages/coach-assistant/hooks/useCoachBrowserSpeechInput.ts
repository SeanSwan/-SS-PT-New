/**
 * useCoachBrowserSpeechInput.ts
 * =============================
 * Browser Web Speech fallback for the Swan Coach composer.
 *
 * TWO MODES
 * ---------
 * `autoSend: true` (default, legacy) — one spoken command is one submit. The
 * recogniser arms a two-second cancel window after the speaker goes quiet and
 * then dispatches the command itself, clearing the field.
 *
 * `autoSend: false` (inline dictation) — nothing is ever dispatched and no
 * cancel pill is shown. Recognised words land in the field as they arrive and
 * the speaker decides when to stop and when to submit. This is the shape of
 * dictation in Codex / Claude Code, and it is what the Coach Command Center
 * dock uses: press the mic, talk, press the mic again, then Send.
 *
 * The legacy default is untouched because two other surfaces were built
 * against the one-command-one-submit contract.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { buildChatMessageTooLongError } from '../../../../../hooks/aiMessageLimits';

const CANCEL_WINDOW_MS = 2000;
const MIN_AUTO_SEND_LENGTH = 4;
/** How long the speaker must be quiet before an auto-send command is armed. */
const AUTO_SEND_QUIET_MS = 750;

export const SPEECH_MIC_PERMISSION_COPY =
  'Swan Coach needs microphone access to hear you. Enable it in your browser settings, then press the mic to try again.';
export const SPEECH_ENGINE_FAILED_COPY =
  'Voice input stopped unexpectedly. Press the mic to try again.';

/**
 * Recogniser failure codes the speaker can act on, mapped to copy.
 *
 * `no-speech` and `aborted` are deliberately ABSENT, and the lookup returns
 * null for them below. `aborted` is what our own `stop()` produces, and
 * `no-speech` is a quiet room — the recogniser keeps listening through both.
 * Treating either as a failure would put a red banner over a working
 * microphone, which is the same class of lie as a meter that animates on a
 * timer.
 */
const RECOGNITION_ERROR_COPY: Record<string, string> = {
  'audio-capture': 'No microphone was found. Check that one is connected and not in use by another app.',
  network: 'Voice input needs a network connection in this browser.',
  'not-allowed': SPEECH_MIC_PERMISSION_COPY,
  'service-not-allowed': SPEECH_MIC_PERMISSION_COPY,
};

const IGNORED_RECOGNITION_ERRORS = new Set(['aborted', 'no-speech']);

/** Human copy for a recogniser failure code, or null when it is not a failure. */
function speechErrorMessage(code: string | undefined): string | null {
  if (!code || IGNORED_RECOGNITION_ERRORS.has(code)) return null;
  return RECOGNITION_ERROR_COPY[code] ?? SPEECH_ENGINE_FAILED_COPY;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface BrowserSpeechRecognitionEvent {
  results: ArrayLike<BrowserSpeechRecognitionResult>;
}

interface BrowserSpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognitionInstance;

const BrowserSpeechRecognition: SpeechRecognitionCtor | null = typeof window !== 'undefined'
  ? ((window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    }).SpeechRecognition
    || (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition
    || null)
  : null;

interface UseCoachBrowserSpeechInputParams {
  maxChars: number;
  onSend: (text: string) => void;
  setText: Dispatch<SetStateAction<string>>;
  setInputError: Dispatch<SetStateAction<string | null>>;
  /**
   * When false the hook only streams words into the field. Defaults to true so
   * existing consumers keep the behaviour they were built against.
   */
  autoSend?: boolean;
}

/** Space-join a spoken tail onto whatever is already in the field. */
function appendSpoken(current: string, addition: string): string {
  const tail = addition.trim();
  if (!tail) return current;
  return current && !/\s$/.test(current) ? `${current} ${tail}` : `${current}${tail}`;
}

export function useCoachBrowserSpeechInput({
  maxChars,
  onSend,
  setText,
  setInputError,
  autoSend = true,
}: UseCoachBrowserSpeechInputParams) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [cancelPillVisible, setCancelPillVisible] = useState(false);
  /**
   * A recogniser failure the speaker has to know about. Without this the
   * `onerror` handler swallowed the code, and a denied microphone left the
   * inline dock's status line promising "Listening — talk, then press the mic
   * to stop" over an engine that had already died.
   */
  const [error, setError] = useState<string | null>(null);
  /**
   * Whether anything at all was recognised in this session. The inline dock
   * uses it to avoid reporting "Voice captured" over an untouched composer.
   */
  const [heardSpeech, setHeardSpeech] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognitionInstance | null>(null);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSendTextRef = useRef('');
  const accumulatedRef = useRef('');
  const interimRef = useRef('');

  /**
   * Whether the unfinalised tail should be rescued when the recogniser ends.
   *
   * `stop()` normally finalises the pending interim, but that is a browser
   * courtesy rather than a guarantee. Anything still interim at `onend` was
   * said out loud and would otherwise vanish without a trace — the speaker has
   * no way to know a word was dropped. Set false only for an explicit discard
   * (submitting while the mic is still open), where the field's contents are
   * already being sent and a late tail would land in the next message.
   */
  const flushOnEndRef = useRef(true);

  const handleCancelSend = useCallback(() => {
    if (cancelSendTimerRef.current) clearTimeout(cancelSendTimerRef.current);
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    setCancelPillVisible(false);
  }, []);

  const clearInterim = useCallback(() => {
    interimRef.current = '';
    setInterim('');
  }, []);

  const stopListening = useCallback(() => {
    flushOnEndRef.current = true;
    recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  /** Stop without rescuing the pending tail — see `flushOnEndRef`. */
  const cancelListening = useCallback(() => {
    flushOnEndRef.current = false;
    interimRef.current = '';
    recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  const flushPendingInterim = useCallback(() => {
    const pending = interimRef.current.trim();
    interimRef.current = '';
    if (!pending) return;
    accumulatedRef.current = `${accumulatedRef.current} ${pending}`.trim();
    setText((prev) => appendSpoken(prev, pending));
  }, [setText]);
  const flushPendingInterimRef = useRef(flushPendingInterim);
  flushPendingInterimRef.current = flushPendingInterim;

  const toggleListening = useCallback(() => {
    if (!BrowserSpeechRecognition) return;

    if (listening) {
      stopListening();
      return;
    }

    try {
      const recognition = new BrowserSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      accumulatedRef.current = '';
      interimRef.current = '';
      flushOnEndRef.current = true;
      setError(null);
      setHeardSpeech(false);

      recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
        let finalText = '';
        let interimText = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0].transcript;
          else interimText += result[0].transcript;
        }
        if ((finalText + interimText).trim()) setHeardSpeech(true);
        if (finalText) {
          accumulatedRef.current += finalText;
          /**
           * `appendSpoken`, not `prev + finalText`. In auto-send mode the field
           * was cleared on every dispatch, so the missing separator never
           * showed; inline dictation keeps the field, so dictating after typing
           * produced "bench press225 for 5".
           */
          setText(prev => appendSpoken(prev, finalText));
        }
        interimRef.current = interimText;
        setInterim(interimText);

        // Inline dictation has no quiet-time dispatch and no cancel window:
        // the speaker stops the microphone, not a timer.
        if (!autoSend) return;

        if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
        const accumulated = accumulatedRef.current.trim();
        if (!accumulated && !(finalText + interimText).trim()) return;

        autoSendTimerRef.current = setTimeout(() => {
          const msg = accumulatedRef.current.trim();
          if (msg.length < MIN_AUTO_SEND_LENGTH) {
            recognitionRef.current?.stop();
            setListening(false);
            setInterim('');
            return;
          }
          pendingSendTextRef.current = msg;
          setCancelPillVisible(true);
          recognitionRef.current?.stop();
          setListening(false);
          setInterim('');
          cancelSendTimerRef.current = setTimeout(() => {
            setCancelPillVisible(false);
            const finalMsg = pendingSendTextRef.current;
            if (!finalMsg) return;
            if (finalMsg.length > maxChars) {
              setText(finalMsg);
              setInputError(buildChatMessageTooLongError(finalMsg.length));
            } else {
              onSend(finalMsg);
              setText('');
              setInputError(null);
            }
            accumulatedRef.current = '';
            pendingSendTextRef.current = '';
          }, CANCEL_WINDOW_MS);
        }, AUTO_SEND_QUIET_MS);
      };

      recognition.onerror = (event?: { error?: string }) => {
        setListening(false);
        setInterim('');
        // Reported, not swallowed. A null return means "not a failure" (our own
        // stop, or a quiet room) — see RECOGNITION_ERROR_COPY.
        setError(speechErrorMessage(event?.error));
      };
      recognition.onend = () => {
        setListening(false);
        setInterim('');
        // Last moment a result can arrive. Only inline mode rescues the tail:
        // in auto-send mode a late append would land after the dispatch.
        if (!autoSend && flushOnEndRef.current) flushPendingInterimRef.current();
      };
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      // A constructor or start() throw is a failure like any other, and the
      // caller cannot see it otherwise — the mic button would just do nothing.
      setListening(false);
      setError(SPEECH_ENGINE_FAILED_COPY);
    }
  }, [listening, maxChars, onSend, setInputError, setText, autoSend, stopListening]);

  /**
   * Hot-mic hygiene. The recogniser used to outlive a tab switch: start
   * dictation, change tab, and the microphone stayed open with the page
   * listening to a room nobody was speaking to. `useCoachCapture` (the RECORD
   * pipeline) has had this policy since it was written; the LIVE pipeline did
   * not. Nothing spoken on a hidden page can be seen by the speaker, so
   * stopping there loses nothing.
   */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState !== 'hidden') return;
      if (!recognitionRef.current) return;
      recognitionRef.current.stop();
      setListening(false);
      setInterim('');
    };

    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    if (cancelSendTimerRef.current) clearTimeout(cancelSendTimerRef.current);
  }, []);

  return {
    listening,
    interim,
    cancelPillVisible,
    cancelListening,
    handleCancelSend,
    clearInterim,
    error,
    heardSpeech,
    stopListening,
    toggleListening,
    speechSupported: !!BrowserSpeechRecognition,
  };
}

export { CANCEL_WINDOW_MS };
