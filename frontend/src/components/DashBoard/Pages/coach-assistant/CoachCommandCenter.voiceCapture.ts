/**
 * FILE: CoachCommandCenter.voiceCapture.ts
 * PURPOSE: Unifies browser dictation, inline recorder transcription, and reviewed composer handoff.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { mergeVoiceCaptureOrigin, type CoachInputOrigin } from '../../../../hooks/coachInputOrigin';
import { useAuth } from '../../../../hooks/useAuth';
import {
  isPublicationAdmitted,
  isPublicationTokenLive,
  readPublicationScope,
  type PublicationBinding,
  type PublicationSnapshot,
} from '../../../../hooks/coachPublicationScope';
import { capturedVoiceText, resolveVoiceCommandText } from './CoachCommandCenter.voiceText';
import {
  useCoachBrowserSpeechInput,
  type CoachSpeechRuntimeFailure,
} from './hooks/useCoachBrowserSpeechInput';
import { useCoachInlineRecorder } from './hooks/useCoachInlineRecorder';
import { useCoachVoiceLifecycle } from './hooks/useCoachVoiceLifecycle';

type VoiceCaptureMode = 'browser' | 'recorder' | 'none';

/** 'listening' = the mic is live; 'transcribing' = the audio is away for text. */
export type VoiceCapturePhase = 'idle' | 'listening' | 'transcribing';

type VoiceCaptureParams = {
  commandTextRef: RefObject<HTMLTextAreaElement>;
  setCommandText: Dispatch<SetStateAction<string>>;
  setInputOrigin: Dispatch<SetStateAction<CoachInputOrigin>>;
  setSelectedStatus: Dispatch<SetStateAction<string>>;
  /** G06 — TTS output stop, composed here so the foreground lifecycle owns
   * barge-in and the background/logout stops for both lanes. */
  speechOutputStop: () => void;
  /**
   * Plan 55 C4 — live admission for the lane that stages dictated words into the
   * scoped composer. Absent keeps today's behaviour; present means a late
   * transcript is dropped, capture start is refused, and an admission change
   * fires the existing lifecycle stopAll.
   */
  binding?: PublicationBinding;
};

function buildVoiceStatus(
  voiceInputError: string | null,
  interim: string | null,
  listening: boolean,
): string | null {
  if (voiceInputError) return voiceInputError;
  if (interim) return `Listening: ${interim}`;
  return listening ? 'Listening - tap the mic when you finish' : null;
}

function isCoachVoiceRecorderSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return typeof window.MediaRecorder !== 'undefined'
    && typeof navigator.mediaDevices?.getUserMedia === 'function';
}

function runCoachVoiceCommand(
  speech: {
    listening: boolean;
    recorderSupported: boolean;
    speechSupported: boolean;
    toggleListening: () => void;
  },
  bargeIn: () => void,
  toggleRecorder: () => void,
  setSelectedStatus: (status: string) => void,
) {
  if (speech.speechSupported) {
    bargeIn();
    speech.toggleListening();
    setSelectedStatus(speech.listening
      ? 'Dictation finished - review the composer, then press Send'
      : 'Listening - tap the mic when you finish');
    return;
  }
  if (speech.recorderSupported) {
    // Inline, exactly like dictation: no overlay and no preview step. The
    // recorder lane owns its own listening/transcribing status, so this branch
    // deliberately sets none.
    bargeIn();
    toggleRecorder();
    return;
  }
  setSelectedStatus('Voice input is not available in this browser');
}

