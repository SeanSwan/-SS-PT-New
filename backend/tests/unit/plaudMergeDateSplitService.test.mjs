/**
 * PLAUD merge date-split adapter tests.
 * ====================================
 * Locks the review-path adapter that exposes deterministic workout-date cards
 * from decrypted merge payloads without adding new log-write behavior.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildPlaudMergeDateSplitCandidates,
} from '../../services/plaudMergeDateSplitService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REQUESTS_CTRL_SRC = readFileSync(
  resolve(__dirname, '../../controllers/plaud/plaudMergeRequestsController.mjs'), 'utf8',
);

describe('buildPlaudMergeDateSplitCandidates', () => {
  it('anchors relative transcript dates to the earliest clip timeline upload', () => {
    const result = buildPlaudMergeDateSplitCandidates({
      payload: {
        transcript: [
          'Today: bench press and rows.',
          'Yesterday: lower body accessory work.',
        ].join('\n'),
        clipTimeline: [
          { uploadedAt: '2026-05-05T20:07:00.000Z' },
          { uploadedAt: '2026-05-05T20:01:00.000Z' },
        ],
      },
      row: { created_at: '2026-05-06T02:00:00.000Z' },
      timeZone: 'America/Los_Angeles',
    });

    expect(result).toMatchObject({
      referenceDate: '2026-05-05',
      referenceSource: 'clip_timeline_uploaded_at',
      segmentCount: 2,
    });
    expect(result.segments.map((segment) => segment.date)).toEqual([
      '2026-05-05',
      '2026-05-04',
    ]);
  });

  it('prefers recordedAt metadata when a future clip timeline starts providing it', () => {
    const result = buildPlaudMergeDateSplitCandidates({
      payload: {
        transcript: 'Today: deadlifts and split squats.',
        clipTimeline: [
          {
            recordedAt: '2026-05-04T18:00:00.000Z',
            uploadedAt: '2026-05-05T20:00:00.000Z',
          },
        ],
      },
      row: { created_at: '2026-05-05T21:00:00.000Z' },
    });

    expect(result).toMatchObject({
      referenceDate: '2026-05-04',
      referenceSource: 'clip_timeline_recorded_at',
    });
    expect(result.segments[0].date).toBe('2026-05-04');
  });

  it('falls back to merge row time when clip timeline metadata is absent', () => {
    const result = buildPlaudMergeDateSplitCandidates({
      payload: { transcript: 'No explicit date in this transcript.', clipTimeline: [] },
      row: { completed_at: null, created_at: '2026-05-03T18:00:00.000Z' },
    });

    expect(result).toMatchObject({
      referenceDate: '2026-05-03',
      referenceSource: 'merge_request_created_at',
      needsDateReviewCount: 1,
    });
  });

  it('falls back to the default timezone when a caller provides an invalid timezone', () => {
    const result = buildPlaudMergeDateSplitCandidates({
      payload: { transcript: 'Today: chest work.', clipTimeline: [] },
      row: { created_at: '2026-05-03T18:00:00.000Z' },
      timeZone: 'Not/A_Timezone',
    });

    expect(result.timeZone).toBe('America/Los_Angeles');
    expect(result.segments[0].date).toBe('2026-05-03');
  });
});

describe('PLAUD merge detail controller date-split contract', () => {
  it('returns deterministic dateSplitCandidates from the decrypted detail payload', () => {
    expect(REQUESTS_CTRL_SRC).toMatch(/buildPlaudMergeDateSplitCandidates/);
    expect(REQUESTS_CTRL_SRC).toMatch(/dateSplitCandidates/);
  });
});
