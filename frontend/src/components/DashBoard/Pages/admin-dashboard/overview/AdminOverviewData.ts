import { AdminDashboardMetric } from './AdminOverview.types';

type SettledAdminOverviewResponse = PromiseSettledResult<{
  data?: { data?: Record<string, any> };
}>;

export const mapChangeType = (value: number): AdminDashboardMetric['changeType'] => {
  if (value > 0) return 'increase';
  if (value < 0) return 'decrease';
  return 'neutral';
};

export const safeTrend = (raw: unknown): number[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map(v => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  });
};

export const readSettledData = (
  result: SettledAdminOverviewResponse
): Record<string, any> | null => (
  result.status === 'fulfilled' ? (result.value.data?.data ?? {}) : null
);

export const metricUnavailable = (
  metric: Pick<AdminDashboardMetric, 'id' | 'title' | 'icon' | 'color' | 'description'>
): AdminDashboardMetric => ({
  ...metric,
  value: 'Unavailable',
  change: 0,
  changeType: 'neutral',
  trend: [],
  format: 'text',
});
