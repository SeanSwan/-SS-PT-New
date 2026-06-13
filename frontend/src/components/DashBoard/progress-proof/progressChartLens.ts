/**
 * MODULE: progressChartLens
 * OWNER: Dashboard Progress / Client Hub
 * PURPOSE: Shared lens metadata for filtering the canonical 12 progress charts.
 */

import type { CanonicalChartId } from '../../../hooks/analytics/useClientProgressCharts.types';

const PROGRESS_CHART_LENS_IDS = [
  'all',
  'consistency',
  'strength',
  'balance',
  'recovery',
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
    description: 'Full 12-chart proof deck.',
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
    chartIds: ['weeklyVolume', 'setsRepsTrend', 'prTimeline', 'anchorLifts', 'exerciseFrequency'],
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
];

export const getProgressChartLens = (lensId: ProgressChartLensId) => (
  PROGRESS_CHART_LENSES.find((lens) => lens.id === lensId) || PROGRESS_CHART_LENSES[0]
);

export const isProgressChartVisible = (
  lensId: ProgressChartLensId,
  chartId: CanonicalChartId,
): boolean => getProgressChartLens(lensId).chartIds.includes(chartId);
