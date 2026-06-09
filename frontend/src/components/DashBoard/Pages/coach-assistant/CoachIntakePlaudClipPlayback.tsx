/**
 * CoachIntakePlaudClipPlayback.tsx
 * ================================
 * Renders authenticated PLAUD clip playback inside the active Coach intake
 * target without exposing raw URLs or transcripts.
 */
import { FileAudio } from 'lucide-react';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import type { PlaudClip } from '../../../../services/plaudClipService';
import { PlaudClipAudioPreview } from '../../../PlaudClipMerge/PlaudClipAudioPreview';
import { AudioPlaybackHeader, AudioPlaybackPanel } from './CoachIntakeWorkspaceAudio.styles';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function playableFields(item: CoachIntakeItem, clipId: string): { mimetype: string; playbackPath: string } | null {
  if (item.kind !== 'clip') return null;
  return clipPlaybackFields(item, clipId);
}

function clipPlaybackFields(item: CoachIntakeItem, clipId: string): { mimetype: string; playbackPath: string } | null {
  if (!UUID_RE.test(clipId)) return null;
  if (!item.playbackPath || !item.mimetype) return null;
  return { mimetype: item.mimetype, playbackPath: item.playbackPath };
}

function optionalText(...values: Array<string | null | undefined>): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0);
}

function durationOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function textOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function numberOrZero(value: unknown): number {
  return Number(value || 0);
}

function toPlaudClip(item: CoachIntakeItem): PlaudClip | null {
  const clipId = textOrFallback(item.entityId, '').trim();
  const fields = playableFields(item, clipId);
  if (!fields) return null;

  return {
    clipId,
    filename: 'Active PLAUD intake clip',
    mimetype: fields.mimetype,
    size: numberOrZero(item.sizeBytes),
    durationSec: durationOrNull(item.durationSec),
    r2MirrorStatus: optionalText(item.r2MirrorStatus, item.mirrorStatus),
    status: textOrFallback(item.status, 'pending_merge'),
    clipSource: item.source,
    recordedAt: textOrNull(item.recordedAt),
    uploadedAt: optionalText(item.createdAt, item.timelineAt) || '',
    expiresAt: textOrFallback(item.expiresAt, ''),
    playbackReady: item.playbackReady,
    playbackPath: fields.playbackPath,
  };
}

const CoachIntakePlaudClipPlayback = ({ item }: { item: CoachIntakeItem }): JSX.Element | null => {
  const clip = toPlaudClip(item);
  if (!clip) return null;

  return (
    <AudioPlaybackPanel aria-label="Active PLAUD clip playback">
      <AudioPlaybackHeader>
        <FileAudio size={14} aria-hidden="true" />
        Audio playback
      </AudioPlaybackHeader>
      <PlaudClipAudioPreview clip={clip} label="active PLAUD intake clip" />
    </AudioPlaybackPanel>
  );
};

export default CoachIntakePlaudClipPlayback;
