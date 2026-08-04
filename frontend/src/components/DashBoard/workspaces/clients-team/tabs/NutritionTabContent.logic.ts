export interface NutritionTimelineEntry {
  id: number | string;
  mealType?: string | null;
  description?: string | null;
  calories?: number | string | null;
  protein?: number | string | null;
  carbs?: number | string | null;
  fat?: number | string | null;
  fiber?: number | string | null;
  sugar?: number | string | null;
  sodium?: number | string | null;
  source?: string | null;
  verified?: boolean | null;
  reviewStatus?: string | null;
  createdAt?: string | null;
}

export interface NutritionTimelineRow {
  id: number | string;
  title: string;
  description: string;
  macroLine: string;
  sourceLabel: string;
  reviewLabels: string[];
  canVerify: boolean;
  /** Wing Purple left-border marker for needs-review diary rows (HY3 §(a)6). */
  needsAttention: boolean;
  createdAtLabel: string;
}

const SOURCE_LABELS: Record<string, string> = {
  'food-scanner': 'Photo estimate',
  'ai-chat': 'AI estimate',
  ai_chat: 'AI estimate',
  barcode: 'Barcode',
  manual: 'Manual',
  'meal-plan': 'Plan estimate',
  photo: 'Photo estimate',
  usda_lookup: 'USDA lookup',
  voice: 'Voice estimate',
};

const decimalNumberPattern = /^\d+(?:\.\d+)?$/;

const toPositiveNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!decimalNumberPattern.test(trimmed)) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const rounded = (value: unknown): number => Math.round(toPositiveNumber(value));

const titleCase = (value: string): string =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');

const sourceLabel = (source: string | null | undefined): string =>
  SOURCE_LABELS[source?.trim().toLowerCase() || ''] || 'Estimate';

const normalizedSource = (source: string | null | undefined): string =>
  source?.trim().toLowerCase() || '';

const isManualSource = (source: string | null | undefined): boolean =>
  normalizedSource(source) === 'manual';

const reviewLabels = (entry: NutritionTimelineEntry, label: string): string[] => {
  if (entry.verified) return ['Verified'];
  return isManualSource(entry.source) ? ['Needs verification', label] : ['Needs review', label];
};
// NOTE (Phase 4A): the provenance summary card was superseded by
// NutritionAdherenceHero flag chips (Verify N / N estimated) per HY3 §(a).

const createdAtLabel = (createdAt: string | null | undefined, withDate: boolean): string => {
  if (!createdAt) return 'Time pending';
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return 'Time pending';
  const time = parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (!withDate) return time;
  return `${parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} ${time}`;
};

const needsAttention = (entry: NutritionTimelineEntry): boolean =>
  !entry.verified
  && (entry.reviewStatus === 'needs_review' || !isManualSource(entry.source));

export const buildNutritionTimelineRows = (
  entries: NutritionTimelineEntry[],
  options: { withDateLabels?: boolean } = {},
): NutritionTimelineRow[] =>
  entries.map((entry) => {
    const label = sourceLabel(entry.source);
    return {
      id: entry.id,
      title: titleCase(entry.mealType || 'meal'),
      description: entry.description?.trim() || 'Macro entry',
      macroLine: `${rounded(entry.calories)} cal - ${rounded(entry.protein)}g protein - ${rounded(entry.fiber)}g fiber`,
      sourceLabel: label,
      reviewLabels: reviewLabels(entry, label),
      canVerify: !entry.verified,
      needsAttention: needsAttention(entry),
      createdAtLabel: createdAtLabel(entry.createdAt, options.withDateLabels === true),
    };
  });
