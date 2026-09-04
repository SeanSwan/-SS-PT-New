/**
 * FILE: CoachCommandCenter.voiceCapture.ts
 * PURPOSE: Unifies browser dictation, recorder transcription fallback, and reviewed composer handoff.
 */
import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { mergeVoiceCaptureOrigin, type CoachInputOrigin } from '../../../../hooks/coachInputOrigin';
import { capturedVoiceText, resolveVoiceCommandText } from './CoachCommandCenter.voiceText';
import {
  useCoachBrowserSpeechInput,
  type CoachSpeechRuntimeFailure,
} from './hooks/useCoachBrowserSpeechInput';

type VoiceCaptureMode = 'browser' | 'recorder' | 'none';

type VoiceOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  onEditTranscript: (text: string) => void;
  onTranscribed: (text: string) => void;
};

type VoiceCaptureParams = {
  commandTextRef: RefObject<HTMLTextAreaElement>;
  setCommandText: Dispatch<SetStateAction<string>>;
  setInputOrigin: Dispatch<SetStateAction<CoachInputOrigin>>;
  setSelectedStatus: Dispatch<SetStateAction<string>>;
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
    openRecorder: () => void;
    recorderSupported: boolean;
    speechSupported: boolean;
    toggleListening: () => void;
  },
  setSelectedStatus: (status: string) => void,
) {
  if (speech.speechSupported) {
    speech.toggleListening();
    setSelectedStatus(speech.listening
      ? 'Dictation finished - review the composer, then press Send'
      : 'Listening - tap the mic when you finish');
    return;
  }
  if (speech.recorderSupported) {
    speech.openRecorder();
    setSelectedStatus('Voice recorder opened - review transcript before sending');
    return;
  }
  setSelectedStatus('Voice input is not available in this browser');
}

export function useCoachCommandVoiceCapture({
  commandTextRef,
  setCommandText,
  setInputOrigin,
  setSelectedStatus,
}: VoiceCaptureParams) {
  const [voiceInputError, setVoiceInputError] = useState<string | null>(null);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const recorderSupported = isCoachVoiceRecorderSupported();

  const setVoiceCommandText = useCallback((next: SetStateAction<string>) => {
    setCommandText((current) => {
      const nextValue = resolveVoiceCommandText(next, current);
      setInputOrigin((origin) => mergeVoiceCaptureOrigin(origin, current, nextValue));
      return nextValue;
    });
  }, [setCommandText, setInputOrigin]);

  const handleVoiceCaptured = useCallback((text: string) => {
    setCommandText((current) => {
      const nextValue = capturedVoiceText(current, text);
      setInputOrigin((origin) => mergeVoiceCaptureOrigin(origin, current, text));
      return nextValue;
    });
    setVoiceInputError(null);
    setSelectedStatus('Voice command captured - press Send to continue');
  }, [setCommandText, setInputOrigin, setSelectedStatus]);

  const handleVoiceOverlayEdit = useCallback((text: string) => {
    setVoiceCommandText(text);
    setInputOrigin('mixed');
    setVoiceInputError(null);
    setSelectedStatus('Voice transcript staged - press Send to continue');
    setVoiceOverlayOpen(false);
    window.setTimeout(() => commandTextRef.current?.focus(), 0);
  }, [commandTextRef, setInputOrigin, setSelectedStatus, setVoiceCommandText]);

  const handleVoiceOverlayTranscribed = useCallback((text: string) => {
    handleVoiceCaptured(text);
    setVoiceOverlayOpen(false);
  }, [handleVoiceCaptured]);

  const handleBrowserSpeechUnavailable = useCallback((failure: CoachSpeechRuntimeFailure) => {
    if (recorderSupported && failure.canTryRecorder) {
      setVoiceInputError('Browser dictation failed - recorder fallback opened for review.');
      setVoiceOverlayOpen(true);
      setSelectedStatus('Browser dictation failed - recorder fallback opened');
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

  const handleVoice = useCallback(() => {
    runCoachVoiceCommand({
      listening: speech.listening,
      openRecorder: () => setVoiceOverlayOpen(true),
      recorderSupported,
      speechSupported: speech.speechSupported,
      toggleListening: speech.toggleListening,
    }, setSelectedStatus);
  }, [recorderSupported, setSelectedStatus, speech]);

  const voiceCaptureMode: VoiceCaptureMode = speech.speechSupported ? 'browser' : recorderSupported ? 'recorder' : 'none';
  const voiceOverlay: VoiceOverlayProps = useMemo(() => ({
    isOpen: voiceOverlayOpen,
    onClose: () => setVoiceOverlayOpen(false),
    onEditTranscript: handleVoiceOverlayEdit,
    onTranscribed: handleVoiceOverlayTranscribed,
  }), [handleVoiceOverlayEdit, handleVoiceOverlayTranscribed, voiceOverlayOpen]);

  return {
    handleVoice,
    voiceActive: speech.listening || voiceOverlayOpen,
    voiceCaptureMode,
    voiceOverlay,
    voiceStatus: buildVoiceStatus(voiceInputError, speech.interim, speech.listening),
    voiceSupported: speech.speechSupported || recorderSupported,
  };
}
