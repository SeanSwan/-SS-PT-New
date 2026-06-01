import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SpeechRecognitionResultLike = {
  0?: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  results?: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionInstance = {
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  abort?: () => void;
  start: () => void;
  stop?: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type UseCommunicationVoiceDraftOptions = {
  onStatus: (message: string) => void;
  onTranscript: (text: string) => void;
};

function getRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidateWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidateWindow.SpeechRecognition || candidateWindow.webkitSpeechRecognition || null;
}

function collectTranscript(event: SpeechRecognitionEventLike): string {
  return Array.from(event.results || [])
    .map((result) => result?.[0]?.transcript || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function useCommunicationVoiceDraft({
  onStatus,
  onTranscript,
}: UseCommunicationVoiceDraftOptions) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const lastTranscriptRef = useRef('');
  const [listening, setListening] = useState(false);
  const supported = useMemo(() => Boolean(getRecognitionCtor()), []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop?.();
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      onStatus('Voice message paused. Review the draft before sending.');
      return;
    }

    const Recognition = getRecognitionCtor();
    if (!Recognition) {
      onStatus('Voice messaging is not available in this browser. Type the message instead.');
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    lastTranscriptRef.current = '';
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = collectTranscript(event);
      if (!transcript) return;
      const previous = lastTranscriptRef.current;
      const nextText = previous && transcript.startsWith(previous)
        ? transcript.slice(previous.length).trim()
        : transcript;
      lastTranscriptRef.current = transcript;
      if (!nextText) return;
      onTranscript(nextText);
      onStatus('Voice message captured. Review it before sending.');
    };
    recognition.onerror = () => {
      setListening(false);
      onStatus('Voice message stopped. Type the message instead.');
    };
    recognition.onend = () => setListening(false);

    try {
      recognition.start();
      setListening(true);
      onStatus('Listening for a short client message.');
    } catch {
      recognition.abort?.();
      recognitionRef.current = null;
      setListening(false);
      onStatus('Voice message could not start. Type the message instead.');
    }
  }, [listening, onStatus, onTranscript, stop]);

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    lastTranscriptRef.current = '';
  }, []);

  return {
    label: !supported
      ? 'Voice messaging unavailable'
      : listening
        ? 'Stop voice message dictation'
        : 'Start voice message dictation',
    listening,
    supported,
    title: !supported
      ? 'Voice messaging is not available in this browser'
      : listening
        ? 'Stop voice message dictation'
        : 'Start voice message dictation',
    toggle,
  };
}
