/**
 * ┌─── SUB-COMPONENT: VoiceRecordingOverlay ──────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Full-screen overlay — record, transcribe, preview  │
 * │ WIREFRAME (recording):                                      │
 * │ ┌─────────────────────────────────┐                         │
 * │ │      ○ Recording... 0:05        │                         │
 * │ │   Listening — tap orb to stop   │                         │
 * │ │   [Cancel]   [Stop & Send]      │                         │
 * │ └─────────────────────────────────┘                         │
 * │ WIREFRAME (preview):                                        │
 * │ ┌─────────────────────────────────┐                         │
 * │ │  TRANSCRIPT — REVIEW BEFORE...  │                         │
 * │ │  "Log bench 225 for Marcus..."  │                         │
 * │ │  [✏ Edit]  [→ Send to Swan Coach]                        │
 * │ └─────────────────────────────────┘                         │
 * │ Props: { isOpen, onClose, onTranscribed, onEditTranscript } │
 * │ SPRINT B: transcript.state = 'done' → preview state.        │
 * │           No auto-dispatch. User must explicitly send/edit.  │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Mic, X, Send, Loader } from 'lucide-react';
import { useVoiceRecorder } from './hooks/useVoiceRecorder';
import { useGeminiTranscription } from './hooks/useGeminiTranscription';
import VoiceTranscriptPreview from './VoiceTranscriptPreview';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────
const pulseRing = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: color-mix(in srgb, var(--bg-base, #030712) 92%, transparent);
  backdrop-filter: blur(12px);
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const OrbContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RecordingOrb = styled.button<{ $recording: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  background: ${({ $recording }) => $recording
    ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))'
    : 'var(--bg-elevated, #141419)'};
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: background 0.3s ease;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const PulseRing = styled.span`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid var(--accent-primary, #60C0F0);
  animation: ${pulseRing} 1.5s ease-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0;
  }
`;

const DurationText = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 24px;
  color: var(--text-primary, #E0ECF4);
`;

const StatusText = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  text-align: center;
  max-width: 300px;
  min-height: 20px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 12px;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 12px;
  border: ${({ $variant }) => $variant === 'ghost'
    ? '1px solid var(--border-soft, rgba(96, 192, 240, 0.12))'
    : 'none'};
  background: ${({ $variant }) => $variant === 'ghost'
    ? 'transparent'
    : 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))'};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  transition: all 0.2s ease;

  &:hover { transform: translateY(-1px); opacity: 0.9; }
  &:active { transform: scale(0.97); }
  &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: opacity 0.2s ease;
    &:hover { transform: none; }
    &:active { transform: none; }
  }
`;

const SpinIcon = styled(Loader)`
  animation: ${spin} 1s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────
interface VoiceRecordingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user confirms "Send to Swan Coach" from preview state */
  onTranscribed: (text: string) => void;
  /** Called when user chooses "Edit" — drops transcript into text input */
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

  // Auto-start recording when overlay opens (desktop only — iOS requires user gesture)
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isOpen && recorder.state === 'idle' && !isIOS) {
      recorder.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto-transcribe when recording stops
  useEffect(() => {
    if (recorder.state === 'stopped' && recorder.audioBlob && transcription.state === 'idle') {
      transcription.transcribe(recorder.audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.state, recorder.audioBlob]);

  // SPRINT B: enter preview state after transcription — do NOT auto-dispatch
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

  // User confirmed "Send to Swan Coach" from preview
  const handlePreviewSend = useCallback(() => {
    onTranscribed(transcription.text);
    handleClose();
  }, [transcription.text, onTranscribed, handleClose]);

  // User chose "Edit" — drop transcript into input bar
  const handlePreviewEdit = useCallback(() => {
    onEditTranscript?.(transcription.text);
    handleClose();
  }, [transcription.text, onEditTranscript, handleClose]);

  // User chose "Try Again" after [inaudible] — restart recording
  const handleRetry = useCallback(async () => {
    transcription.reset();
    recorder.reset();
    setPreviewReady(false);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) await recorder.start();
  }, [recorder, transcription]);

  const handleStopAndSend = useCallback(() => {
    recorder.stop();
  }, [recorder]);

  // Escape closes overlay from any state (recording, transcribing, preview)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  const isRecording = recorder.state === 'recording';
  const isTranscribing = transcription.state === 'transcribing';

  return (
    <Overlay $isOpen={isOpen} role="dialog" aria-modal="true" aria-label="Voice recording">
      {previewReady ? (
        // ── Preview State: user reviews transcript before dispatch ──
        <VoiceTranscriptPreview
          transcript={transcription.text}
          onSend={handlePreviewSend}
          onEdit={handlePreviewEdit}
          onRetry={handleRetry}
        />
      ) : (
        // ── Recording / Transcribing State ──
        <>
          <OrbContainer>
            {isRecording && <PulseRing />}
            <RecordingOrb
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
            {isRecording && 'Listening — tap the orb or press Stop to finish'}
            {isTranscribing && 'Transcribing your voice...'}
            {recorder.state === 'error' && (recorder.error || 'Recording error')}
            {transcription.state === 'error' && (transcription.error || 'Transcription error')}
          </StatusText>

          <ButtonRow>
            <ActionBtn $variant="ghost" onClick={handleClose} aria-label="Cancel recording">
              <X size={18} /> Cancel
            </ActionBtn>
            {isRecording && (
              <ActionBtn onClick={handleStopAndSend} aria-label="Stop and transcribe">
                <Send size={18} /> Stop & Send
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
