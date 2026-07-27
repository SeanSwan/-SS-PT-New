/**
 * MODULE: correlationInsights
 * PURPOSE: The honest core of the "Metric Constellation" - find which of a client's OWN
 *   logged metrics move together. Computes pairwise Pearson correlation between real
 *   series, aligned on their shared x (time points), with guards so noise never reads as
 *   a relationship.
 * DATA POLICY: correlation, NOT causation. Uses only overlapping verified points; a pair
 *   with too little overlap, or a flat (zero-variance) series, yields NO insight rather
 *   than a fabricated one. Consumers MUST label results as "move together", never "causes".
 */

export interface CorrPoint {
  x: string | number;
  y: number;
}

export interface MetricSeries {
  key: string;
  label: string;
  points: ReadonlyArray<CorrPoint>;
}

export type CorrelationStrength = 'strong' | 'moderate';
export type CorrelationDirection = 'together' | 'inverse';

export interface CorrelationInsight {
  aKey: string;
  aLabel: string;
  bKey: string;
  bLabel: string;
  /** Pearson r, clamped to [-1, 1]. */
  r: number;
  strength: CorrelationStrength;
  direction: CorrelationDirection;
  /** Number of overlapping (shared-x) points the r was computed from. */
  sampleSize: number;
}

interface CorrelationOptions {
  /** Minimum shared points before a correlation is trustworthy (default 4). */
  minOverlap?: number;
  /** Minimum |r| to report at all (default 0.5 = moderate+). */
  minAbsR?: number;
}

/** Pearson r over aligned pairs, or null when it is undefined (n<2 or a flat series). */
const pearson = (pairs: ReadonlyArray<readonly [number, number]>): number | null => {
  const n = pairs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of pairs) {
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
  }
  const cov = sxy - (sx * sy) / n;
  const varX = sxx - (sx * sx) / n;
  const varY = syy - (sy * sy) / n;
  const denom = Math.sqrt(varX * varY);
  if (!Number.isFinite(denom) || denom === 0) return null; // flat series -> no relationship
  return Math.max(-1, Math.min(1, cov / denom));
};

/** Pairs of y-values where the two series share the same x, in A's order. */
const alignByX = (a: ReadonlyArray<CorrPoint>, b: ReadonlyArray<CorrPoint>): Array<readonly [number, number]> => {
  const bByX = new Map<string, number>();
  for (const p of b) {
    if (Number.isFinite(p.y) && p.x !== null && p.x !== undefined) bByX.set(String(p.x), p.y);
  }
  const pairs: Array<readonly [number, number]> = [];
  for (const p of a) {
    if (!Number.isFinite(p.y) || p.x === null || p.x === undefined) continue;
    const key = String(p.x);
    if (bByX.has(key)) pairs.push([p.y, bByX.get(key) as number]);
  }
  return pairs;
};

/**
 * Ranked pairwise correlations (strongest |r| first) among the given metric series.
 * Only pairs with >= minOverlap shared points and |r| >= minAbsR are returned.
 */
export const computeCorrelations = (
  series: ReadonlyArray<MetricSeries>,
  { minOverlap = 4, minAbsR = 0.5 }: CorrelationOptions = {},
): CorrelationInsight[] => {
  const insights: CorrelationInsight[] = [];
  for (let i = 0; i < series.length; i += 1) {
    for (let j = i + 1; j < series.length; j += 1) {
      const a = series[i];
      const b = series[j];
      const pairs = alignByX(a.points, b.points);
      if (pairs.length < minOverlap) continue;
      const r = pearson(pairs);
      if (r === null || Math.abs(r) < minAbsR) continue;
      insights.push({
        aKey: a.key, aLabel: a.label,
        bKey: b.key, bLabel: b.label,
        r,
        strength: Math.abs(r) >= 0.7 ? 'strong' : 'moderate',
        direction: r >= 0 ? 'together' : 'inverse',
        sampleSize: pairs.length,
      });
    }
  }
  return insights.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
};

/** The single strongest correlation, or null when nothing clears the guards. */
export const topCorrelation = (
  series: ReadonlyArray<MetricSeries>,
  opts?: CorrelationOptions,
): CorrelationInsight | null => computeCorrelations(series, opts)[0] ?? null;
