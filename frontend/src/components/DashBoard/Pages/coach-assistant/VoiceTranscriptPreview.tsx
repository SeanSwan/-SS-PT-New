/**
 * FILE: VoiceTranscriptPreview.tsx
 * PURPOSE: Post-transcription preview state — shows transcript before dispatch
 * AUTHOR: Claude Sonnet 4.6 | LAST MODIFIED: 2026-04-09
 * PARENT: VoiceRecordingOverlay
 *
 * WHAT THIS FILE DOES: Renders after transcription completes. User reviews the
 * full transcript and explicitly chooses to send or edit. Blocks dispatch on
 * [inaudible] results and offers retry.
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────┐
 * │  TRANSCRIPT — REVIEW BEFORE SENDING  │
 * │ ┌──────────────────────────────────┐ │
 * │ │ "Log bench press 225 for Marcus" │ │
 * │ └──────────────────────────────────┘ │
 * │     [✏ Edit]   [→ Send to Swan Coach]│
 * └──────────────────────────────────────┘
 *
 * [inaudible] error state:
 * ┌──────────────────────────────────────┐
 * │ ⚠ Couldn't hear that clearly...     │
 * │              [↺ Try Again]           │
 * └──────────────────────────────────────┘
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { Send, Edit3, RefreshCw, AlertCircle } from 'lucide-react';

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 460px;
  padding: 0 24px;
`;

const PreviewLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--accent-primary, #60C0F0);
`;

const TranscriptBox = styled.div`
  width: 100%;
  padding: 16px 20px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, var(--bg-surface, #1A1A24));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.55;
  text-align: center;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--status-error, #C9294A) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-error, #C9294A) 30%, transparent);
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  max-width: 340px;
`;

const BtnRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
`;

const Btn = styled.button<{ $variant: 'primary' | 'ghost' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  min-height: 48px;
  border-radius: 12px;
  border: ${({ $variant }) =>
    $variant === 'ghost'
      ? '1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'
      : 'none'};
  background: ${({ $variant }) =>
    $variant === 'ghost'
      ? 'transparent'
      : 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))'};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.15s ease;

  &:hover { opacity: 0.88; transform: translateY(-1px); }
  &:active { transform: scale(0.97); }
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

interface VoiceTranscriptPreviewProps {
  transcript: string;
  onSend: () => void;
  onEdit: () => void;
  onRetry: () => void;
}

const VoiceTranscriptPreview: React.FC<VoiceTranscriptPreviewProps> = memo(({
  transcript,
  onSend,
  onEdit,
  onRetry,
}) => {
  const isInaudible =
    !transcript.trim() ||
    transcript.toLowerCase().trim() === '[inaudible]' ||
    transcript.toLowerCase().includes('[inaudible]');

  if (isInaudible) {
    return (
      <Shell>
        <ErrorBox>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          Couldn't hear that clearly. Try speaking closer to the mic.
        </ErrorBox>
        <BtnRow>
          {/* autoFocus: VoiceTranscriptPreview mounts when previewReady becomes true
              inside a role="dialog" aria-modal overlay — WCAG SC 2.4.3 requires
              focus to move into the dialog on open. autoFocus on first button is
              the minimal safe fix since the component always mounts fresh. */}
          <Btn type="button" $variant="primary" onClick={onRetry} aria-label="Try recording again" autoFocus>
            <RefreshCw size={16} /> Try Again
          </Btn>
        </BtnRow>
      </Shell>
    );
  }

  return (
    <Shell>
      <PreviewLabel>Transcript — review before sending</PreviewLabel>
      <TranscriptBox aria-label="Transcribed text" aria-live="polite">
        {transcript}
      </TranscriptBox>
      <BtnRow>
        {/* autoFocus on first button — same WCAG SC 2.4.3 fix as inaudible branch above */}
        <Btn
          type="button"
          $variant="ghost"
          onClick={onEdit}
          aria-label="Edit transcript in text field"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        >
          <Edit3 size={16} /> Edit
        </Btn>
        <Btn
          type="button"
          $variant="primary"
          onClick={onSend}
          aria-label="Send transcript to Swan Coach"
        >
          <Send size={16} /> Send to Swan Coach
        </Btn>
      </BtnRow>
    </Shell>
  );
});

VoiceTranscriptPreview.displayName = 'VoiceTranscriptPreview';
export default VoiceTranscriptPreview;
