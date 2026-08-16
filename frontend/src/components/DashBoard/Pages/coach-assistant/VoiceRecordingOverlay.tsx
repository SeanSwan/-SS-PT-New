/**
 * SUB-COMPONENT: VoiceRecordingOverlay
 * PARENT: SwanCoachAssistantPage
 * PURPOSE: Full-screen voice workflow: record, transcribe, preview, then send or edit.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { Mic, X, Send, RefreshCw } from 'lucide-react';
import { useCoachCapture } from './hooks/useCoachCapture';
import VoiceTranscriptPreview from './VoiceTranscriptPreview';
import {
  ActionBtn,
  ButtonRow,
  DurationText,
  OrbContainer,
  Overlay,
  PulseRing,
  RecordingOrb,
  SpinIcon,
  StatusText,
} from './VoiceRecordingOverlay.styles';

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

interface VoiceRecordingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscribed: (text: string) => void;
  onEditTranscript?: (text: string) => void;
}

const VoiceRecordingOverlay: React.FC<VoiceRecordingOverlayProps> = memo(({
  isOpen,
  onClose,
  onTranscribed,
  onEditTranscript,
}) => {
  /**
  * Capture goes through useCoachCapture rather than the raw recorder/transcription
  * hooks. Those had no lifecycle policy at all, so a recording survived tab-hide,
  * screen lock and route change with the microphone still open.
  */
  const capture = useCoachCapture();
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isOpen && capture.status === 'idle' && !isIOS) {
      capture.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    // 'ready' means capture finished and audio is held awaiting transcription.
    // Skip it after an automatic stop: the user left the screen, so sending
    // their audio to be transcribed anyway would contradict the notice shown.
    if (capture.status === 'ready' && !capture.stoppedAutomatically) {
      void capture.transcribe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture.status, capture.stoppedAutomatically]);

  useEffect(() => {
    if (capture.status === 'done') {
      setPreviewReady(true);
    }
  }, [capture.status]);

  const handleClose = useCallback(() => {
    capture.reset();
    setPreviewReady(false);
    onClose();
  }, [capture, onClose]);

  const handlePreviewSend = useCallback(() => {
    onTranscribed(capture.transcript);
    handleClose();
  }, [capture.transcript, onTranscribed, handleClose]);

  const handlePreviewEdit = useCallback(() => {
    onEditTranscript?.(capture.transcript);
    handleClose();
  }, [capture.transcript, onEditTranscript, handleClose]);

  const handleRetry = useCallback(async () => {
    capture.reset();
    setPreviewReady(false);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) {
      await capture.start();
    }
  }, [capture]);

  const handleStopAndSend = useCallback(() => {
    capture.stop();
  }, [capture]);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  const isRecording = capture.status === 'capturing';
  const isTranscribing = capture.status === 'transcribing';

  return (
    <Overlay $isOpen={isOpen} role="dialog" aria-modal="true" aria-label="Voice recording">
      {previewReady ? (
        <VoiceTranscriptPreview
          transcript={capture.transcript}
          onSend={handlePreviewSend}
          onEdit={handlePreviewEdit}
          onRetry={handleRetry}
        />
      ) : (
        <>
          <OrbContainer>
            {isRecording && <PulseRing />}
            <RecordingOrb
              type="button"
              $recording={isRecording}
              onClick={isRecording
                ? handleStopAndSend
                : capture.status === 'idle'
                  ? () => capture.start()
                  : undefined}
              aria-label={isRecording ? 'Stop recording' : 'Tap to start recording'}
            >
              {isTranscribing ? <SpinIcon size={28} /> : <Mic size={28} />}
            </RecordingOrb>
          </OrbContainer>

          <DurationText>{formatDuration(capture.duration)}</DurationText>

          <StatusText>
            {capture.status === 'requesting' && 'Requesting microphone access...'}
            {isRecording && 'Listening - tap the orb or press Stop to finish'}
            {isTranscribing && 'Transcribing your voice...'}
            {capture.error}
          </StatusText>

          <ButtonRow>
            <ActionBtn type="button" $variant="ghost" onClick={handleClose} aria-label="Cancel recording">
              <X size={18} /> Cancel
            </ActionBtn>

            {isRecording && (
              <ActionBtn type="button" onClick={handleStopAndSend} aria-label="Stop and transcribe">
                <Send size={18} /> Stop & Send
              </ActionBtn>
            )}

            {(capture.status === 'error' || capture.stoppedAutomatically) && (
              <ActionBtn type="button" onClick={handleRetry} aria-label="Try recording again">
                <RefreshCw size={18} /> Try Again
              </ActionBtn>
            )}
          </ButtonRow>
        </>
      )}
    </Overlay>
  );
});

VoiceRecordingOverlay.displayName = 'VoiceRecordingOverlay';
export default VoiceRecordingOverlay;
