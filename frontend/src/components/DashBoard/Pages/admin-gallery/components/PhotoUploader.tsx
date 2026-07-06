/**
 * PhotoUploader — drag-drop batch uploader with live progress
 * ===========================================================
 * Drop or pick JPEGs; they upload one-at-a-time with a progress ribbon, a
 * per-file status list (colored state dots), mid-batch cancel, and retry-failed.
 * The signature moment of the studio.
 */

import React, { useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { ChevronDown, Info, RotateCcw, UploadCloud, X } from 'lucide-react';
import type { UploadFileStatus, UploadStatus } from '../types';
import type { UploadResultMessage } from '../hooks/useGalleryUpload';
import { Banner, DangerButton, HelperText, Panel, PrimaryButton, SectionTitle } from '../styles';
import ToggleField from './ToggleField';

interface Props {
  eventName: string;
  watermark: boolean;
  onWatermarkChange: (v: boolean) => void;
  fileStatuses: UploadFileStatus[];
  uploading: boolean;
  overallProgress: number;
  resultMessage: UploadResultMessage | null;
  failedCount: number;
  onFiles: (files: File[]) => void;
  onCancel: () => void;
  onRetry: () => void;
}

const ACCEPT = 'image/jpeg,image/png,image/webp';
const DOT_COLOR: Record<UploadStatus, string> = {
  pending: 'var(--text-faint, #64748b)',
  uploading: 'var(--accent-primary, #60c0f0)',
  processing: 'var(--gilded-fern, #c6a84b)',
  done: 'var(--success, #22c55e)',
  error: 'var(--danger, #e5484d)',
};

const fmtElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const PhotoUploader: React.FC<Props> = ({
  eventName, watermark, onWatermarkChange, fileStatuses, uploading, overallProgress, resultMessage, failedCount, onFiles, onCancel, onRetry,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!uploading) return undefined;
    const start = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [uploading]);

  const pick = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (files.length) onFiles(files);
  };

  return (
    <Panel>
      <SectionTitle><UploadCloud size={18} aria-hidden="true" /> Upload to “{eventName}”</SectionTitle>

      <ToggleField
        label="Apply watermark"
        hint="Protects previews. Turn off only for final delivered copies."
        checked={watermark}
        onChange={onWatermarkChange}
        disabled={uploading}
      />

      <TipsToggle type="button" onClick={() => setTipsOpen((v) => !v)} aria-expanded={tipsOpen}>
        <Info size={14} aria-hidden="true" /> Export tips for best results
        <ChevronDown size={14} aria-hidden="true" style={{ transform: tipsOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </TipsToggle>
      {tipsOpen && (
        <HelperText>
          Export JPEGs ≤ 25&nbsp;MB each (sRGB, quality ~85, long edge ~3000px). RAW files are rejected; PNG/WebP are
          auto-converted. Uploads run one at a time — large batches take a while, that&apos;s normal.
        </HelperText>
      )}

      <DropZone
        $dragging={dragging}
        $disabled={uploading}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!uploading) pick(e.dataTransfer.files); }}
        role="button"
        tabIndex={0}
        aria-disabled={uploading}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) { e.preventDefault(); inputRef.current?.click(); } }}
      >
        <UploadCloud size={30} aria-hidden="true" />
        <strong>{dragging ? 'Drop to upload' : 'Drag photos here or click to browse'}</strong>
        <HelperText style={{ margin: 0 }}>JPEG · up to 25&nbsp;MB each · up to 500 per batch</HelperText>
      </DropZone>
      <HiddenInput ref={inputRef} type="file" accept={ACCEPT} multiple onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />

      {uploading && (
        <Progress>
          <ProgressHead>
            <span>Uploading… {overallProgress}%</span>
            <Elapsed>{fmtElapsed(elapsed)}</Elapsed>
          </ProgressHead>
          <Track><Bar style={{ width: `${overallProgress}%` }} /></Track>
          <DangerButton type="button" onClick={onCancel}><X size={16} /> Cancel</DangerButton>
        </Progress>
      )}

      {resultMessage && <Banner $tone={resultMessage.tone} role="status">{resultMessage.text}</Banner>}

      {failedCount > 0 && !uploading && (
        <PrimaryButton type="button" onClick={onRetry}><RotateCcw size={16} /> Retry {failedCount} failed</PrimaryButton>
      )}

      {fileStatuses.length > 0 && (
        <StatusList>
          {fileStatuses.map((f, i) => (
            <StatusRow key={`${f.name}-${i}`}>
              <Dot $color={DOT_COLOR[f.status]} $animate={f.status === 'uploading' || f.status === 'processing'} />
              <FileName title={f.name}>{f.name}</FileName>
              <StatusText>
                {f.status === 'uploading' && `${f.progress}%`}
                {f.status === 'processing' && 'processing'}
                {f.status === 'done' && 'done'}
                {f.status === 'pending' && 'queued'}
                {f.status === 'error' && (f.error || 'failed')}
              </StatusText>
            </StatusRow>
          ))}
        </StatusList>
      )}
    </Panel>
  );
};

