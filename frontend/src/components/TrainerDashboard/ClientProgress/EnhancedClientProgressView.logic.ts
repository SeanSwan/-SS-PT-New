import type { ClientData } from './Analytics';

export const toBoundedMetric = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

export const toNonNegativeNumber = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
};

export const toStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
};

export const toProgressMetrics = (metrics: any): ClientData['progressMetrics'] => ({
  strength: toBoundedMetric(metrics?.strength),
  cardio: toBoundedMetric(metrics?.cardio),
  flexibility: toBoundedMetric(metrics?.flexibility),
  balance: toBoundedMetric(metrics?.balance),
  stability: toBoundedMetric(metrics?.stability),
});

export const toRiskLevel = (value: unknown): ClientData['riskLevel'] => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized;
  }

  return 'unknown';
};
