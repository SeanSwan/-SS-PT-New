/**
 * CanonicalProgressChartsGrid.expandRows
 * ======================================
 * Drill-down/CSV row builders extracted from the at-cap grid card files
 * (Phase 2.2a, Rule 4) — shared by the card action bars and the chart
 * expand modal's semantic data table.
 */
import type { ProgressChartCsvRow, ProgressChartDrilldownRow } from '../../progress-proof/progressChartActions';

type VolumePoint = { x: string | number; y: number; workouts?: number | null };
type FrequencyPoint = { x: string | number; y: number };

const whole = (value: number): string => Math.round(value).toLocaleString();

export const buildWeeklyVolumeDrilldownRows = (points: VolumePoint[]): ProgressChartDrilldownRow[] =>
  points.map((row) => ({
    id: String(row.x),
    label: String(row.x),
    value: `${whole(row.y)} lbs`,
    detail: `${row.workouts ?? 0} logged workout${row.workouts === 1 ? '' : 's'} in this point.`,
  }));

export const buildWeeklyVolumeCsvRows = (points: VolumePoint[]): ProgressChartCsvRow[] =>
  points.map((row) => ({
    week: row.x,
    volume_lbs: Math.round(row.y),
    workouts: row.workouts,
  }));

export const buildWorkoutFrequencyRows = (points: FrequencyPoint[]): ProgressChartDrilldownRow[] =>
  points.map((row) => ({
    id: String(row.x),
    label: String(row.x),
    value: `${row.y} workout${row.y === 1 ? '' : 's'}`,
  }));

/* ── Phase 4b sweep: builders for the remaining canonical cards ── */

type AttendanceBundle = {
  reliabilityPercent: number;
  totals: { completed: number; skipped: number; cancelled: number; resolved: number };
};

export const buildAttendanceRows = (bundle: AttendanceBundle): ProgressChartDrilldownRow[] => [
  { id: 'show-rate', label: 'Show-rate', value: `${bundle.reliabilityPercent}%` },
  { id: 'completed', label: 'Completed', value: whole(bundle.totals.completed) },
  { id: 'skipped', label: 'Skipped', value: whole(bundle.totals.skipped) },
  { id: 'cancelled', label: 'Cancelled', value: whole(bundle.totals.cancelled) },
  { id: 'resolved', label: 'Resolved', value: whole(bundle.totals.resolved) },
];

export const buildUnitSeriesRows = (
  points: Array<{ x: string | number; y: number; source?: string }> | null | undefined,
  unit: string,
  decimals = 0
): ProgressChartDrilldownRow[] =>
  (points ?? []).map((row) => ({
    id: String(row.x),
    label: String(row.x),
    value: `${decimals > 0 ? row.y.toFixed(decimals) : whole(row.y)} ${unit}`.trim(),
    ...(row.source ? { detail: `Source: ${row.source}` } : {}),
  }));

type NamedValuePoint = { x?: string | number; label?: string; y?: number; value?: number };

export const buildNamedValueRows = (
  points: NamedValuePoint[],
  unit = ''
): ProgressChartDrilldownRow[] =>
  points.map((row, index) => ({
    id: String(row.x ?? row.label ?? index),
    label: String(row.x ?? row.label ?? `#${index + 1}`),
    value: `${whole(Number(row.y ?? row.value ?? 0))}${unit ? ` ${unit}` : ''}`,
  }));

export const buildExerciseFrequencyRows = (
  points: Array<{ x: string; y: number; sets?: number }>
): ProgressChartDrilldownRow[] =>
  points.map((row) => ({
    id: String(row.x),
    label: String(row.x),
    value: `${row.y}×`,
    detail: row.sets != null ? `${row.sets} total sets` : undefined,
  }));

export const buildRecoverySignalRows = (
  points: Array<{ x: string; painFlags?: number; highRpeFlags?: number; totalSets?: number }>
): ProgressChartDrilldownRow[] =>
  points.map((row) => {
    const pain = row.painFlags ?? 0;
    const redline = row.highRpeFlags ?? 0;
    return {
      id: String(row.x),
      label: String(row.x),
      value: [
        pain > 0 ? `${pain} pain` : null,
        redline > 0 ? `${redline} redline` : null,
      ].filter(Boolean).join(' · ') || 'clear',
      detail: `${row.totalSets ?? 0} sets in window`,
    };
  });

type AnchorSeries = { exerciseName: string; points: Array<{ x: string | number; y: number }> };

export const buildAnchorLiftRows = (series: AnchorSeries[]): ProgressChartDrilldownRow[] =>
  series.flatMap((lift) =>
    lift.points.map((point) => ({
      id: `${lift.exerciseName}-${point.x}`,
      label: `${lift.exerciseName} — ${point.x}`,
      value: `${whole(point.y)} lbs`,
    }))
  );
