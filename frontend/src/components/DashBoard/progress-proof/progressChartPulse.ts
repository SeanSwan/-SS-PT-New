/**
 * MODULE: progressChartPulse
 * PURPOSE: Convert verified chart points into a compact, truthful coaching readout.
 * OWNER: Client progress proof / Social proof surfaces.
 * DATA POLICY: Uses only already-rendered chart values; never fabricates missing progress.
 */

import type { ChartPoint } from '../../../hooks/analytics/useClientProgressCharts';

export type ProgressChartPulseTone = 'empty' | 'building' | 'rising' | 'steady' | 'falling' | 'record';

export interface ProgressChartPulse {
  label: string;
  value: string;
  detail: string;
  target?: string;
  tone: ProgressChartPulseTone;
  /** Next-Milestone Gravity: how close the latest value is to the best (0..1). */
  progressToNext?: number;
  /** Formatted gap remaining to reach/beat the best (empty when already there). */
  remainingLabel?: string;
  /** Plain-language next-best-action synthesized from tone + gravity (local, no LLM). */
  coachAction?: string;
}

interface ProgressChartPulseOptions {
  label?: string;
  unit?: string;
  higherIsBetter?: boolean;
}

const formatPulseNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString();
};

const formatDeltaPercent = (latest: number, previous: number): string => {
  if (!Number.isFinite(previous) || previous === 0) return 'new baseline';
  const deltaPct = ((latest - previous) / Math.abs(previous)) * 100;
  const sign = deltaPct > 0 ? '+' : '';
  return `${sign}${Math.round(deltaPct)}%`;
};

const formatPulseValue = (value: number, unit: string): string => (
  `${formatPulseNumber(value)}${unit ? ` ${unit}` : ''}`
);

const buildEmptyPulse = (label: string): ProgressChartPulse => ({
  label,
  value: 'Waiting on logs',
  detail: 'No verified rows exist in this range yet.',
  tone: 'empty',
});

const getBestPoint = <T extends ChartPoint>(points: T[], higherIsBetter: boolean): T => (
  [...points].sort((a, b) => (higherIsBetter ? b.y - a.y : a.y - b.y))[0]
);

const buildBaselinePulse = <T extends ChartPoint>(
  label: string,
  latest: T,
  bestValue: string,
): ProgressChartPulse => ({
  label,
  value: bestValue,
  detail: `First verified point: ${latest.x}. Log another point to unlock momentum.`,
  target: `Beat ${bestValue} to set the next proof mark.`,
  tone: 'building',
});

const isImprovement = (latest: number, previous: number, higherIsBetter: boolean): boolean => (
  higherIsBetter ? latest > previous : latest < previous
);

const isBestValue = (latest: number, best: number, higherIsBetter: boolean): boolean => (
  higherIsBetter ? latest >= best : latest <= best
);

// Next-Milestone Gravity: a direction-aware pull toward the personal best. Returns
// progressToNext in 0..1 (1 = at/past the best) and the formatted remaining gap.
const computeGravity = (
  latestY: number,
  bestY: number,
  higherIsBetter: boolean,
  unit: string,
): Pick<ProgressChartPulse, 'progressToNext' | 'remainingLabel'> | null => {
  if (!Number.isFinite(latestY) || !Number.isFinite(bestY)) return null;
  const remainingRaw = higherIsBetter
    ? Math.max(0, bestY - latestY)
    : Math.max(0, latestY - bestY);
  let progress: number;
  if (higherIsBetter) {
    progress = bestY > 0 ? latestY / bestY : latestY >= bestY ? 1 : 0;
  } else {
    progress = latestY > 0 ? bestY / latestY : latestY <= bestY ? 1 : 0;
  }
  return {
    progressToNext: Math.max(0, Math.min(1, progress)),
    // >= 0.5 so a tiny gap that rounds to "0" is treated as "essentially there"
    // (empty) rather than contradicting the ~100% bar with "0 from your best".
    remainingLabel: remainingRaw >= 0.5 ? formatPulseValue(remainingRaw, unit) : '',
  };
};