const pulse = keyframes`0%,100%{opacity:1}50%{opacity:0.35}`;

const TipsToggle = styled.button`
  display: flex; align-items: center; gap: 0.4rem;
  background: none; border: none; padding: 0.5rem 0; cursor: pointer;
  font-size: 0.82rem; color: var(--accent-primary, #60c0f0);
`;

const DropZone = styled.div<{ $dragging: boolean; $disabled: boolean }>`
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  padding: 2rem 1rem; margin-top: 0.75rem;
  border: 1.5px dashed ${({ $dragging }) => ($dragging ? 'var(--accent-primary, #60c0f0)' : 'var(--border-subtle, rgba(96,192,240,0.3))')};
  border-radius: 14px; text-align: center;
  color: ${({ $dragging }) => ($dragging ? 'var(--accent-primary, #60c0f0)' : 'var(--text-muted, #8fa3b8)')};
  background: ${({ $dragging }) => ($dragging ? 'rgba(96,192,240,0.08)' : 'transparent')};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  transition: border-color 0.18s ease, background 0.18s ease;
  &:focus-visible { outline: 2px solid var(--accent-purple, #8b5cf6); outline-offset: 2px; }
`;

const HiddenInput = styled.input`display: none;`;

const Progress = styled.div`display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.85rem;`;
const ProgressHead = styled.div`display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-primary, #e0ecf4);`;
const Elapsed = styled.span`font-family: 'Fira Code', monospace; color: var(--text-muted, #8fa3b8);`;
const Track = styled.div`height: 8px; border-radius: 999px; background: var(--surface-dark, #1a1a24); overflow: hidden;`;
const Bar = styled.div`
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--accent-primary, #60c0f0), var(--accent-purple, #8b5cf6));
  @media (prefers-reduced-motion: no-preference) { transition: width 0.25s ease; }
`;

const StatusList = styled.ul`
  list-style: none; margin: 0.85rem 0 0; padding: 0.25rem;
  max-height: 240px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 0.25rem;
  border-top: 1px solid var(--border-subtle, rgba(96,192,240,0.12));
`;
const StatusRow = styled.li`display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0.25rem; font-size: 0.82rem;`;
const Dot = styled.span<{ $color: string; $animate: boolean }>`
  width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: ${({ $color }) => $color};
  @media (prefers-reduced-motion: no-preference) {
    ${({ $animate }) => ($animate ? css`animation: ${pulse} 1s ease-in-out infinite;` : '')}
  }
`;
const FileName = styled.span`flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary, #e0ecf4);`;
const StatusText = styled.span`flex-shrink: 0; color: var(--text-muted, #8fa3b8); font-family: 'Fira Code', monospace; font-size: 0.75rem;`;

export default PhotoUploader;
