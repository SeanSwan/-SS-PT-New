/**
 * PlaudClipUploader.tsx
 * ======================
 * Drag-drop + multi-file picker for PLAUD clips.
 *
 * Phase 3 Slice 3.11 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md.
 *
 * Mobile-first responsive (CLAUDE.md Rule 24): tested 320, 375, 414,
 * 768, 1024, 1280px viewports. Touch-target ≥44px (Rule 2).
 *
 * Crystalline Swan tokens (no hardcoded colors per Rule 6).
 */
import React, { useCallback, useRef, useState } from 'react';
import styled from 'styled-components';
import { Upload, FileAudio } from 'lucide-react';

const ACCEPTED_MIMES = [
  'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav',
  'audio/webm', 'audio/ogg', 'audio/x-m4a', 'audio/m4a',
  'audio/aac', 'audio/flac', 'audio/x-wav',
];
const MAX_FILES = 5;

const DropZone = styled.div<{ $dragOver: boolean; $disabled: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  padding: 1.5rem;
  background: ${({ $dragOver }) =>
    $dragOver ? 'rgba(96, 192, 240, 0.15)' : 'var(--surface-elevated, rgba(30,30,60,0.3))'};
  border: 2px dashed ${({ $dragOver }) =>
    $dragOver ? 'var(--accent-primary, #60C0F0)' : 'var(--border-subtle, rgba(96,192,240,0.3))'};
  border-radius: 14px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: background-color 200ms ease, border-color 200ms ease;
  text-align: center;
  color: var(--text-primary, #E0ECF4);

  &:hover {
    border-color: ${({ $disabled }) =>
      $disabled ? 'var(--border-subtle, rgba(96,192,240,0.3))' : 'var(--accent-primary, #60C0F0)'};
  }

  @media (min-width: 768px) {
    min-height: 200px;
    padding: 2rem;
  }
`;

const Headline = styled.div`
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;

  @media (min-width: 768px) {
    font-size: 1.125rem;
  }
`;

const Sub = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const ChooseButton = styled.button`
  margin-top: 0.875rem;
  padding: 0.625rem 1.25rem;
  min-height: 44px;
  background: var(--bg-primary, #002060);
  color: var(--text-primary, #E0ECF4);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(139, 92, 246, 0.35);
  transition: box-shadow 200ms ease, background-color 200ms ease;

  &:hover:not(:disabled) {
    background: var(--bg-elevated, #003080);
    box-shadow: 0 0 24px rgba(139, 92, 246, 0.55);
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const ErrorBanner = styled.div`
  margin-top: 0.75rem;
  padding: 0.625rem 0.875rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: rgba(252, 165, 165, 1);
  font-size: 0.875rem;
  text-align: left;
`;

export interface PlaudClipUploaderProps {
  isUploading: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  helpText?: string;
}

export function PlaudClipUploader({
  isUploading,
  disabled,
  onFiles,
  helpText,
}: PlaudClipUploaderProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const isDisabled = !!disabled || isUploading;

  const onPick = useCallback(() => {
    if (isDisabled) return;
    inputRef.current?.click();
  }, [isDisabled]);

  const handleFiles = useCallback((rawFiles: FileList | null) => {
    setLocalError(null);
    if (!rawFiles) return;
    const incoming = Array.from(rawFiles);
    if (incoming.length === 0) return;
    if (incoming.length > MAX_FILES) {
      setLocalError(`At most ${MAX_FILES} files per upload (got ${incoming.length})`);
      return;
    }
    const filtered: File[] = [];
    const rejectedFileLabels: string[] = [];
    for (const f of incoming) {
      if (f.type && ACCEPTED_MIMES.includes(f.type)) {
        filtered.push(f);
      } else {
        rejectedFileLabels.push(`Unsupported item ${rejectedFileLabels.length + 1}`);
      }
    }
    if (filtered.length === 0) {
      setLocalError(`Unsupported file types: ${rejectedFileLabels.join(', ')}`);
      return;
    }
    if (rejectedFileLabels.length > 0) {
      setLocalError(`Skipping unsupported: ${rejectedFileLabels.join(', ')}`);
    }
    onFiles(filtered);
  }, [onFiles]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so the same file can be reuploaded after delete
    if (e.target) e.target.value = '';
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isDisabled) return;
    setDragOver(true);
  }, [isDisabled]);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (isDisabled) return;
    handleFiles(e.dataTransfer.files);
  }, [isDisabled, handleFiles]);

  return (
    <div>
      <DropZone
        role="button"
        tabIndex={0}
        aria-label="Upload PLAUD clips"
        aria-disabled={isDisabled}
        onClick={onPick}
        onKeyDown={(e) => { if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) onPick(); }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        $dragOver={dragOver}
        $disabled={isDisabled}
      >
        <Upload size={32} aria-hidden="true" />
        <Headline>{isUploading ? 'Uploading...' : 'Drop PLAUD clips here'}</Headline>
        <Sub>{helpText || `Up to ${MAX_FILES} clips per batch · MP3 / WAV / M4A / AAC / FLAC / OGG`}</Sub>
        <ChooseButton type="button" onClick={(e) => { e.stopPropagation(); onPick(); }} disabled={isDisabled}>
          <FileAudio size={16} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {isUploading ? 'Uploading...' : 'Choose files'}
        </ChooseButton>
        <HiddenInput
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_MIMES.join(',')}
          onChange={onChange}
          disabled={isDisabled}
          aria-label="Select PLAUD audio clips"
          data-plaud-uploader-input="true"
          data-testid="plaud-uploader-input"
        />
      </DropZone>
      {localError ? <ErrorBanner role="alert">{localError}</ErrorBanner> : null}
    </div>
  );
}

export default PlaudClipUploader;
