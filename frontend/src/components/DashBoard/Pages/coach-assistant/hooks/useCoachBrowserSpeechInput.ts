/**
 * useCoachBrowserSpeechInput.ts
 * =============================
 * Browser Web Speech input for the Swan Coach composer.
 *
 * Runtime support is stricter than constructor detection: browsers can expose
 * SpeechRecognition while the backing service is unavailable. Those failures
 * are surfaced so the recorder/transcription lane can take over.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { buildChatMessageTooLongError } from '../../../../../hooks/aiMessageLimits';

const CANCEL_WINDOW_MS = 2000;
const MIN_AUTO_SEND_LENGTH = 4;

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface BrowserSpeechRecognitionEvent {
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

function runtimeFailureFor(error?: string): CoachSpeechRuntimeFailure {
  if (error === 'not-allowed') {
    return {
      message: 'Microphone access was blocked. Allow microphone permission, then try again.',
      canTryRecorder: false,
    };
  }
  if (error === 'audio-capture') {
    return {
      message: 'No working microphone was detected. Check the input device and browser permission.',
      canTryRecorder: false,
    };
  }
  if (error === 'network') {
    return {
      message: 'The browser speech service lost its connection. Recorder fallback is available.',
      canTryRecorder: true,
    };
  }
  return {
    message: 'Browser dictation stopped unexpectedly. Recorder fallback is available.',
    canTryRecorder: true,
  };
}

interface UseCoachBrowserSpeechInputParams {
  maxChars: number;
  onSend: (text: string) => void;
  onRuntimeUnavailable?: (failure: CoachSpeechRuntimeFailure) => void;
  setText: Dispatch<SetStateAction<string>>;
  setInputError: Dispatch<SetStateAction<string | null>>;
}

export function useCoachBrowserSpeechInput({
  maxChars,
  onSend,
  onRuntimeUnavailable,
  setText,
  setInputError,
}: UseCoachBrowserSpeechInputParams) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [cancelPillVisible, setCancelPillVisible] = useState(false);
  const [runtimeUnavailable, setRuntimeUnavailable] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognitionInstance | null>(null);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSendTextRef = useRef('');
  const accumulatedRef = useRef('');

  const handleCancelSend = useCallback(() => {
    if (cancelSendTimerRef.current) clearTimeout(cancelSendTimerRef.current);
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    setCancelPillVisible(false);
  }, []);

  const clearInterim = useCallback(() => {
    setInterim('');
  }, []);

  const reportRuntimeFailure = useCallback((failure: CoachSpeechRuntimeFailure) => {
    setListening(false);
    setInterim('');
    setRuntimeUnavailable(true);
    setInputError(failure.message);
    onRuntimeUnavailable?.(failure);
  }, [onRuntimeUnavailable, setInputError]);

  const toggleListening = useCallback(() => {
    const SpeechRecognition = getBrowserSpeechRecognition();
    if (!SpeechRecognition || runtimeUnavailable) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setInterim('');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      accumulatedRef.current = '';
      setInputError(null);

      recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
        let finalText = '';
        let interimText = '';
        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0].transcript;
          else interimText += result[0].transcript;
        }
        if (finalText) {
          accumulatedRef.current += finalText;
          setText((previous) => previous + finalText);
        }
        setInterim(interimText);

        if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
        const accumulated = accumulatedRef.current.trim();
        if (!accumulated && !(finalText + interimText).trim()) return;

        autoSendTimerRef.current = setTimeout(() => {
          const message = accumulatedRef.current.trim();
          if (message.length < MIN_AUTO_SEND_LENGTH) {
            recognitionRef.current?.stop();
            setListening(false);
            setInterim('');
            return;
          }
          pendingSendTextRef.current = message;
          setCancelPillVisible(true);
          recognitionRef.current?.stop();
          setListening(false);
          setInterim('');
          cancelSendTimerRef.current = setTimeout(() => {
            setCancelPillVisible(false);
            const finalMessage = pendingSendTextRef.current;
            if (!finalMessage) return;
            if (finalMessage.length > maxChars) {
              setText(finalMessage);
              setInputError(buildChatMessageTooLongError(finalMessage.length));
            } else {
              onSend(finalMessage);
              setText('');
              setInputError(null);
            }
            accumulatedRef.current = '';
            pendingSendTextRef.current = '';
          }, CANCEL_WINDOW_MS);
        }, 750);
      };

      recognition.onerror = (event) => {
        setListening(false);
        setInterim('');
        if (event.error === 'aborted') return;
        if (event.error === 'no-speech') {
          setInputError('No speech was detected. Tap the microphone and try again.');
          return;
        }
        reportRuntimeFailure(runtimeFailureFor(event.error));
      };
      recognition.onend = () => {
        setListening(false);
        setInterim('');
      };
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      reportRuntimeFailure(runtimeFailureFor());
    }
  }, [
    listening,
    maxChars,
    onSend,
    reportRuntimeFailure,
    runtimeUnavailable,
    setInputError,
    setText,
  ]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    if (cancelSendTimerRef.current) clearTimeout(cancelSendTimerRef.current);
  }, []);

  return {
    listening,
    interim,
    cancelPillVisible,
    handleCancelSend,
    clearInterim,
    toggleListening,
    speechSupported: Boolean(getBrowserSpeechRecognition()) && !runtimeUnavailable,
  };
}

export { CANCEL_WINDOW_MS };
