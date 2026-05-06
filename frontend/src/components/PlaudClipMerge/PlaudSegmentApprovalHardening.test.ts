/**
 * PLAUD segment approval hardening locks
 * ======================================
 * Regression guards for split-workout approval safety behavior.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isSegmentDateOverrideFuture,
  isSegmentReadyForApproval,
  isValidSegmentDateOverride,
} from './PlaudMergeReview.helpers';
import type { PlaudDateSplitSegment } from '../../services/plaudMergeService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REVIEW_SRC = readFileSync(resolve(__dirname, 'PlaudMergeReview.tsx'), 'utf8');
const WORKSPACE_SRC = readFileSync(resolve(__dirname, 'PlaudMergeWorkspace.tsx'), 'utf8');

describe('PLAUD split approval hardening', () => {
  it('rejects ISO-looking values that are not real calendar dates', () => {
    expect(isValidSegmentDateOverride('2026-02-28')).toBe(true);
    expect(isValidSegmentDateOverride('2026-02-31')).toBe(false);
    expect(isValidSegmentDateOverride('2026-13-01')).toBe(false);
    expect(isValidSegmentDateOverride('2026-00-01')).toBe(false);
    expect(isValidSegmentDateOverride('2026-01-32')).toBe(false);
    expect(isValidSegmentDateOverride('2026-1-02')).toBe(false);
  });

  it('only compares future dates after both dates pass strict validation', () => {
    expect(isSegmentDateOverrideFuture('2026-05-07', '2026-05-06')).toBe(true);
    expect(isSegmentDateOverrideFuture('2026-05-06', '2026-05-06')).toBe(false);
    expect(isSegmentDateOverrideFuture('2026-02-31', '2026-05-06')).toBe(false);
    expect(isSegmentDateOverrideFuture('2026-05-07', '2026-99-99')).toBe(false);
  });

  it('fails closed when a date-confirmed segment has no real reference date', () => {
    const segment = {
      segmentId: 'segment-1',
      date: '2026-05-06',
      referenceDate: '2026-99-99',
      futureDateBlocked: true,
      needsDateConfirmation: true,
    } as PlaudDateSplitSegment;
    expect(isSegmentReadyForApproval(segment, '2026-05-06')).toBe(false);
  });

  it('keys the review component by mergeRequestId so split state cannot leak across reviews', () => {
    expect(WORKSPACE_SRC).toMatch(/key=\{reviewState\.mergeRequestId\}/);
  });

  it('checks the in-flight approval ref before segment parse network calls', () => {
    expect(REVIEW_SRC).toMatch(/currentApproval\?\.status\s*===\s*'parsing'/);
    expect(REVIEW_SRC).toMatch(/currentApproval\?\.status\s*===\s*'logged'/);
    expect(REVIEW_SRC.indexOf('currentApproval')).toBeLessThan(
      REVIEW_SRC.indexOf('const parsed = await parseMergeRequestSegment'),
    );
  });
});