export function useCoachCommandVoiceCapture({
  commandTextRef,
  setCommandText,
  setInputOrigin,
  setSelectedStatus,
  speechOutputStop,
  binding,
}: VoiceCaptureParams) {
  const [voiceInputError, setVoiceInputError] = useState<string | null>(null);
  const recorderSupported = isCoachVoiceRecorderSupported();

  // Live admission read at call time: browser dictation finals and recorder
  // callbacks are captured from an older render, so a closure value would let a
  // retired scope stage words into the new one.
  const { user } = useAuth();
  const bindingRef = useRef<PublicationBinding | undefined>(binding);
  bindingRef.current = binding;
  const actorIdRef = useRef<number | string | null | undefined>(user?.id);
  actorIdRef.current = user?.id;
  const admittedNow = useCallback(
    () => isPublicationAdmitted(bindingRef.current, { actorId: actorIdRef.current }),
    [],
  );
  const selectionAdmitted = isPublicationAdmitted(binding, { actorId: user?.id });
  // Plan 55 C4 — a dictation final belongs to the admission the capture lane was
  // ARMED under. `admittedNow()` alone cannot see an A-B-A or a same-target
  // generation bump, so the lane also carries the exact token it was armed with
  // and refuses to stage once that token is no longer live.
  const admissionToken = readPublicationScope(binding);
  const admissionKey = binding
    ? (admissionToken
        ? `${admissionToken.actorId}:${admissionToken.generation}:${admissionToken.targetUserId ?? 'null'}:${admissionToken.enabled}`
        : 'none')
    : null;
  const armedTokenRef = useRef<PublicationSnapshot | null>(admissionToken);
  const admissionKeyRef = useRef<string | null>(admissionKey);
  const canStage = useCallback(
    () => admittedNow() && isPublicationTokenLive(bindingRef.current, armedTokenRef.current),
    [admittedNow],
  );

  const setVoiceCommandText = useCallback((next: SetStateAction<string>) => {
    if (!canStage()) return;
    setCommandText((current) => {
      const nextValue = resolveVoiceCommandText(next, current);
      setInputOrigin((origin) => mergeVoiceCaptureOrigin(origin, current, nextValue));
      return nextValue;
    });
  }, [canStage, setCommandText, setInputOrigin]);

  /** Stage dictated words. Returns false when the live admission refuses them. */
  const stageCapturedText = useCallback((text: string): boolean => {
    if (!canStage()) return false;
    setCommandText((current) => {
      const nextValue = capturedVoiceText(current, text);
      setInputOrigin((origin) => mergeVoiceCaptureOrigin(origin, current, text));
      return nextValue;
    });
    setVoiceInputError(null);
    return true;
  }, [canStage, setCommandText, setInputOrigin]);

  /** The recorder lane stages through the same admission gate, then hands back
   * the composer focus the overlay's edit path used to provide. */
  const stageInlineTranscript = useCallback((text: string): boolean => {
    const staged = stageCapturedText(text);
    if (staged) window.setTimeout(() => commandTextRef.current?.focus(), 0);
    return staged;
  }, [commandTextRef, stageCapturedText]);

  const inlineRecorder = useCoachInlineRecorder({
    onTranscribed: stageInlineTranscript,
    setSelectedStatus,
    setVoiceInputError,
  });
  // Held in refs so the speech hook and the lifecycle keep stable callback
  // identities across the recorder lane's re-renders.
  const toggleRecorderRef = useRef(inlineRecorder.toggle);
  toggleRecorderRef.current = inlineRecorder.toggle;
  const abortRecorderRef = useRef(inlineRecorder.abort);
  abortRecorderRef.current = inlineRecorder.abort;

  const handleBrowserSpeechUnavailable = useCallback((failure: CoachSpeechRuntimeFailure) => {
    if (recorderSupported && failure.canTryRecorder) {
      // Hand over to the same inline dock lane. This is a NOTICE, not an error:
      // routing it through voiceInputError would latch it as the
      // highest-priority status (buildVoiceStatus returns it first, and only a
      // later stage clears it) and so mask every subsequent status line.
      setSelectedStatus('Browser dictation failed - switching to inline recording');
      toggleRecorderRef.current();
      return;
    }
    setVoiceInputError(failure.message);
    setSelectedStatus(failure.message);
  }, [recorderSupported, setSelectedStatus]);

  const speech = useCoachBrowserSpeechInput({
    onRuntimeUnavailable: handleBrowserSpeechUnavailable,
    setInputError: setVoiceInputError,
    setText: setVoiceCommandText,
  });

  // G06/S7 — one foreground lifecycle over both capture lanes + TTS output.
  // The lifecycle never touches the action lane (cancel/abort of in-flight
  // writes stays owned by CoachCommand/useAIChat). Gates are deliberately
  // unconditional: every lane stop is a safe no-op when idle, so no
  // active-state signal is needed.
  const lifecycle = useCoachVoiceLifecycle({
    authenticated: Boolean(user),
    stopCapture: useCallback(() => {
      speech.stopListening();
      abortRecorderRef.current();
    }, [speech]),
    stopSpeechOutput: speechOutputStop,
  });
  const { bargeIn, stopAll } = lifecycle;

  // Plan 55 C4 — selection retirement reuses the EXISTING lifecycle stop rather
  // than inventing a second teardown. Only a real admission change fires it; the
  // first observation (and a surface with no binding) never does.
  useEffect(() => {
    const previous = admissionKeyRef.current;
    admissionKeyRef.current = admissionKey;
    if (admissionKey === null) { armedTokenRef.current = null; return; }
    if (previous === null) { armedTokenRef.current = admissionToken; return; }
    if (previous === admissionKey) return;
    armedTokenRef.current = null;
    stopAll('surface-switch');
    // `admissionToken` is deliberately NOT a dependency. It is a fresh object
    // every render, so listing it would re-run this effect on every render; the
    // effect only ACTS when `admissionKey` changes, and that key is a pure
    // function of the token's fields — so whenever it changes, the token read
    // here is already the one from the render that changed it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissionKey, stopAll]);

  const handleVoice = useCallback(() => {
    if (!admittedNow()) {
      setSelectedStatus('Waiting for the current coaching selection before dictating');
      return;
    }
    // Arm the lane to the admission it is dictating into.
    armedTokenRef.current = readPublicationScope(bindingRef.current);
    runCoachVoiceCommand({
      listening: speech.listening,
      recorderSupported,
      speechSupported: speech.speechSupported,
      toggleListening: speech.toggleListening,
    }, bargeIn, toggleRecorderRef.current, setSelectedStatus);
  }, [admittedNow, bargeIn, recorderSupported, setSelectedStatus, speech]);

  const voiceCaptureMode: VoiceCaptureMode = speech.speechSupported ? 'browser' : recorderSupported ? 'recorder' : 'none';
  const voiceListening = speech.listening || inlineRecorder.isListening;
  const voicePhase: VoiceCapturePhase = voiceListening
    ? 'listening'
    : inlineRecorder.active ? 'transcribing' : 'idle';

  return {
    handleVoice,
    // A voice session is live from the first press until the words land — the
    // same span the overlay used to cover.
    voiceActive: selectionAdmitted && voicePhase !== 'idle',
    voiceCaptureMode,
    // Recorder mode meters its own recording stream; browser dictation has no
    // stream to meter, so the dock's meter opens its own parallel capture.
    voiceGetLevel: voiceCaptureMode === 'recorder' ? inlineRecorder.getLevel : null,
    voicePhase,
    voiceStatus: buildVoiceStatus(voiceInputError, speech.interim, voiceListening),
  };
}
