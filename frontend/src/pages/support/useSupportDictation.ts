/**
 * FILE: useSupportDictation.ts
 * PURPOSE: Review-gated browser speech recognition for the Report Room.
 * PRIVACY: No audio or transcript is uploaded by SwanStudios from this hook.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type ResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  processLocally?: boolean;
  onresult: ((event: ResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  const ctor = speechWindow.SpeechRecognition;
  if (!ctor) return null;
  try {
    const probe = new ctor();
    const localOnly = 'processLocally' in probe;
    probe.abort();
    return localOnly ? ctor : null;
  } catch {
    return null;
  }
}

function disposeRecognition(recognition: Recognition): void {
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  recognition.abort();
}

function voiceError(error: string): string {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    return 'Microphone permission is blocked. Allow microphone access in your browser, then try again.';
  }
  if (error === 'audio-capture') return 'No working microphone was found. Check your device audio settings.';
  if (error === 'network') return 'On-device voice recognition stopped. Your typed report is still available.';
  if (error === 'language-not-supported') return 'On-device English dictation is not installed. Use your keyboard or device dictation.';
  if (error === 'no-speech') return 'No speech was heard. Try again when you are ready.';
  return 'Voice dictation stopped. You can retry or continue with the editable form.';
}

export function useSupportDictation(onFinal: (text: string) => void) {
  const [ctor] = useState<RecognitionCtor | null>(() => recognitionCtor());
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<Recognition | null>(null);
  const processedRef = useRef(0);
  const onFinalRef = useRef(onFinal);

  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  const cancel = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      disposeRecognition(recognition);
      recognitionRef.current = null;
    }
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    if (!ctor || listening) return;
    setError('');
    setInterim('');
    processedRef.current = 0;
    const recognition = new ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-US';
    recognition.processLocally = true;
    recognition.onresult = (event) => {
      let finalized = '';
      let pending = '';
      for (let index = processedRef.current; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalized += ` ${result[0].transcript}`;
          processedRef.current = index + 1;
        } else {
          pending += ` ${result[0].transcript}`;
          break;
        }
      }
      const finalText = finalized.trim();
      if (finalText) onFinalRef.current(finalText);
      setInterim(pending.trim());
    };
    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      setError(voiceError(event.error));
      setListening(false);
      setInterim('');
      disposeRecognition(recognition);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListening(false);
      setInterim('');
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      disposeRecognition(recognition);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setError('Voice dictation could not start. Retry or continue with the editable form.');
      setListening(false);
    }
  }, [ctor, listening]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      disposeRecognition(recognition);
      recognitionRef.current = null;
    }
  }, []);

  return { supported: Boolean(ctor), listening, interim, error, toggle, cancel };
}
