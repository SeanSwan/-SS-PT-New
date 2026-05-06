/**
 * PLAUD transcript splitter service tests.
 * =======================================
 * Locks the deterministic pre-AI step that turns one merged transcript into
 * date-scoped workout candidates. Swan Coach can interpret exercises later,
 * but date anchoring and future-date blocking stay deterministic.
 */
import { describe, expect, it } from 'vitest';

import {
  splitPlaudTranscriptIntoWorkoutCandidates,
} from '../../services/plaudTranscriptSplitterService.mjs';

const BASE_CONTEXT = {
  referenceIso: '2026-05-05T20:00:00.000Z',
  timeZone: 'America/Los_Angeles',
  referenceSource: 'recorded_at',
};

describe('splitPlaudTranscriptIntoWorkoutCandidates', () => {
  it('splits today and yesterday against the recording reference date', () => {
    const result = splitPlaudTranscriptIntoWorkoutCandidates({
      transcript: [
        'Today: bench press 135 for 10, 155 for 8.',
        'Cable rows 3 sets of 12.',
        'Yesterday: squat 185 for 5 and lunges.',
      ].join('\n'),
      ...BASE_CONTEXT,
    });

    expect(result).toMatchObject({
      referenceDate: '2026-05-05',
      timeZone: 'America/Los_Angeles',
      segmentCount: 2,
      needsDateReviewCount: 0,
      futureDateBlockedCount: 0,
    });
    expect(result.segments.map((segment) => segment.date)).toEqual([
      '2026-05-05',
      '2026-05-04',
    ]);
    expect(result.segments[0]).toMatchObject({
      dateSource: 'phrase:today',
      dateConfidence: 'high',
      needsDateConfirmation: false,
      futureDateBlocked: false,
      startLine: 1,
      endLine: 2,
    });
    expect(result.segments[1]).toMatchObject({
      dateSource: 'phrase:yesterday',
      startLine: 3,
      endLine: 3,
    });
  });

  it('resolves last weekday phrases from the trainer timezone reference date', () => {
    const result = splitPlaudTranscriptIntoWorkoutCandidates({
      transcript: 'Last Tuesday: deadlifts, hamstring curls, and core work.',
      referenceIso: '2026-05-06T19:00:00.000Z',
      timeZone: 'America/Los_Angeles',
      referenceSource: 'uploaded_at',
    });

    expect(result.referenceDate).toBe('2026-05-06');
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toMatchObject({
      date: '2026-05-05',
      dateSource: 'phrase:last_weekday',
      evidence: 'Last Tuesday',
      needsDateConfirmation: false,
      referenceSource: 'uploaded_at',
    });
  });

  it('blocks future explicit dates instead of treating them as ready to log', () => {
    const result = splitPlaudTranscriptIntoWorkoutCandidates({
      transcript: '2026-05-08: planned leg day, do not log yet.',
      ...BASE_CONTEXT,
    });

    expect(result.futureDateBlockedCount).toBe(1);
    expect(result.needsDateReviewCount).toBe(1);
    expect(result.segments[0]).toMatchObject({
      date: '2026-05-08',
      dateSource: 'explicit:iso',
      futureDateBlocked: true,
      needsDateConfirmation: true,
      dateConfidence: 'blocked_future',
    });
  });

  it('marks impossible explicit dates as invalid-date review candidates', () => {
    const result = splitPlaudTranscriptIntoWorkoutCandidates({
      transcript: '2026-02-30: impossible calendar date from transcript.',
      ...BASE_CONTEXT,
    });

    expect(result.segments[0]).toMatchObject({
      date: '2026-05-05',
      dateSource: 'invalid_date',
      needsDateConfirmation: true,
      dateConfidence: 'invalid_date',
    });
  });

  it('keeps no-date transcripts as low-confidence reference-date candidates', () => {
    const result = splitPlaudTranscriptIntoWorkoutCandidates({
      transcript: 'Bench press 135 for 10. Finished with rows and curls.',
      ...BASE_CONTEXT,
    });

    expect(result).toMatchObject({
      segmentCount: 1,
      needsDateReviewCount: 1,
      futureDateBlockedCount: 0,
    });
    expect(result.segments[0]).toMatchObject({
      date: '2026-05-05',
      dateSource: 'reference_timeline',
      dateConfidence: 'low',
      needsDateConfirmation: true,
      evidence: null,
    });
  });

  it('does not split on loose same-date language inside an existing segment', () => {
    const result = splitPlaudTranscriptIntoWorkoutCandidates({
      transcript: [
        'Today: chest and back.',
        'Energy today was better after the first two sets.',
        'Incline press and pull-downs.',
      ].join('\n'),
      ...BASE_CONTEXT,
    });

    expect(result.segmentCount).toBe(1);
    expect(result.segments[0]).toMatchObject({
      startLine: 1,
      endLine: 3,
      date: '2026-05-05',
    });
  });

  it('parses slash dates only when they look like session markers', () => {
    const result = splitPlaudTranscriptIntoWorkoutCandidates({
      transcript: [
        '5/4: shoulder session.',
        '3/10 reps was just a performance note, not a date.',
      ].join('\n'),
      ...BASE_CONTEXT,
    });

    expect(result.segmentCount).toBe(1);
    expect(result.segments[0]).toMatchObject({
      date: '2026-05-04',
      dateSource: 'explicit:us_date',
      startLine: 1,
      endLine: 2,
    });
  });
});
