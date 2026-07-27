/**
 * TEST: ghostSelf (Your Journey overlay logic)
 * PURPOSE: Split a real series into faded past / vivid present, surface the personal
 *   best, and a direction-aware "since you started" delta - inventing nothing.
 */

import { describe, expect, it } from 'vitest';
import { buildGhostSelf } from './ghostSelf';

describe('buildGhostSelf', () => {
  it('returns null when there is not enough history to tell a story', () => {
    expect(buildGhostSelf([], { unit: 'lbs' })).toBeNull();
    expect(buildGhostSelf([{ x: 'W1', y: 100 }, { x: 'W2', y: 110 }, { x: 'W3', y: 120 }], { unit: 'lbs' }))
      .toBeNull(); // 3 < minPoints (4)
  });

  it('splits into faded past + vivid present with a shared join point', () => {
    const j = buildGhostSelf(
      [{ x: 'W1', y: 100 }, { x: 'W2', y: 110 }, { x: 'W3', y: 120 }, { x: 'W4', y: 130 }],
      { unit: 'lbs' },
    );
    expect(j).not.toBeNull();
    expect(j!.ghost).toEqual([{ x: 'W1', y: 100 }, { x: 'W2', y: 110 }]);
    expect(j!.current).toEqual([{ x: 'W2', y: 110 }, { x: 'W3', y: 120 }, { x: 'W4', y: 130 }]);
    // the split point W2 belongs to both -> continuous line
    expect(j!.ghost[j!.ghost.length - 1]).toEqual(j!.current[0]);
  });

  it('reports the best point and a direction-aware delta (higher-is-better)', () => {
    const j = buildGhostSelf(
      [{ x: 'W1', y: 100 }, { x: 'W2', y: 130 }, { x: 'W3', y: 115 }, { x: 'W4', y: 125 }],
      { unit: 'lbs', higherIsBetter: true },
    )!;
    expect(j.bestPoint).toEqual({ x: 'W2', y: 130 }); // max
    expect(j.startDeltaLabel).toBe('+25 lbs since W1'); // 125 - 100
    expect(j.improved).toBe(true);
  });

  it('inverts direction + keeps a decimal for a lower-is-better fractional metric', () => {
    const j = buildGhostSelf(
      [{ x: 'W1', y: 25 }, { x: 'W2', y: 22 }, { x: 'W3', y: 20 }, { x: 'W4', y: 18.4 }],
      { unit: '%', higherIsBetter: false },
    )!;
    expect(j.bestPoint).toEqual({ x: 'W4', y: 18.4 }); // min (best for lower-is-better)
    expect(j.startDeltaLabel).toBe('-6.6 % since W1'); // 18.4 - 25 = -6.6
    expect(j.improved).toBe(true); // going down is an improvement here
  });

  it('renders a clean zero (no "-0", no false improvement) for a sub-rounding change', () => {
    const j = buildGhostSelf(
      [{ x: 'W1', y: 15.02 }, { x: 'W2', y: 15.0 }, { x: 'W3', y: 15.01 }, { x: 'W4', y: 15.0 }],
      { unit: '%', higherIsBetter: false },
    )!;
    expect(j.startDeltaLabel).toBe('0 % since W1'); // -0.02 rounds to 0, no leading sign
    expect(j.improved).toBe(false);
  });

  it('drops non-finite points before splitting', () => {
    const j = buildGhostSelf(
      [{ x: 'W1', y: 100 }, { x: 'W2', y: Number.NaN }, { x: 'W3', y: 120 }, { x: 'W4', y: 130 }, { x: 'W5', y: 140 }],
      { unit: 'lbs' },
    )!;
    expect(j.ghost.concat(j.current.slice(1)).every((p) => Number.isFinite(p.y))).toBe(true);
    expect(j.latestPoint).toEqual({ x: 'W5', y: 140 });
  });
});
