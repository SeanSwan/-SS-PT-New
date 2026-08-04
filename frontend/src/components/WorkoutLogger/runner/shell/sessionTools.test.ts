/**
 * Feature batch 4 — trainer-floor math laws.
 */
import { describe, expect, it } from 'vitest';
import {
  buildWarmupRamp,
  diffNewPRs,
  formatPlateBreakdown,
  plateBreakdown,
} from './sessionTools';

describe('plateBreakdown — the 40×-a-session math', () => {
  it('225 = plate per side', () => {
    expect(plateBreakdown(225)).toEqual({ perSide: [45, 45], remainder: 0, belowBar: false });
  });

  it('205 = 45+35 per side (greedy = fewest plates to load)', () => {
    expect(plateBreakdown(205).perSide).toEqual([45, 35]);
  });

  it('greedy across every standard plate: 187.5 → 45+25+1×... exact', () => {
    const { perSide, remainder } = plateBreakdown(190);
    expect(perSide).toEqual([45, 25, 2.5]);
    expect(remainder).toBe(0);
  });

  it('at or below the bar → belowBar, never negative plates', () => {
    expect(plateBreakdown(45).belowBar).toBe(true);
    expect(plateBreakdown(30).belowBar).toBe(true);
  });

  it('unbuildable remainder is reported honestly, never silently dropped', () => {
    const { perSide, remainder } = plateBreakdown(48); // 1.5/side
    expect(perSide).toEqual([]);
    expect(remainder).toBe(1.5);
  });

  it('formatting: stack / side, bar-only, and remainder note', () => {
    expect(formatPlateBreakdown(205)).toBe('45+35 / side');
    expect(formatPlateBreakdown(230)).toBe('45+45+2.5 / side');
    expect(formatPlateBreakdown(45)).toBeNull(); // the bar itself → no math
    expect(formatPlateBreakdown(47)).toBe('bar (45) +1 / side'); // unbuildable but honest
    expect(formatPlateBreakdown(50)).toBe('2.5 / side');
    expect(formatPlateBreakdown(30)).toBeNull();
  });
});

describe('buildWarmupRamp — 40/60/80 to the nearest 5', () => {
  it('225 top → 90×10, 135×6, 180×3', () => {
    expect(buildWarmupRamp(225)).toEqual([
      { weight: 90, reps: 10 },
      { weight: 135, reps: 6 },
      { weight: 180, reps: 3 },
    ]);
  });

  it('light top sets collapse duplicates and never meet/exceed the top', () => {
    const ramp = buildWarmupRamp(20);
    expect(ramp.length).toBeLessThanOrEqual(2);
    for (const set of ramp) expect(set.weight).toBeLessThan(20);
    const weights = ramp.map((set) => set.weight);
    expect(new Set(weights).size).toBe(weights.length);
  });

  it('zero/garbage → empty, never NaN sets', () => {
    expect(buildWarmupRamp(0)).toEqual([]);
    expect(buildWarmupRamp(Number.NaN)).toEqual([]);
  });
});

describe('diffNewPRs — the toast fires once, on genuinely new ground', () => {
  const pr = (exerciseName: string, type: 'weight' | 'volume', value: number) =>
    ({ exerciseName, type, value, label: `${value}` });

  it('brand-new PR appears', () => {
    expect(diffNewPRs([], [pr('Bench', 'weight', 105)])).toHaveLength(1);
  });

  it('unchanged PR does NOT re-fire', () => {
    expect(diffNewPRs([pr('Bench', 'weight', 105)], [pr('Bench', 'weight', 105)])).toHaveLength(0);
  });

  it('improved value re-fires; sibling types are independent', () => {
    const out = diffNewPRs(
      [pr('Bench', 'weight', 105)],
      [pr('Bench', 'weight', 110), pr('Bench', 'volume', 2400)],
    );
    expect(out).toHaveLength(2);
  });
});
