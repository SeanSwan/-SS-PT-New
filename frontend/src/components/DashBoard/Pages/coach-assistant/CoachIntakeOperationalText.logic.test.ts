import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  holdReasonFacts,
  safeAttachmentSourceLabel,
  safeAudioReviewPlanRationale,
  safeCommandActionLabel,
  safeTranscriptFailureReason,
} from './CoachIntakeOperationalText.logic';

describe('CoachIntakeOperationalText PII-safe helper contract', () => {
  it('keeps transcript failures generic and does not echo raw user text', () => {
    expect(safeTranscriptFailureReason('no_client', 'Sean private note')).toBe(
      'Select a client at the top of the page before uploading a transcript.',
    );
    expect(safeTranscriptFailureReason('server', 'client email leaked@example.com')).toBe(
      'The transcript could not be accepted. Check the file format and try again.',
    );
  });

  it('allows only safe operational labels and attachment categories', () => {
    expect(safeAudioReviewPlanRationale('2 pieces across 1 bundles need order review before Swan Coach drafts a workout log.')).toBe(
      '2 pieces across 1 bundles need order review before Swan Coach drafts a workout log.',
    );
    expect(safeAudioReviewPlanRationale('Call Sean at 555-1234')).toBeNull();
    expect(safeAttachmentSourceLabel('private-client-name-workout.mp3')).toBe('Audio item');
    expect(safeAttachmentSourceLabel('private-client-name-notes.pdf')).toBe('Transcript file');
  });

  it('normalizes legacy prompt-only action labels to simplified operator labels', () => {
    expect(safeCommandActionLabel('Ask Coach to resolve client')).toBe('Resolve client hold');
    expect(safeCommandActionLabel('Ask Coach about this intake')).toBe('Review intake');
    expect(safeCommandActionLabel('Resolve client hold')).toBe('Resolve client hold');
    expect(safeCommandActionLabel('Email Marcus private@example.com')).toBeNull();
  });
  it('normalizes hold-reason facts without retaining unsafe text', () => {
    expect(
      holdReasonFacts({
        nextHoldReasonCandidateCount: 2,
        nextHoldReasonDuplicateCount: 1,
        nextHoldReasonConfidenceBand: 'high',
        unsafeNote: 'client private note',
      }),
    ).toEqual(['2 candidates', '1 possible match', 'High confidence']);
  });

  it('keeps the shared operational text helper under the project file cap', () => {
    const source = readFileSync(resolve(__dirname, 'CoachIntakeOperationalText.logic.ts'), 'utf8');

    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
