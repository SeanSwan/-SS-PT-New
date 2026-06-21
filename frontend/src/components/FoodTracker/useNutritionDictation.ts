/**
 * useNutritionDictation
 * =====================
 * Minimal browser Web Speech hook for the Slice 1.6 "speak a meal" panel. Appends
 * ONLY newly-finalized transcript chunks to a caller-owned textarea (no auto-send,
 * no duplication). Gracefully reports `supported: false` where the API is absent
 * (the panel falls back to typing). The textarea is the source of truth; the mic
 * just fills it — so the flow stays fully testable without the speech API.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/** Resolve the Web Speech ctor from the CURRENT window at call time (not at module
 *  load) so a test can stub `window.SpeechRecognition` before the hook mounts. */
function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { SpeechRecognition?: RecognitionCtor }).SpeechRecognition
    || (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition
    || null
  );
}

export function useNutritionDictation(onAppendFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  // Resolve once per mount, reading the CURRENT window (tests stub it before render).
  const [ctor] = useState<RecognitionCtor | null>(() => getRecognitionCtor());
  const recRef = useRef<InstanceType<RecognitionCtor> | null>(null);
  const processedRef = useRef(0);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!ctor || listening) return;
    try {
      const RecCtor = ctor;
      const rec = new RecCtor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      processedRef.current = 0;
      rec.onresult = (event) => {
        let finalText = '';
        for (let i = processedRef.current; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) {
            finalText += r[0].transcript;
            processedRef.current = i + 1;
          } else {
            break; // interim — will finalize on a later event
          }
        }
        const trimmed = finalText.trim();
        if (trimmed) onAppendFinal(trimmed);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [ctor, listening, onAppendFinal]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => { recRef.current?.stop(); }, []);

  return { listening, toggle, supported: !!ctor };
}

export default useNutritionDictation;
