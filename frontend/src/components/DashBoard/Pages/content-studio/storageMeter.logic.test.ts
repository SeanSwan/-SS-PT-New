/**
 * storageMeter.logic.test.ts — pure formatting + cost-projection contract.
 */
import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatUsd,
  averageObjectBytes,
  perClipMonthlyUsd,
  costTier,
  clipsUntilUsd,
  headroomHint,
  parseStorageUsage,
  R2_USD_PER_GB_MONTH,
  COST_TIER_WATCH_USD,
  COST_TIER_HIGH_USD,
  type StorageUsage,
} from './storageMeter.logic';

const GB = 1024 ** 3;
const usage = (over: Partial<StorageUsage> = {}): StorageUsage => ({
  totalBytes: 0, objectCount: 0, estMonthlyUsd: 0, ...over,
});

describe('formatBytes', () => {
  it('floors junk/negatives to 0 B and never shows fractional bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(NaN)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
  });
  it('scales up units with the requested precision', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(2.5 * GB)).toBe('2.5 GB');
  });
});

describe('formatUsd', () => {
  it('clamps non-positive to $0.00 and shows <$0.01 for tiny non-zero bills', () => {
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(-1)).toBe('$0.00');
    expect(formatUsd(0.004)).toBe('<$0.01');
    expect(formatUsd(1.2)).toBe('$1.20');
  });
});

describe('averageObjectBytes', () => {
  it('returns null when there is nothing to average', () => {
    expect(averageObjectBytes(usage())).toBeNull();
    expect(averageObjectBytes(usage({ totalBytes: 100, objectCount: 0 }))).toBeNull();
  });
  it('divides total by count', () => {
    expect(averageObjectBytes(usage({ totalBytes: 1000, objectCount: 4 }))).toBe(250);
  });
});

describe('perClipMonthlyUsd', () => {
  it('prices one average clip at the R2 GB-month rate', () => {
    const u = usage({ totalBytes: 2 * GB, objectCount: 2 }); // avg 1 GB
    expect(perClipMonthlyUsd(u)).toBeCloseTo(R2_USD_PER_GB_MONTH, 6);
  });
  it('is null with no objects', () => {
    expect(perClipMonthlyUsd(usage())).toBeNull();
  });
});

describe('costTier', () => {
  it('thresholds ok/watch/high around the named constants', () => {
    expect(costTier(0)).toBe('ok');
    expect(costTier(COST_TIER_WATCH_USD - 0.01)).toBe('ok');
    expect(costTier(COST_TIER_WATCH_USD)).toBe('watch');
    expect(costTier(COST_TIER_HIGH_USD - 0.01)).toBe('watch');
    expect(costTier(COST_TIER_HIGH_USD)).toBe('high');
    expect(costTier(NaN)).toBe('ok');
  });
});

describe('clipsUntilUsd', () => {
  it('floors the count of additional average clips before the target bill', () => {
    // avg 1 GB clip = $0.015/mo; currently $0/mo; target $3 -> 200 clips
    const u = usage({ totalBytes: 1 * GB, objectCount: 1, estMonthlyUsd: 0 });
    expect(clipsUntilUsd(u, 3)).toBe(200);
  });
  it('returns null when already at/over target or no projection', () => {
    expect(clipsUntilUsd(usage(), 3)).toBeNull();
    expect(clipsUntilUsd(usage({ totalBytes: GB, objectCount: 1, estMonthlyUsd: 5 }), 3)).toBeNull();
  });
});

describe('headroomHint', () => {
  it('returns null with no data', () => {
    expect(headroomHint(usage())).toBeNull();
  });
  it('describes per-clip cost and remaining headroom', () => {
    const hint = headroomHint(usage({ totalBytes: 20 * 1024 * 1024, objectCount: 1, estMonthlyUsd: 0 }));
    expect(hint).toContain('Each clip ≈ 20.0 MB');
    expect(hint).toContain('/mo');
    expect(hint).toContain('room for ~');
  });
});

describe('parseStorageUsage', () => {
  it('rejects malformed payloads', () => {
    expect(parseStorageUsage(null)).toBeNull();
    expect(parseStorageUsage('nope')).toBeNull();
    expect(parseStorageUsage({ totalBytes: 'x', objectCount: 1, estMonthlyUsd: 1 })).toBeNull();
  });
  it('normalizes and clamps a valid payload', () => {
    expect(parseStorageUsage({ totalBytes: -10, objectCount: 3, estMonthlyUsd: 0.5 }))
      .toEqual({ totalBytes: 0, objectCount: 3, estMonthlyUsd: 0.5 });
  });
});
