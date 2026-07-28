/**
 * TEST: chartMovementDigest (latest-vs-previous movement core)
 * PURPOSE: Honest deltas from real points only; direction-aware "improved" only for metrics
 *   with a known good direction; neutral metrics never get a good/bad verdict; thin series
 *   are excluded; a change that rounds to zero is flat (no signed-zero, no false improvement).
 */

import { describe, expect, it } from 'vitest';
import { buildMovementDigest } from './chartMovementDigest';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';

const pts = (ys: number[]) => ys.map((y, i) => ({ x: `W${i + 1}`, y }));
const bundle = (p: Partial<Record<string, ReturnType<typeof pts>>>) => p as unknown as CanonicalProgressCharts;

const rowFor = (charts: CanonicalProgressCharts, key: string) =>
  buildMovementDigest(charts).rows.find((r) => r.key === key);

describe('buildMovementDigest', () => {
  it('reports an up-good metric that rose as improved with the right delta', () => {
    const r = rowFor(bundle({ workoutFrequency: pts([3, 5]) }), 'workoutFrequency');
    expect(r).toMatchObject({ latest: 5, previous: 3, delta: 2, direction: 'up', improved: true });
    expect(r?.pctChange).toBeCloseTo(66.7, 1); // 2/3 * 100
  });

  it('treats lower Body Fat as improvement (down-good) and a rise as worse', () => {
    expect(rowFor(bundle({ bodyFatTrend: pts([22, 20] as number[]) }), 'bodyFatTrend'))
      .toMatchObject({ delta: -2, direction: 'down', improved: true, unit: '%' });
    expect(rowFor(bundle({ bodyFatTrend: pts([20, 22]) }), 'bodyFatTrend'))
      .toMatchObject({ direction: 'up', improved: false });
  });

  it('never judges a neutral metric (weight/intensity/duration) as good or bad', () => {
    expect(rowFor(bundle({ weightTrend: pts([180, 185]) }), 'weightTrend')?.improved).toBeNull();
    expect(rowFor(bundle({ intensityRpeTrend: pts([6, 8]) }), 'intensityRpeTrend')?.improved).toBeNull();
  });

  it('excludes a metric with fewer than two finite points', () => {
    expect(rowFor(bundle({ weeklyVolume: pts([500]) }), 'weeklyVolume')).toBeUndefined();
    // non-finite y filtered before the count
    expect(rowFor(bundle({ weeklyVolume: [{ x: 'W1', y: 500 }, { x: 'W2', y: Number.NaN }] as never }), 'weeklyVolume')).toBeUndefined();
  });

  it('treats a change that rounds to zero as flat/neutral with no signed-zero', () => {
    const r = rowFor(bundle({ weightTrend: pts([180.02, 180.03]) }), 'weightTrend');
    expect(r?.direction).toBe('flat');
    expect(r?.improved).toBeNull();
    expect(Object.is(r?.delta, -0)).toBe(false);
    expect(r?.delta).toBe(0);
  });

  it('lists movers before flat rows and counts what moved', () => {
    const digest = buildMovementDigest(bundle({
      workoutFrequency: pts([2, 2]),      // flat
      weeklyVolume: pts([400, 600]),      // moved
      bodyFatTrend: pts([20, 19]),        // moved
    }));
    expect(digest.metricsMoved).toBe(2);
    // the two movers come before the flat one
    expect(digest.rows[digest.rows.length - 1].direction).toBe('flat');
    expect(digest.rows.slice(0, 2).every((r) => r.direction !== 'flat')).toBe(true);
  });

  it('returns hasData false and no rows when nothing qualifies', () => {
    const digest = buildMovementDigest(bundle({ workoutFrequency: pts([4]) }));
    expect(digest.hasData).toBe(false);
    expect(digest.rows).toHaveLength(0);
    expect(digest.metricsMoved).toBe(0);
  });

  it('sets pctChange null when the previous value is zero (no divide-by-zero fabrication)', () => {
    const r = rowFor(bundle({ workoutFrequency: pts([0, 3]) }), 'workoutFrequency');
    expect(r?.delta).toBe(3);
    expect(r?.pctChange).toBeNull();
  });
});
