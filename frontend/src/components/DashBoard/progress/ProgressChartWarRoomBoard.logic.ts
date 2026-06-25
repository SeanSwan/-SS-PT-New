/**
 * FILE: ProgressChartWarRoomBoard.logic.ts
 * PURPOSE: Build dense selectable chart tiles from canonical workout chart data.
 */
import type { CanonicalProgressCharts, ChartPoint } from '../../../hooks/analytics/useClientProgressCharts.types';

export type WarRoomTileId =
  | 'exercise-codex'
  | 'weekly-load'
  | 'recovery-watch'
  | 'pr-archive'
  | 'attendance'
  | 'movement-balance'
  | 'muscle-balance'
  | 'intensity';

export interface WarRoomTile {
  id: WarRoomTileId;
  label: string;
  value: string;
  detail: string;
  depth: number;
}

const numberFormatter = new Intl.NumberFormat('en-US');
const compactFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

const finite = (value: unknown): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : 0
);

const sumY = (points: ChartPoint[]): number => points.reduce((total, point) => total + finite(point.y), 0);

export const DEFAULT_WAR_ROOM_LAYOUT: WarRoomTileId[] = [
  'exercise-codex',
  'weekly-load',
  'recovery-watch',
  'pr-archive',
];

export const buildWarRoomTiles = (charts: CanonicalProgressCharts): WarRoomTile[] => {
  const exerciseSets = charts.exerciseFrequency.reduce((total, point) => total + finite(point.sets), 0);
  const recoveryFlags = charts.recoverySignal.reduce(
    (total, point) => total + finite(point.painFlags) + finite(point.highRpeFlags),
    0,
  );
  const movementSets = charts.movementPatternBalance.reduce((total, point) => total + finite(point.sets), 0);
  const muscleSets = charts.muscleGroupBalance.reduce((total, point) => total + finite(point.sets), 0);
  const intensityAverage = charts.intensityRpeTrend.length > 0
    ? Math.round(sumY(charts.intensityRpeTrend) / charts.intensityRpeTrend.length)
    : 0;

  return [
    {
      id: 'exercise-codex',
      label: 'Exercise Codex',
      value: numberFormatter.format(charts.exerciseFrequency.length),
      detail: `${numberFormatter.format(exerciseSets)} sets logged`,
      depth: charts.exerciseFrequency.length + exerciseSets,
    },
    {
      id: 'weekly-load',
      label: 'Weekly Load',
      value: compactFormatter.format(sumY(charts.weeklyVolume)),
      detail: `${numberFormatter.format(charts.weeklyVolume.length)} weeks charted`,
      depth: charts.weeklyVolume.length,
    },
    {
      id: 'recovery-watch',
      label: 'Recovery Watch',
      value: numberFormatter.format(recoveryFlags),
      detail: `${numberFormatter.format(charts.recoverySignal.length)} recovery points`,
      depth: recoveryFlags,
    },
    {
      id: 'pr-archive',
      label: 'PR Archive',
      value: numberFormatter.format(charts.prTimeline.length),
      detail: charts.prTimeline[0]?.exercise || 'No PR signal yet',
      depth: charts.prTimeline.length,
    },
    {
      id: 'attendance',
      label: 'Attendance',
      value: `${Math.round(finite(charts.attendanceReliability.reliabilityPercent))}%`,
      detail: `${numberFormatter.format(charts.attendanceReliability.totals.completed)} completed`,
      depth: finite(charts.attendanceReliability.reliabilityPercent),
    },
    {
      id: 'movement-balance',
      label: 'Movement Balance',
      value: numberFormatter.format(charts.movementPatternBalance.length),
      detail: `${numberFormatter.format(movementSets)} mapped sets`,
      depth: movementSets,
    },
    {
      id: 'muscle-balance',
      label: 'Muscle Balance',
      value: numberFormatter.format(charts.muscleGroupBalance.length),
      detail: `${numberFormatter.format(muscleSets)} muscle-group sets`,
      depth: muscleSets,
    },
    {
      id: 'intensity',
      label: 'Intensity',
      value: intensityAverage ? `${intensityAverage}/10` : '0/10',
      detail: `${numberFormatter.format(charts.intensityRpeTrend.length)} RPE points`,
      depth: intensityAverage,
    },
  ];
};

export const normalizeWarRoomLayout = (
  candidate: unknown,
  availableTiles: WarRoomTile[],
): WarRoomTileId[] => {
  const available = new Set(availableTiles.map((tile) => tile.id));
  const incoming = Array.isArray(candidate) ? candidate : DEFAULT_WAR_ROOM_LAYOUT;
  const normalized = incoming.filter((id): id is WarRoomTileId => available.has(id as WarRoomTileId));
  return normalized.length > 0 ? Array.from(new Set(normalized)) : DEFAULT_WAR_ROOM_LAYOUT;
};
