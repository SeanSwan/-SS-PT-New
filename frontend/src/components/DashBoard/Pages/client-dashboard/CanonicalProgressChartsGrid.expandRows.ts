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
