/**
 * useCoachBrowserSpeechInput.ts
 * =============================
 * Browser Web Speech fallback for the Swan Coach composer.
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

interface BrowserSpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
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
}

export function useCoachBrowserSpeechInput({
  maxChars,
  onSend,
  setText,
  setInputError,
}: UseCoachBrowserSpeechInputParams) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [cancelPillVisible, setCancelPillVisible] = useState(false);
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

  const toggleListening = useCallback(() => {
    if (!BrowserSpeechRecognition) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setInterim('');
      return;
    }

    try {
      const recognition = new BrowserSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      accumulatedRef.current = '';

      recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
        let finalText = '';
        let interimText = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0].transcript;
          else interimText += result[0].transcript;
        }
        if (finalText) {
          accumulatedRef.current += finalText;
          setText(prev => prev + finalText);
        }
        setInterim(interimText);

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
        }, 750);
      };

      recognition.onerror = () => {
        setListening(false);
        setInterim('');
      };
      recognition.onend = () => {
        setListening(false);
        setInterim('');
      };
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening, maxChars, onSend, setInputError, setText]);

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
    speechSupported: !!BrowserSpeechRecognition,
  };
}

export { CANCEL_WINDOW_MS };
