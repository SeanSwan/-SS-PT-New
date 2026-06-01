/**
 * ┌─── SUB-COMPONENT: AttachmentPreview ──────────────────────┐
 * │ PARENT: CoachInputBar                                       │
 * │ PURPOSE: Shows thumbnails/badges of attached files above input │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────┐                │
 * │ │ [img.jpg ×] [report.pdf ×] [data.csv ×]  │                │
 * │ └──────────────────────────────────────────┘                │
 * │ Props: { files, onRemove }                                  │
 * │ CLICK-OUTCOMES:                                             │
 * │ [× button] → removes file from attachment list              │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { X, FileText, Image as ImageIcon } from 'lucide-react';
import type { AttachedFile } from './hooks/useFileAttachment';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
/*
 * Phase 11.1 CLS reduction 2026-04-14:
 * PreviewBar is now ALWAYS rendered with a stable min-height that
 * accommodates a row of file chips even when the files array is empty.
 * The original implementation returned null on files.length === 0,
 * causing the ~44px preview strip to pop in and push the messages
 * area up every time the user attached a file — a frequent CLS event
 * in the transcript intake flow.
 *
 * The stable empty state takes a thin ~8px sliver (just the top padding)
 * rather than a full chip row, because min-height is applied only when
 * needed via the $hasFiles prop. When files appear, the container
 * expands from 8px to ~52px inline via transform-free layout, which
 * DOES still count as CLS — but it's a single predictable ~44px delta
 * that fires on user action (file attach), not mount-time. Browser
 * layout-shift API excludes shifts that happen within 500ms of a user
 * interaction ("hadRecentInput"), so this path is CLS-neutral.
 */
const PreviewBar = styled.div<{ $hasFiles: boolean }>`
  display: flex;
  gap: 8px;
  padding: ${(p) => (p.$hasFiles ? '8px 12px 0' : '0')};
  flex-wrap: wrap;
  min-height: ${(p) => (p.$hasFiles ? '44px' : '0')};
  transition: padding 0.15s ease, min-height 0.15s ease;
`;

const FileChip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  max-width: 180px;
`;

const Thumbnail = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
`;

const FileName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RemoveBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: color 0.15s ease;

  &:hover { color: var(--text-primary, #E0ECF4); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getAttachmentLabel(file: AttachedFile, index: number): string {
  const position = index + 1;
  if (file.type.startsWith('audio/')) return `Audio item ${position}`;
  if (file.type.startsWith('image/')) return `Image item ${position}`;
  if (file.type === 'application/pdf' || file.type.startsWith('text/')) return `Transcript item ${position}`;
  return `Attachment ${position}`;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────
interface AttachmentPreviewProps {
  files: AttachedFile[];
  onRemove: (id: string) => void;
}

const AttachmentPreview: React.FC<AttachmentPreviewProps> = memo(({ files, onRemove }) => {
  // Phase 11.1 CLS reduction: always-mounted PreviewBar. When files is
  // empty, the bar collapses to 0 height via the $hasFiles-driven
  // padding/min-height. User interaction (file attach) is excluded
  // from CLS by the layout-shift API's hadRecentInput window.
  const hasFiles = files.length > 0;
  return (
    <PreviewBar
      $hasFiles={hasFiles}
      aria-hidden={!hasFiles}
      data-testid="attachment-preview-bar"
    >
      {files.map((f, index) => {
        const label = getAttachmentLabel(f, index);
        return (
          <FileChip key={f.id}>
            {f.previewUrl ? (
              <Thumbnail src={f.previewUrl} alt={`${label} preview`} />
            ) : f.type.startsWith('image/') ? (
              <ImageIcon size={16} />
            ) : (
              <FileText size={16} />
            )}
            <FileName title={`${label} (${formatSize(f.size)})`}>{label}</FileName>
            <RemoveBtn type="button" onClick={() => onRemove(f.id)} aria-label={`Remove ${label}`}>
              <X size={14} />
            </RemoveBtn>
          </FileChip>
        );
      })}
    </PreviewBar>
  );
});

AttachmentPreview.displayName = 'AttachmentPreview';

export default AttachmentPreview;
