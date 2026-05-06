/**
 * plaudDateSplitApprovalGuard tests
 * =================================
 * Locks approval blocking for unresolved deterministic PLAUD date candidates.
 */
import { describe, expect, it } from 'vitest';
import type { PlaudDateSplitCandidates, PlaudDateSplitSegment } from '../../services/plaudMergeService';
import { getPlaudDateSplitApprovalBlock } from './plaudDateSplitApprovalGuard';

function segment(overrides: Partial<PlaudDateSplitSegment> = {}): PlaudDateSplitSegment {
  return {
    segmentId: overrides.segmentId || 'segment-1',
    segmentIndex: overrides.segmentIndex || 1,
    date: overrides.date || '2026-05-05',
    dateSource: overrides.dateSource || 'phrase:today',
    dateConfidence: overrides.dateConfidence || 'high',
    needsDateConfirmation: overrides.needsDateConfirmation ?? false,
    futureDateBlocked: overrides.futureDateBlocked ?? false,
    evidence: overrides.evidence ?? 'today',
    referenceDate: overrides.referenceDate || '2026-05-05',
    referenceSource: overrides.referenceSource || 'clip_timeline_uploaded_at',
    timeZone: overrides.timeZone || 'America/Los_Angeles',
    startLine: overrides.startLine ?? 1,
    endLine: overrides.endLine ?? 2,
    text: overrides.text || 'Workout details.',
  };
}

function candidates(segments: PlaudDateSplitSegment[]): PlaudDateSplitCandidates {
  return {
    referenceDate: '2026-05-05',
    timeZone: 'America/Los_Angeles',
    referenceSource: 'clip_timeline_uploaded_at',
    segmentCount: segments.length,
    needsDateReviewCount: segments.filter((item) => item.needsDateConfirmation).length,
    futureDateBlockedCount: segments.filter((item) => item.futureDateBlocked).length,
    segments,
  };
}

describe('getPlaudDateSplitApprovalBlock', () => {
  it('allows approval when there are no date split candidates', () => {
    expect(getPlaudDateSplitApprovalBlock(null)).toBeNull();
    expect(getPlaudDateSplitApprovalBlock(candidates([]))).toBeNull();
  });

  it('blocks future-dated workout segments first', () => {
    const message = getPlaudDateSplitApprovalBlock(candidates([
      segment({ futureDateBlocked: true, needsDateConfirmation: true, date: '2026-05-08' }),
      segment({ segmentId: 'segment-2', needsDateConfirmation: true }),
    ]));

    expect(message).toMatch(/lands in the future/);
    expect(message).toMatch(/Confirm the real session date/);
  });

  it('blocks unresolved non-future date segments', () => {
    const message = getPlaudDateSplitApprovalBlock(candidates([
      segment({ needsDateConfirmation: true, dateConfidence: 'low', dateSource: 'reference_timeline' }),
    ]));

    expect(message).toBe('1 workout date needs confirmation before logging.');
  });

  it('allows approval when every date segment is ready', () => {
    expect(getPlaudDateSplitApprovalBlock(candidates([segment()]))).toBeNull();
  });
});
