/**
 * MODULE: chartMovementDigest
 * PURPOSE: One-glance "what moved recently" across a client's tracked metrics, so they
 *   don't have to scan all 15 charts to see the story. For each metric it compares the
 *   LATEST logged point to the PREVIOUS one (naturally week-over-week for the weekly-cadence
 *   series) and reports the honest delta + direction.
 * DATA POLICY: zero fabrication. A metric appears only when it has >= 2 finite logged
 *   points; the delta is latest-minus-previous, never inferred. "Improved" is set only for
 *   metrics with a KNOWN good direction (more workouts/volume = up-good, lower body fat =
 *   down-good); ambiguous metrics (duration, intensity, weight) stay neutral — we do not
 *   claim up-is-good when it isn't (Rule 75 truthful framing).
 */

import type { CanonicalProgressCharts, ChartPoint } from '../../../hooks/analytics/useClientProgressCharts.types';

type GoodDirection = 'up' | 'down' | 'neutral';

interface DigestMetricConfig {
  key: keyof CanonicalProgressCharts;
  label: string;
  unit: string;
  good: GoodDirection;
}

// Fixed, curated set of latest-vs-previous comparable series. Units are shown ONLY where
// certain (body fat is a percentage); the rest are unit-less to avoid a false unit claim.
const DIGEST_METRICS: ReadonlyArray<DigestMetricConfig> = [
  { key: 'workoutFrequency', label: 'Workouts', unit: '', good: 'up' },
  { key: 'weeklyVolume', label: 'Training Volume', unit: '', good: 'up' },
  { key: 'intensityRpeTrend', label: 'Intensity (RPE)', unit: '', good: 'neutral' },
  { key: 'durationTrend', label: 'Session Duration', unit: '', good: 'neutral' },
  { key: 'weightTrend', label: 'Body Weight', unit: '', good: 'neutral' },
  { key: 'bodyFatTrend', label: 'Body Fat', unit: '%', good: 'down' },
];

export type MovementDirection = 'up' | 'down' | 'flat';

export interface MovementRow {
  key: string;
  label: string;
  unit: string;
  latest: number;
  previous: number;
  /** latest - previous, rounded to 1dp (never signed-zero). */
  delta: number;
  /** Percent change vs |previous|, rounded to 1dp; null when previous is 0. */
  pctChange: number | null;
  direction: MovementDirection;
  /** true = moved in the good direction, false = moved the wrong way, null = neutral/flat. */
  improved: boolean | null;
}

export interface MovementDigest {
  rows: MovementRow[];
  /** Count of rows that actually moved (direction !== 'flat'). */
  metricsMoved: number;
  hasData: boolean;
}

/** Round to 1dp and normalize -0 to 0 so a rounded no-change never prints as "-0". */
const round1 = (n: number): number => {
  const r = Math.round(n * 10) / 10;
  return r === 0 ? 0 : r;
};

/** Last two finite-y points of a series, oldest-first, or null when fewer than two. */
const lastTwoFinite = (points: ReadonlyArray<ChartPoint> | undefined): [number, number] | null => {
  if (!Array.isArray(points)) return null;
  const ys = points.filter((p) => p && Number.isFinite(p.y)).map((p) => p.y);
  if (ys.length < 2) return null;
  return [ys[ys.length - 2], ys[ys.length - 1]];
};

const improvedFor = (good: GoodDirection, delta: number): boolean | null => {
  if (delta === 0) return null;
  if (good === 'up') return delta > 0;
  if (good === 'down') return delta < 0;
  return null; // neutral metric: no good/bad judgment
};

/**
 * Build the latest-movement digest from the real chart bundle. Rows that moved are listed
 * before flat rows (biggest story first), config order preserved within each group.
 */
export const buildMovementDigest = (charts: CanonicalProgressCharts): MovementDigest => {
  const rows: MovementRow[] = [];

  for (const cfg of DIGEST_METRICS) {
    const pair = lastTwoFinite(charts[cfg.key] as ChartPoint[] | undefined);
    if (!pair) continue;
    const [previous, latest] = pair;
    const delta = round1(latest - previous);
    const direction: MovementDirection = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    rows.push({
      key: String(cfg.key),
      label: cfg.label,
      unit: cfg.unit,
      latest: round1(latest),
      previous: round1(previous),
      delta,
      pctChange: previous !== 0 ? round1((delta / Math.abs(previous)) * 100) : null,
      direction,
      improved: improvedFor(cfg.good, delta),
    });
  }

  // Movers first (non-flat), then flat; stable within each group (config order preserved).
  rows.sort((a, b) => Number(a.direction === 'flat') - Number(b.direction === 'flat'));

  return {
    rows,
    metricsMoved: rows.filter((r) => r.direction !== 'flat').length,
    hasData: rows.length > 0,
  };
};
