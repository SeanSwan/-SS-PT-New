/**
 * MODULE: progressChartLens
 * OWNER: Dashboard Progress / Client Hub
 * PURPOSE: Shared lens metadata for filtering the canonical 15 progress charts.
 */

import type { CanonicalChartId } from '../../../hooks/analytics/useClientProgressCharts.types';

const PROGRESS_CHART_LENS_IDS = [
  'all',
  'consistency',
  'strength',
  'balance',
  'recovery',
  'body',
] as const;

export type ProgressChartLensId = typeof PROGRESS_CHART_LENS_IDS[number];

interface ProgressChartLens {
  id: ProgressChartLensId;
  label: string;
  description: string;
  chartIds: readonly CanonicalChartId[];
}

export const PROGRESS_CHART_LENSES: readonly ProgressChartLens[] = [
  {
    id: 'all',
    label: 'All',
    description: 'Full 15-chart proof deck.',
    chartIds: [
      'workoutFrequency',
      'attendanceReliability',
      'weeklyVolume',
      'setsRepsTrend',
      'durationTrend',
      'intensityRpeTrend',
      'prTimeline',
      'anchorLifts',
      'exerciseFrequency',
      'movementPatternBalance',
      'muscleGroupBalance',
      'recoverySignal',
      'weightTrend',
      'bodyFatTrend',
      'estOneRm',
    ],
  },
  {
    id: 'consistency',
    label: 'Consistency',
    description: 'Training rhythm, attendance, and session length.',
    chartIds: ['workoutFrequency', 'attendanceReliability', 'durationTrend'],
  },
  {
    id: 'strength',
    label: 'Strength',
    description: 'Volume, set/reps work, PRs, and anchor lifts.',
    chartIds: ['weeklyVolume', 'setsRepsTrend', 'prTimeline', 'anchorLifts', 'exerciseFrequency', 'estOneRm'],
  },
  {
    id: 'balance',
    label: 'Balance',
    description: 'Movement-pattern and muscle-group distribution.',
    chartIds: ['movementPatternBalance', 'muscleGroupBalance'],
  },
  {
    id: 'recovery',
    label: 'Recovery',
    description: 'Effort trend and red-flag recovery signals.',
    chartIds: ['intensityRpeTrend', 'recoverySignal', 'durationTrend'],
  },
  {
    id: 'body',
    label: 'Body',
    description: 'Weight, body composition, and top-lift strength estimate.',
    chartIds: ['weightTrend', 'bodyFatTrend', 'estOneRm'],
  },
];

export const getProgressChartLens = (lensId: ProgressChartLensId) => (
  PROGRESS_CHART_LENSES.find((lens) => lens.id === lensId) || PROGRESS_CHART_LENSES[0]
);

export const isProgressChartVisible = (
  lensId: ProgressChartLensId,
  chartId: CanonicalChartId,
): boolean => getProgressChartLens(lensId).chartIds.includes(chartId);
