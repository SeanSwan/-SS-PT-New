/**
 * TEST: correlationInsights (the honest correlation core)
 * PURPOSE: Pearson r over shared-x points, with guards so noise / flat series / thin
 *   overlap never produce a fabricated relationship. Correlation, not causation.
 */

import { describe, expect, it } from 'vitest';
import { computeCorrelations, topCorrelation, type MetricSeries } from './correlationInsights';

const s = (key: string, ys: number[]): MetricSeries => ({
  key, label: key,
  points: ys.map((y, i) => ({ x: `W${i + 1}`, y })),
});

describe('computeCorrelations', () => {
  it('finds a perfect positive relationship (moves together)', () => {
    const out = computeCorrelations([s('volume', [1, 2, 3, 4]), s('oneRm', [2, 4, 6, 8])]);
    expect(out).toHaveLength(1);
    expect(out[0].r).toBeCloseTo(1);
    expect(out[0].strength).toBe('strong');
    expect(out[0].direction).toBe('together');
    expect(out[0].sampleSize).toBe(4);
  });

  it('finds a perfect inverse relationship', () => {
    const out = computeCorrelations([s('volume', [1, 2, 3, 4]), s('bodyFat', [4, 3, 2, 1])]);
    expect(out[0].r).toBeCloseTo(-1);
    expect(out[0].direction).toBe('inverse');
  });

  it('yields NO insight for a flat (zero-variance) series - not a fake correlation', () => {
    const out = computeCorrelations([s('volume', [1, 2, 3, 4]), s('recovery', [10, 10, 10, 10])]);
    expect(out).toHaveLength(0);
  });

  it('drops pairs below the |r| threshold (weak = noise)', () => {
    // near-zero correlation
    const out = computeCorrelations([s('a', [1, 2, 3, 4, 5, 6]), s('b', [3, 1, 4, 1, 5, 2])], { minAbsR: 0.5 });
    expect(out).toHaveLength(0);
  });

  it('requires enough shared points (thin overlap is dropped)', () => {
    const a: MetricSeries = { key: 'a', label: 'a', points: [{ x: 'W1', y: 1 }, { x: 'W2', y: 2 }, { x: 'W3', y: 3 }, { x: 'W4', y: 4 }, { x: 'W5', y: 5 }] };
    const b: MetricSeries = { key: 'b', label: 'b', points: [{ x: 'W3', y: 3 }, { x: 'W4', y: 4 }, { x: 'W5', y: 5 }, { x: 'W6', y: 6 }] }; // only W3-W5 shared = 3
    expect(computeCorrelations([a, b], { minOverlap: 4 })).toHaveLength(0);
  });

  it('correlates ONLY the shared-x points (honest alignment)', () => {
    const a: MetricSeries = { key: 'a', label: 'a', points: [{ x: 'W1', y: 100 }, { x: 'W2', y: 1 }, { x: 'W3', y: 2 }, { x: 'W4', y: 3 }, { x: 'W5', y: 4 }] };
    const b: MetricSeries = { key: 'b', label: 'b', points: [{ x: 'W2', y: 2 }, { x: 'W3', y: 4 }, { x: 'W4', y: 6 }, { x: 'W5', y: 8 }] }; // shares W2-W5 (y 1,2,3,4 vs 2,4,6,8) = r 1
    const out = computeCorrelations([a, b]);
    expect(out[0].r).toBeCloseTo(1);
    expect(out[0].sampleSize).toBe(4); // W1 (unshared) excluded
  });

  it('ranks strongest first and topCorrelation returns it', () => {
    const out = computeCorrelations([
      s('vol', [1, 2, 3, 4, 5]),
      s('rm', [2, 4, 6, 8, 10]),   // r=1 with vol
      s('dur', [1, 2, 2, 3, 5]),   // weaker-but-positive with vol
    ]);
    expect(Math.abs(out[0].r)).toBeGreaterThanOrEqual(Math.abs(out[out.length - 1].r));
    expect(topCorrelation([s('vol', [1, 2, 3, 4]), s('rm', [2, 4, 6, 8])])!.r).toBeCloseTo(1);
    expect(topCorrelation([s('flat', [5, 5, 5, 5])])).toBeNull(); // single series -> no pair
  });
});
