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
const PreviewBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 12px 0;
  flex-wrap: wrap;
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
  width: 18px;
  height: 18px;
  border-radius: 50%;
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

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────
interface AttachmentPreviewProps {
  files: AttachedFile[];
  onRemove: (id: string) => void;
}

const AttachmentPreview: React.FC<AttachmentPreviewProps> = memo(({ files, onRemove }) => {
  if (files.length === 0) return null;

  return (
    <PreviewBar>
      {files.map(f => (
        <FileChip key={f.id}>
          {f.previewUrl ? (
            <Thumbnail src={f.previewUrl} alt={f.name} />
          ) : f.type.startsWith('image/') ? (
            <ImageIcon size={16} />
          ) : (
            <FileText size={16} />
          )}
          <FileName title={`${f.name} (${formatSize(f.size)})`}>{f.name}</FileName>
          <RemoveBtn onClick={() => onRemove(f.id)} aria-label={`Remove ${f.name}`}>
            <X size={10} />
          </RemoveBtn>
        </FileChip>
      ))}
    </PreviewBar>
  );
});

AttachmentPreview.displayName = 'AttachmentPreview';

export default AttachmentPreview;
