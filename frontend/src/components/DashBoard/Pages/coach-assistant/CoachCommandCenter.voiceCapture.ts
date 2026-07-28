import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { AI_CHAT_MESSAGE_MAX_CHARS } from '../../../../hooks/aiMessageLimits';
import { capturedVoiceText, resolveVoiceCommandText } from './CoachCommandCenter.voiceText';
import { useCoachBrowserSpeechInput } from './hooks/useCoachBrowserSpeechInput';

type VoiceCaptureMode = 'browser' | 'recorder' | 'none';

type VoiceOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  onEditTranscript: (text: string) => void;
  onTranscribed: (text: string) => void;
};

type VoiceCaptureParams = {
  commandTextRef: RefObject<HTMLTextAreaElement>;
  maxChars?: number;
  setCommandText: Dispatch<SetStateAction<string>>;
  setSelectedStatus: Dispatch<SetStateAction<string>>;
};

function buildVoiceStatus(
  voiceInputError: string | null,
  interim: string | null,
  cancelPillVisible: boolean,
): string | null {
  if (voiceInputError) return voiceInputError;
  if (interim) return `Listening: ${interim}`;
  return cancelPillVisible ? 'Voice command captured - tap Mic to cancel before it lands in the composer' : null;
}

function isCoachVoiceRecorderSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return typeof window.MediaRecorder !== 'undefined'
    && typeof navigator.mediaDevices?.getUserMedia === 'function';
}

function runCoachVoiceCommand(
  speech: {
    cancelPillVisible: boolean;
    handleCancelSend: () => void;
    openRecorder: () => void;
    recorderSupported: boolean;
    speechSupported: boolean;
    toggleListening: () => void;
  },
  setSelectedStatus: (status: string) => void,
) {
  if (speech.cancelPillVisible) {
    speech.handleCancelSend();
    setSelectedStatus('Voice command cancelled');
    return;
  }
  if (speech.speechSupported) {
    speech.toggleListening();
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
  maxChars = AI_CHAT_MESSAGE_MAX_CHARS,
  setCommandText,
  setSelectedStatus,
}: VoiceCaptureParams) {
  const [voiceInputError, setVoiceInputError] = useState<string | null>(null);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);

  const setVoiceCommandText = useCallback((next: SetStateAction<string>) => {
    setCommandText((current) => resolveVoiceCommandText(next, current));
  }, [setCommandText]);

  const handleVoiceCaptured = useCallback((text: string) => {
    setCommandText((current) => capturedVoiceText(current, text));
    setSelectedStatus('Voice command captured - press Send to continue');
  }, [setCommandText, setSelectedStatus]);

  const handleVoiceOverlayEdit = useCallback((text: string) => {
    setVoiceCommandText(text);
    setSelectedStatus('Voice transcript staged - press Send to continue');
    setVoiceOverlayOpen(false);
    window.setTimeout(() => commandTextRef.current?.focus(), 0);
  }, [commandTextRef, setSelectedStatus, setVoiceCommandText]);

  const handleVoiceOverlayTranscribed = useCallback((text: string) => {
    handleVoiceCaptured(text);
    setVoiceOverlayOpen(false);
  }, [handleVoiceCaptured]);

  const speech = useCoachBrowserSpeechInput({
    maxChars,
    onSend: handleVoiceCaptured,
    setInputError: setVoiceInputError,
    setText: setVoiceCommandText,
  });

  const recorderSupported = isCoachVoiceRecorderSupported();
  const handleVoice = useCallback(() => {
    runCoachVoiceCommand({
      cancelPillVisible: speech.cancelPillVisible,
      handleCancelSend: speech.handleCancelSend,
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
    voiceStatus: buildVoiceStatus(voiceInputError, speech.interim, speech.cancelPillVisible),
    voiceSupported: speech.speechSupported || recorderSupported,
  };
}
