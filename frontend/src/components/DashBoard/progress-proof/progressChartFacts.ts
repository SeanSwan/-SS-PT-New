/**
 * MODULE: progressChartFacts
 * PURPOSE: Truthful compact stat facts for premium chart environments (C11).
 * OWNER: Shared progress-proof insight layer (admin + client chart grids).
 * DATA POLICY: Computes ONLY from already-verified chart points; never
 * fabricates missing progress and returns [] when a series is empty.
 */

import type {
  AttendanceBundle,
  ChartPoint,
  PRPoint,
  RecoveryPoint,
} from '../../../hooks/analytics/useClientProgressCharts.types';

export type ProgressChartFactEmphasis = 'default' | 'accent' | 'gold' | 'alert';

export interface ProgressChartFact {
  id: string;
  label: string;
  value: string;
  emphasis?: ProgressChartFactEmphasis;
}

interface SeriesFactsOptions {
  unit?: string;
  pointsLabel?: string;
  decimals?: number;
}

const formatNumber = (value: number, decimals: number): string => {
  if (!Number.isFinite(value)) return '0';
  return decimals > 0
    ? value.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: 0 })
    : Math.round(value).toLocaleString();
};

const withUnit = (value: string, unit: string): string => (unit ? `${value} ${unit}` : value);

export function buildSeriesFacts(
  points: ChartPoint[],
  options: SeriesFactsOptions = {},
): ProgressChartFact[] {
  if (points.length === 0) return [];
  const unit = options.unit ?? '';
  const decimals = options.decimals ?? 0;
  const pointsLabel = options.pointsLabel ?? 'points';
  const latest = points[points.length - 1];
  const best = points.reduce((top, point) => (point.y > top.y ? point : top), points[0]);
  const average = points.reduce((sum, point) => sum + point.y, 0) / points.length;

  return [
    { id: 'latest', label: 'Latest', value: withUnit(formatNumber(latest.y, decimals), unit), emphasis: 'accent' },
    { id: 'best', label: 'Best', value: withUnit(formatNumber(best.y, decimals), unit), emphasis: 'gold' },
    { id: 'avg', label: 'Avg', value: withUnit(formatNumber(average, Math.max(decimals, 1)), unit) },
    { id: 'count', label: 'Logged', value: `${points.length} ${pointsLabel}` },
  ];
}

interface CategoryFactsOptions {
  unit?: string;
  itemLabel?: string;
}

export function buildCategoryFacts(
  points: ChartPoint[],
  options: CategoryFactsOptions = {},
): ProgressChartFact[] {
  if (points.length === 0) return [];
  const unit = options.unit ?? '';
  const itemLabel = options.itemLabel ?? 'tracked';
  const total = points.reduce((sum, point) => sum + point.y, 0);
  const top = points.reduce((lead, point) => (point.y > lead.y ? point : lead), points[0]);
  const sharePct = total > 0 ? Math.round((top.y / total) * 100) : 0;

  return [
    { id: 'top', label: 'Top', value: String(top.x), emphasis: 'accent' },
    { id: 'share', label: 'Share', value: `${sharePct}%`, emphasis: 'gold' },
    { id: 'total', label: 'Total', value: withUnit(formatNumber(total, 0), unit) },
    { id: 'count', label: itemLabel, value: String(points.length) },
  ];
}

export function buildPrFacts(points: PRPoint[]): ProgressChartFact[] {
  if (points.length === 0) return [];
  const best = points.reduce((top, point) => (point.y > top.y ? point : top), points[0]);
  const latest = points[points.length - 1];
  const exercises = new Set(points.map((point) => point.exercise)).size;

  return [
    { id: 'best', label: 'Heaviest', value: `${best.exercise} ${formatNumber(best.y, 0)} lbs`, emphasis: 'gold' },
    { id: 'latest', label: 'Latest PR', value: String(latest.x), emphasis: 'accent' },
    { id: 'exercises', label: 'Lifts w/ PRs', value: String(exercises) },
    { id: 'count', label: 'PR points', value: String(points.length) },
  ];
}

export function buildRecoveryFacts(points: RecoveryPoint[]): ProgressChartFact[] {
  if (points.length === 0) return [];
  const painFlags = points.reduce((sum, point) => sum + (point.painFlags ?? 0), 0);
  const redlineFlags = points.reduce((sum, point) => sum + (point.highRpeFlags ?? 0), 0);
  const totalSets = points.reduce((sum, point) => sum + (point.totalSets ?? 0), 0);

  return [
    { id: 'pain', label: 'Pain flags', value: String(painFlags), emphasis: painFlags > 0 ? 'alert' : 'default' },
    { id: 'redline', label: 'Redline sets', value: String(redlineFlags), emphasis: redlineFlags > 0 ? 'alert' : 'default' },
    { id: 'exercises', label: 'Exercises flagged', value: String(points.length) },
    { id: 'sets', label: 'Sets watched', value: formatNumber(totalSets, 0) },
  ];
}

export const describeIntensitySource = (
  points: { source?: 'rpe' | 'intensity' }[],
): string => {
  const rpeCount = points.filter((point) => point.source === 'rpe').length;
  if (rpeCount === points.length) return 'Logged RPE';
  if (rpeCount === 0) return 'Session intensity';
  return 'Mixed RPE + intensity';
};

interface AnchorLiftsShape {
  data: Record<string, ChartPoint[]>;
  exercises: string[];
}

export function buildAnchorFacts(bundle: AnchorLiftsShape): ProgressChartFact[] {
  if (bundle.exercises.length === 0) return [];
  const pointCount = bundle.exercises
    .reduce((sum, name) => sum + (bundle.data[name] || []).length, 0);
  return [
    { id: 'lifts', label: 'Anchor lifts', value: String(bundle.exercises.length), emphasis: 'accent' },
    { id: 'points', label: 'Proof points', value: String(pointCount) },
  ];
}

export function buildAttendanceFacts(bundle: AttendanceBundle): ProgressChartFact[] {
  if (bundle.data.length === 0) return [];
  const { completed, skipped, cancelled, resolved } = bundle.totals;

  return [
    { id: 'showRate', label: 'Show rate', value: `${bundle.reliabilityPercent}%`, emphasis: 'accent' },
    { id: 'completed', label: 'Completed', value: String(completed), emphasis: 'gold' },
    { id: 'skipped', label: 'Skipped', value: String(skipped), emphasis: skipped > 0 ? 'alert' : 'default' },
    { id: 'cancelled', label: 'Cancelled', value: String(cancelled) },
    { id: 'resolved', label: 'Resolved', value: String(resolved) },
  ];
}
