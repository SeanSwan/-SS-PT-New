/**
 * Display constants and formatting helpers for SystemAnalytics.
 */

import type { AnalyticsTab, AnalyticsTimeRange, TierAnalytics } from './SystemAnalytics.types';

export const SWAN_TIER_LABELS: Record<string, string> = {
  bronze: 'Cygnus Initiate',
  silver: 'Frostwing Ascendant',
  gold: 'Gilded Sovereign',
  platinum: 'Amethyst Apex',
};

export const TIER_COLORS: Record<string, string> = {
  bronze: 'var(--swan-midnight-sapphire, #002060)',
  silver: 'var(--swan-ice-wing, #60C0F0)',
  gold: 'var(--swan-gilded-fern, #C6A84B)',
  platinum: 'var(--swan-wing-purple, #8B5CF6)',
  fallback: 'var(--swan-lavender, #4070C0)',
};

export const ANALYTICS_TABS: Array<{ value: AnalyticsTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'users', label: 'User Engagement' },
  { value: 'achievements', label: 'Achievements' },
  { value: 'rewards', label: 'Rewards' },
  { value: 'tiers', label: 'Tiers' },
  { value: 'trends', label: 'Trends' },
];

export const TIME_RANGES: Array<{ value: AnalyticsTimeRange; label: string }> = [
  { value: 'week', label: 'Last Week' },
  { value: 'month', label: 'Last Month' },
  { value: 'quarter', label: 'Last Quarter' },
  { value: 'year', label: 'Last Year' },
];

export const asNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

export const formatNumber = (value: unknown) => asNumber(value).toLocaleString();

export const getTierColor = (tier: string) => TIER_COLORS[tier] || TIER_COLORS.fallback;

export const getTierLabel = (tier: string) => SWAN_TIER_LABELS[tier] || tier;

export const normalizeTierDistribution = (tiers?: TierAnalytics[]) => (Array.isArray(tiers) ? tiers : []);

export const formatActivityDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || 'Unknown';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
