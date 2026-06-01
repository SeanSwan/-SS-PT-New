/**
 * SUB-COMPONENT: VoiceRecordingOverlay
 * PARENT: SwanCoachAssistantPage
 * PURPOSE: Full-screen voice workflow: record, transcribe, preview, then send or edit.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { Mic, X, Send, RefreshCw } from 'lucide-react';
import { useVoiceRecorder } from './hooks/useVoiceRecorder';
import { useGeminiTranscription } from './hooks/useGeminiTranscription';
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
  const recorder = useVoiceRecorder();
  const transcription = useGeminiTranscription();
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isOpen && recorder.state === 'idle' && !isIOS) {
      recorder.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (recorder.state === 'stopped' && recorder.audioBlob && transcription.state === 'idle') {
      transcription.transcribe(recorder.audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.state, recorder.audioBlob]);

  useEffect(() => {
    if (transcription.state === 'done') {
      setPreviewReady(true);
    }
  }, [transcription.state]);

  const handleClose = useCallback(() => {
    recorder.reset();
    transcription.reset();
    setPreviewReady(false);
    onClose();
  }, [recorder, transcription, onClose]);

  const handlePreviewSend = useCallback(() => {
    onTranscribed(transcription.text);
    handleClose();
  }, [transcription.text, onTranscribed, handleClose]);

  const handlePreviewEdit = useCallback(() => {
    onEditTranscript?.(transcription.text);
    handleClose();
  }, [transcription.text, onEditTranscript, handleClose]);

  const handleRetry = useCallback(async () => {
    transcription.reset();
    recorder.reset();
    setPreviewReady(false);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) {
      await recorder.start();
    }
  }, [recorder, transcription]);

  const handleStopAndSend = useCallback(() => {
    recorder.stop();
  }, [recorder]);

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

  const isRecording = recorder.state === 'recording';
  const isTranscribing = transcription.state === 'transcribing';

  return (
    <Overlay $isOpen={isOpen} role="dialog" aria-modal="true" aria-label="Voice recording">
      {previewReady ? (
        <VoiceTranscriptPreview
          transcript={transcription.text}
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
                : recorder.state === 'idle'
                  ? () => recorder.start()
                  : undefined}
              aria-label={isRecording ? 'Stop recording' : 'Tap to start recording'}
            >
              {isTranscribing ? <SpinIcon size={28} /> : <Mic size={28} />}
            </RecordingOrb>
          </OrbContainer>

          <DurationText>{formatDuration(recorder.duration)}</DurationText>

          <StatusText>
            {recorder.state === 'requesting' && 'Requesting microphone access...'}
            {isRecording && 'Listening - tap the orb or press Stop to finish'}
            {isTranscribing && 'Transcribing your voice...'}
            {recorder.state === 'error' && (recorder.error || 'Recording error')}
            {transcription.state === 'error' && (transcription.error || 'Transcription error')}
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

            {(transcription.state === 'error' || recorder.state === 'error') && (
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
