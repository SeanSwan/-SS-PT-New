import type { AnalyticsInsight, ComparisonMetric } from './types';

export type ComparisonType = 'clients' | 'average' | 'historical' | 'goals';
export type PercentileVariant = 'success' | 'warning' | 'error';

export const DEFAULT_COMPARISON_TYPE: ComparisonType = 'average';

export const comparisonTypeOptions: Array<{ value: ComparisonType; label: string }> = [
  { value: 'average', label: 'vs. Average' },
  { value: 'clients', label: 'vs. Similar Clients' },
  { value: 'historical', label: 'vs. Personal History' },
  { value: 'goals', label: 'vs. Target Goals' },
];

export const timeframeOptions = [
  { value: '1month', label: 'Last Month' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: '1year', label: 'Last Year' },
] as const;

export const isComparisonType = (value: string): value is ComparisonType => (
  comparisonTypeOptions.some((option) => option.value === value)
);

export const clampProgressWidth = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

export const comparisonInsightKey = (insight: AnalyticsInsight): string => [
  insight.type,
  insight.title,
  insight.description,
  insight.recommendation,
].join('|');

export const getPercentileVariant = (percentile: number): PercentileVariant => {
  if (percentile >= 70) return 'success';
  if (percentile >= 50) return 'warning';
  return 'error';
};

export const getTrendTone = (trend: ComparisonMetric['trend']): string => {
  if (trend === 'above' || trend === 'approaching') return 'var(--status-success, #4CAF50)';
  if (trend === 'below') return 'var(--status-error, #FF6B6B)';
  return 'var(--status-warning, #FFC107)';
};

export const getImprovementTone = (improvement: string): string => {
  if (improvement.startsWith('+')) return 'var(--status-success, #4CAF50)';
  if (improvement.startsWith('-')) return 'var(--status-error, #FF6B6B)';
  return 'var(--text-primary, #E0ECF4)';
};

export const getInsightSeverity = (
  type: AnalyticsInsight['type'],
): 'success' | 'warning' | 'info' | 'error' => {
  if (type === 'success' || type === 'warning' || type === 'error') return type;
  return 'info';
};
