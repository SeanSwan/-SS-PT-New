/**
 * SUB-COMPONENT: VoiceRecordingOverlay
 * PARENT: SwanCoachAssistantPage
 * PURPOSE: Full-screen voice workflow: record, transcribe, preview, then send or edit.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, X, Send, RefreshCw } from 'lucide-react';
import { useVoiceRecorder } from './hooks/useVoiceRecorder';
import { useGeminiTranscription } from './hooks/useGeminiTranscription';
import VoiceTranscriptPreview from './VoiceTranscriptPreview';
import {
  ActionBtn,
  ButtonRow,
  DurationText,
  LevelRing,
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
  const levelRingRef = useRef<HTMLSpanElement | null>(null);
  const orbRef = useRef<HTMLButtonElement | null>(null);

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

  // Initial focus lands on the orb so keyboard/AT users are inside the
  // dialog the moment it opens.
  useEffect(() => {
    if (isOpen) orbRef.current?.focus();
  }, [isOpen]);

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

  // Level-reactive ring: imperative transform on a ref (no per-frame React
  // state), skipped entirely under prefers-reduced-motion.
  useEffect(() => {
    if (!isRecording) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const paint = () => {
      const ring = levelRingRef.current;
      if (ring) {
        const level = recorder.getAudioLevel();
        ring.style.transform = `scale(${(1 + level * 0.7).toFixed(3)})`;
        ring.style.opacity = (0.2 + level * 0.6).toFixed(3);
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // Closed = fully unmounted: an opacity-0 aria-modal dialog parked in
  // document.body still hits the accessibility tree.
  if (!isOpen) return null;

  // Portaled: rendered inline, the fixed overlay was trapped under the same
  // page's ops drawer (z 10040+) and any transformed ancestor (cube bug class).
  return createPortal(
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
            {isRecording && <LevelRing ref={levelRingRef} aria-hidden="true" />}
            <RecordingOrb
              ref={orbRef}
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
    </Overlay>,
    document.body,
  );
});

VoiceRecordingOverlay.displayName = 'VoiceRecordingOverlay';
export default VoiceRecordingOverlay;
