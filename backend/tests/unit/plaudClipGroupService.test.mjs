import { describe, expect, it } from 'vitest';
import { buildPlaudClipGroupCandidates } from '../../services/plaudClipGroupService.mjs';

function row(overrides) {
  return {
    clip_id: overrides.clipId,
    duration_sec: overrides.durationSec ?? 60,
    size_bytes: 1024,
    clip_source: overrides.clipSource || 'applaud_local_sync',
    recorded_at: overrides.recordedAt || null,
    uploaded_at: overrides.uploadedAt || overrides.recordedAt,
    ...overrides,
  };
}

describe('plaudClipGroupService', () => {
  it('groups nearby APPLAUD clips by recorded timeline and splits large gaps', () => {
    const groups = buildPlaudClipGroupCandidates([
      row({ clipId: 'a', recordedAt: '2026-05-14T16:00:00.000Z' }),
      row({ clipId: 'b', recordedAt: '2026-05-14T16:25:00.000Z' }),
      row({ clipId: 'c', recordedAt: '2026-05-14T20:00:00.000Z' }),
    ], { maxGapMinutes: 90 });

    expect(groups).toHaveLength(2);
    expect(groups[0].clipIds).toEqual(['a', 'b']);
    expect(groups[0].timelineAtSource).toBe('recorded_at');
    expect(groups[0].confidence).toBe('high');
    expect(groups[1].clipIds).toEqual(['c']);
  });

  it('falls back to upload chronology with lower confidence', () => {
    const groups = buildPlaudClipGroupCandidates([
      row({ clipId: 'a', recordedAt: null, uploadedAt: '2026-05-14T16:00:00.000Z' }),
      row({ clipId: 'b', recordedAt: null, uploadedAt: '2026-05-14T16:10:00.000Z' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].timelineAtSource).toBe('uploaded_at');
    expect(groups[0].confidence).toBe('low');
  });

  it('never proposes groups larger than the merge API accepts', () => {
    const rows = Array.from({ length: 6 }, (_, index) => row({
      clipId: String(index + 1),
      recordedAt: `2026-05-14T16:${String(index).padStart(2, '0')}:00.000Z`,
    }));

    const groups = buildPlaudClipGroupCandidates(rows, { maxClipsPerGroup: 5 });

    expect(groups.map((group) => group.clipIds)).toEqual([
      ['1', '2', '3', '4', '5'],
      ['6'],
    ]);
  });

  it('labels official Plaud CLI groups distinctly from Applaud sync', () => {
    const groups = buildPlaudClipGroupCandidates([
      row({
        clipId: 'official-1',
        clipSource: 'plaud_official_sync',
        recordedAt: '2026-05-14T16:00:00.000Z',
      }),
    ]);

    expect(groups[0].title).toBe('Plaud official sync group 1');
    expect(groups[0].sourceMix).toEqual(['plaud_official_sync']);
  });
});
