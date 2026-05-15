/**
 * plaudClipTimeline.ts
 * ====================
 * Deterministic ordering helpers for PLAUD clips. The backend's durable
 * timestamp prefers recordedAt when the sync source provides it, with
 * uploadedAt as the compatibility fallback.
 */
import type { PlaudClip } from '../../services/plaudClipService';

export interface ClipTimeline {
  selectedClipsInTimelineOrder: PlaudClip[];
  selectedClipIdsInTimelineOrder: string[];
  spanMinutes: number;
  maxGapMinutes: number;
  hasLargeGap: boolean;
}

const LARGE_SESSION_GAP_MINUTES = 90;

function clipTimeMs(clip: PlaudClip): number | null {
  const parsed = Date.parse(clip.recordedAt || clip.uploadedAt || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function minutesBetween(a: PlaudClip, b: PlaudClip): number {
  const aTime = clipTimeMs(a);
  const bTime = clipTimeMs(b);
  if (aTime == null || bTime == null) return 0;
  const delta = Math.abs(bTime - aTime);
  if (!Number.isFinite(delta)) return 0;
  return Math.round(delta / 60000);
}

export function buildClipTimeline(clips: PlaudClip[], selectedIds: Set<string>): ClipTimeline {
  const selectedClipsInTimelineOrder = clips
    .filter((clip) => selectedIds.has(clip.clipId))
    .slice()
    .sort((a, b) => {
      const delta = (clipTimeMs(a) ?? Number.MAX_SAFE_INTEGER) - (clipTimeMs(b) ?? Number.MAX_SAFE_INTEGER);
      if (delta !== 0) return delta;
      return a.filename.localeCompare(b.filename);
    });

  let spanMinutes = 0;
  let maxGapMinutes = 0;
  if (selectedClipsInTimelineOrder.length >= 2) {
    spanMinutes = minutesBetween(
      selectedClipsInTimelineOrder[0],
      selectedClipsInTimelineOrder[selectedClipsInTimelineOrder.length - 1],
    );
    for (let i = 1; i < selectedClipsInTimelineOrder.length; i += 1) {
      maxGapMinutes = Math.max(
        maxGapMinutes,
        minutesBetween(selectedClipsInTimelineOrder[i - 1], selectedClipsInTimelineOrder[i]),
      );
    }
  }

  return {
    selectedClipsInTimelineOrder,
    selectedClipIdsInTimelineOrder: selectedClipsInTimelineOrder.map((clip) => clip.clipId),
    spanMinutes,
    maxGapMinutes,
    hasLargeGap: maxGapMinutes >= LARGE_SESSION_GAP_MINUTES,
  };
}