// Coach Read (G3a): a plain-language next-best-action from the LOCAL tone + gravity -
// the "decide the next training action" beat of the Product Core Loop. No backend / no
// LLM; deliberately self-contained so it does not depend on the in-flight SWA-65 hive
// mind. The full one-tap chart->Coach handoff is a separate, later slice.
const buildCoachAction = (
  tone: ProgressChartPulseTone,
  remainingLabel?: string,
): string => {
  // No remaining gap = the latest value ties the personal best (at peak). The steady
  // copy must reflect that instead of telling a client at their best to "break the
  // plateau" - which would contradict the gravity bar's "Peak reached" caption.
  const atBest = !remainingLabel;
  switch (tone) {
    case 'record':
      return 'New personal best - keep this stimulus to lock it in.';
    case 'rising':
      return remainingLabel
        ? `Trending up - ${remainingLabel} from your best. One more quality session closes the gap.`
        : 'Trending up - hold the momentum with your next session.';
    case 'steady':
      return atBest
        ? 'Holding at your best - keep this stimulus to protect it.'
        : 'Holding steady - add a small progressive overload to break the plateau.';
    case 'falling':
      return 'Dipped from your best - check recovery, sleep, and volume this week.';
    default:
      return 'Log another session to build the trend.';
  }
};

const resolveMomentumTone = <T extends ChartPoint>(
  latest: T,
  previous: T,
  best: T,
  higherIsBetter: boolean,
): ProgressChartPulseTone => {
  // Record check FIRST (before the steady threshold): a genuine new best must never be
  // swallowed by the sub-1-unit "steady" band. Integer metrics (the wired ones) are
  // unaffected - a new best there already has delta >= 1; this only rescues fractional
  // metrics (body fat, est-1RM) that improve by < 1 unit into a new best.
  if (isImprovement(latest.y, previous.y, higherIsBetter) && isBestValue(latest.y, best.y, higherIsBetter)) {
    return 'record';
  }
  const delta = latest.y - previous.y;
  if (Math.abs(delta) < 1) return 'steady';
  return isImprovement(latest.y, previous.y, higherIsBetter) ? 'rising' : 'falling';
};

const buildMomentumPulse = <T extends ChartPoint>(
  label: string,
  points: T[],
  best: T,
  unit: string,
  higherIsBetter: boolean,
): ProgressChartPulse => {
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const tone = resolveMomentumTone(latest, previous, best, higherIsBetter);
  const latestValue = formatPulseValue(latest.y, unit);
  const bestValue = formatPulseValue(best.y, unit);
  const gravity = computeGravity(latest.y, best.y, higherIsBetter, unit);

  return {
    label,
    value: tone === 'steady' ? 'Stable' : `${formatDeltaPercent(latest.y, previous.y)} vs prior`,
    detail: `Latest ${latest.x}: ${latestValue}. Best ${best.x}: ${bestValue}.`,
    target: tone === 'record'
      ? `Protect the new high mark: ${bestValue}.`
      : `Next target: ${bestValue}.`,
    tone,
    ...gravity,
    coachAction: buildCoachAction(tone, gravity?.remainingLabel),
  };
};

export function buildProgressChartPulse<T extends ChartPoint>(
  points: T[],
  options: ProgressChartPulseOptions = {},
): ProgressChartPulse {
  const label = options.label ?? 'Progress Pulse';
  const unit = options.unit ?? '';
  const higherIsBetter = options.higherIsBetter ?? true;
  if (points.length === 0) return buildEmptyPulse(label);

  const latest = points[points.length - 1];
  const best = getBestPoint(points, higherIsBetter);
  const bestValue = formatPulseValue(best.y, unit);

  return points.length === 1
    ? buildBaselinePulse(label, latest, bestValue)
    : buildMomentumPulse(label, points, best, unit, higherIsBetter);
}
