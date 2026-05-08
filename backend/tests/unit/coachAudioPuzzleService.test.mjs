import { describe, expect, it } from 'vitest';

import {
  buildAudioPuzzlePlan,
  summarizeAudioPuzzleForContext,
} from '../../services/coachAudioPuzzleService.mjs';

describe('coachAudioPuzzleService', () => {
  it('orders clips by recording time and groups adjacent same-session pieces', () => {
    const plan = buildAudioPuzzlePlan([
      {
        id: 'clip-late',
        recordedAtStart: '2026-05-06T18:09:00.000Z',
        uploadedAt: '2026-05-06T19:02:00.000Z',
        sourceBatchId: 'batch-1',
        candidateClientTokens: ['C1'],
        exerciseTags: ['squat', 'lunge'],
      },
      {
        id: 'clip-early',
        recordedAtStart: '2026-05-06T18:05:00.000Z',
        uploadedAt: '2026-05-06T19:03:00.000Z',
        sourceBatchId: 'batch-1',
        candidateClientTokens: ['C1'],
        exerciseTags: ['squat', 'hinge'],
      },
    ]);

    expect(plan.orderedArtifactIds).toEqual(['clip-early', 'clip-late']);
    expect(plan.bundles).toHaveLength(1);
    expect(plan.bundles[0]).toMatchObject({
      artifactIds: ['clip-early', 'clip-late'],
      decision: 'auto_bundle',
      needsReview: false,
    });
    expect(plan.bundles[0].score).toBeGreaterThanOrEqual(0.78);
    expect(plan.bundles[0].evidence).toContain('recorded_gap:4m');
  });

  it('does not over-group same-batch clips when timestamps and client hints disagree', () => {
    const plan = buildAudioPuzzlePlan([
      {
        id: 'clip-one',
        recordedAtStart: '2026-05-06T12:00:00.000Z',
        sourceBatchId: 'batch-1',
        candidateClientTokens: ['C1'],
        exerciseTags: ['press'],
      },
      {
        id: 'clip-two',
        recordedAtStart: '2026-05-06T15:20:00.000Z',
        sourceBatchId: 'batch-1',
        candidateClientTokens: ['C2'],
        exerciseTags: ['row'],
      },
    ]);

    expect(plan.bundles).toHaveLength(2);
    expect(plan.needsOrderingReview).toBe(false);
    expect(plan.pairDecisions[0]).toMatchObject({
      leftId: 'clip-one',
      rightId: 'clip-two',
      decision: 'separate',
    });
    expect(plan.pairDecisions[0].score).toBeLessThan(0.55);
  });

  it('returns only compact non-PII puzzle facts for Coach context', () => {
    const plan = buildAudioPuzzlePlan([
      {
        id: 'clip-private-name',
        displayName: 'Marcus private session note',
        manualOrder: 2,
        sourceBatchId: 'batch-private',
      },
      {
        id: 'clip-other-private-name',
        displayName: 'Alicia back workout',
        manualOrder: 1,
        sourceBatchId: 'batch-private',
      },
    ]);
    const summary = summarizeAudioPuzzleForContext(plan);
    const serialized = JSON.stringify(summary);

    expect(summary).toMatchObject({
      pieceCount: 2,
      bundleCount: 2,
      needsOrderingReview: true,
      confidence: 'low',
    });
    expect(serialized).not.toMatch(/Marcus|Alicia|private|session note/i);
  });
});
