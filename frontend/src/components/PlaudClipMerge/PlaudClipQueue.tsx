/**
 * PlaudClipQueue.tsx
 * ===================
 * Multi-select clip list with per-row delete. Mobile-first responsive
 * (CLAUDE.md Rule 24); 44px touch targets (Rule 2); checkbox semantics
 * via role+aria-checked for screen readers.
 *
 * Phase 3 Slice 3.11 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md.
 */
import styled from 'styled-components';
import { Trash2, CheckCircle, Circle, FileAudio } from 'lucide-react';
import type { PlaudClip } from '../../services/plaudClipService';
import { buildClipTimeline } from './plaudClipTimeline';
import { PlaudClipAudioPreview } from './PlaudClipAudioPreview';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
`;

const Empty = styled.div`
  padding: 1.5rem 1rem;
  text-align: center;
  color: var(--text-secondary, rgba(224,236,244,0.7));
  font-size: 0.95rem;
  background: var(--surface-elevated, rgba(30,30,60,0.2));
  border: 1px dashed rgba(96,192,240,0.2);
  border-radius: 12px;
`;

const Row = styled.div<{ $selected: boolean }>`
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  background: ${({ $selected }) =>
    $selected ? 'rgba(139, 92, 246, 0.18)' : 'var(--surface-elevated, rgba(30,30,60,0.3))'};
  border: 1px solid ${({ $selected }) =>
    $selected ? 'rgba(139, 92, 246, 0.5)' : 'rgba(96,192,240,0.2)'};
  border-radius: 12px;
  min-height: 56px;
  transition: background-color 150ms ease, border-color 150ms ease;

  &:hover {
    border-color: rgba(96,192,240,0.4);
  }

  @media (min-width: 768px) {
    grid-template-columns: 36px 1fr auto auto;
    gap: 0.875rem;
    padding: 0.75rem 1rem;
  }
`;

const CheckboxButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--accent-primary, #60C0F0);
  padding: 0;

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
    border-radius: 6px;
  }
`;

const ClipMeta = styled.div`
  min-width: 0;
  overflow: hidden;
`;

const FileName = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (min-width: 1024px) {
    font-size: 1rem;
  }
`;

const SubMeta = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224,236,244,0.65));
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const StatusPill = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 999px;
  background: ${({ $status }) => {
    if ($status === 'pending_merge') return 'rgba(96,192,240,0.18)';
    if ($status === 'uploading') return 'rgba(198, 168, 75, 0.2)';
    if ($status === 'merged') return 'rgba(139, 92, 246, 0.2)';
    if ($status === 'lost' || $status === 'expired') return 'rgba(239, 68, 68, 0.18)';
    return 'rgba(96,192,240,0.12)';
  }};
  color: ${({ $status }) => {
    if ($status === 'lost' || $status === 'expired') return 'rgba(252, 165, 165, 1)';
    if ($status === 'merged') return '#C4B5FD';
    return 'var(--text-primary, #E0ECF4)';
  }};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const OrderPill = styled.span`
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  background: rgba(96, 192, 240, 0.18);
  border: 1px solid rgba(96, 192, 240, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const DeleteButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--text-secondary, rgba(224,236,244,0.65));
  cursor: pointer;
  transition: color 150ms ease, border-color 150ms ease, background-color 150ms ease;

  &:hover {
    color: rgba(252, 165, 165, 1);
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.08);
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec: number | null): string {
  if (!sec || !Number.isFinite(sec)) return '';
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function formatUploadedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function clipDisplayLabel(index: number): string {
  return `Audio clip ${index + 1}`;
}

export interface PlaudClipQueueProps {
  clips: PlaudClip[];
  selectedIds: Set<string>;
  onToggleSelect: (clipId: string) => void;
  onDelete: (clipId: string) => void;
  isLoading?: boolean;
}

export function PlaudClipQueue({
  clips,
  selectedIds,
  onToggleSelect,
  onDelete,
  isLoading,
}: PlaudClipQueueProps): JSX.Element {
  if (isLoading && clips.length === 0) {
    return <Empty>Loading your queue…</Empty>;
  }
  if (clips.length === 0) {
    return <Empty><FileAudio size={20} aria-hidden="true" /> No clips uploaded yet. Drop PLAUD recordings above to get started.</Empty>;
  }
  const timeline = buildClipTimeline(clips, selectedIds);
  const selectedOrder = new Map(timeline.selectedClipIdsInTimelineOrder.map((clipId, index) => [clipId, index + 1]));
  return (
    <Container role="list" aria-label="Pending PLAUD clips">
      {clips.map((c, index) => {
        const selected = selectedIds.has(c.clipId);
        const sizeStr = formatSize(c.size);
        const durStr = formatDuration(c.durationSec);
        const uploadedStr = formatUploadedAt(c.uploadedAt);
        const order = selectedOrder.get(c.clipId);
        const label = clipDisplayLabel(index);
        return (
          <Row key={c.clipId} role="listitem" $selected={selected} data-clip-id={c.clipId}>
            <CheckboxButton
              type="button"
              aria-label={selected ? `Deselect ${label}` : `Select ${label}`}
              role="checkbox"
              aria-checked={selected}
              onClick={() => onToggleSelect(c.clipId)}
            >
              {selected ? <CheckCircle size={22} /> : <Circle size={22} />}
            </CheckboxButton>
            <ClipMeta>
              <FileName title={label}>{label}</FileName>
              <SubMeta>
                {order ? <OrderPill>Merge step {order}</OrderPill> : null}
                {durStr ? <span>{durStr}</span> : null}
                {sizeStr ? <span>· {sizeStr}</span> : null}
                {uploadedStr ? <span>Uploaded {uploadedStr}</span> : null}
                <StatusPill $status={c.status}>{c.status.replace('_', ' ')}</StatusPill>
              </SubMeta>
              <PlaudClipAudioPreview clip={c} label={label} />
            </ClipMeta>
            <DeleteButton
              type="button"
              aria-label={`Delete ${label}`}
              onClick={() => onDelete(c.clipId)}
            >
              <Trash2 size={18} aria-hidden="true" />
            </DeleteButton>
          </Row>
        );
      })}
    </Container>
  );
}

export default PlaudClipQueue;
