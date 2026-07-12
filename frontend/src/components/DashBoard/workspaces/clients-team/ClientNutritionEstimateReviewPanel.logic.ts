export interface NutritionEstimateReviewClient {
  id: number;
  displayName: string;
}

export interface NutritionEstimateReviewEntry {
  id: number | string;
  userId: number | string;
  date?: string | null;
  mealType?: string | null;
  description?: string | null;
  calories?: number | string | null;
  protein?: number | string | null;
  fiber?: number | string | null;
  source?: string | null;
  verified?: boolean | null;
  servingBasis?: string | null;
  servingQuantity?: number | string | null;
  servingUnit?: string | null;
  caloriesReported?: number | string | null;
  caloriesCalculated?: number | string | null;
  reconciliationStatus?: string | null;
  confidenceScore?: number | string | null;
  reviewStatus?: string | null;
  reviewReason?: string | null;
}

export interface NutritionEstimateReviewRow {
  id: number | string;
  clientName: string;
  mealTitle: string;
  description: string;
  macroLine: string;
  sourceLabel: string;
  reviewReasonLabel: string;
  reviewStatusLabel: string;
  servingLabel: string;
  confidenceLabel: string;
  reconciliationLabel: string;
}

const SOURCE_LABELS: Record<string, string> = {
  'food-scanner': 'Photo estimate',
  'ai-chat': 'AI estimate',
  ai_chat: 'AI estimate',
  barcode: 'Barcode estimate',
  'meal-plan': 'Plan estimate',
  photo: 'Photo estimate',
  usda_lookup: 'USDA lookup',
  voice: 'Voice estimate',
};

const REVIEW_REASON_LABELS: Record<string, string> = {
  barcode_unmatched: 'Barcode not matched',
  client_requested: 'Client requested review',
  edited_after_review: 'Edited after coach review',
  metabolic_deviation: 'Calories differ from 4-4-9',
  provider_estimate: 'Provider estimate',
  unverified_estimate: 'Unverified estimate',
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  client_confirmed: 'Client confirmed',
  needs_review: 'Needs review',
  verified: 'Verified',
};

const SERVING_BASIS_LABELS: Record<string, string> = {
  estimated: 'Estimated',
  household: 'Household',
  label: 'Label',
  per_100g: 'Per 100 g',
  weighed: 'Weighed',
};

const decimalNumberPattern = /^\d+(?:\.\d+)?$/;
const integerIdPattern = /^\d+$/;

const toPositiveIntegerId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!integerIdPattern.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

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

const normalizedKey = (value: string | null | undefined): string =>
  value?.trim().toLowerCase() || '';

const formatMappedLabel = (
  prefix: string,
  value: string | null | undefined,
  labels: Record<string, string>,
  fallback: string
): string => prefix + ': ' + (labels[normalizedKey(value)] || fallback);

const servingLabel = (entry: NutritionEstimateReviewEntry): string => {
  const quantity = toPositiveNumber(entry.servingQuantity);
  const unit = entry.servingUnit?.trim();
  const basis = SERVING_BASIS_LABELS[normalizedKey(entry.servingBasis)];
  if (!quantity || !unit || !basis) return 'Serving: Not supplied';
  return 'Serving: ' + quantity + ' ' + unit + ' (' + basis + ')';
};

const confidenceLabel = (value: unknown): string => {
  const confidence = typeof value === 'number'
    ? value
    : typeof value === 'string' && decimalNumberPattern.test(value.trim())
      ? Number(value.trim())
      : Number.NaN;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return 'Source confidence: Not supplied';
  }
  return 'Source confidence: ' + Math.round(confidence * 100) + '%';
};

const reconciliationLabel = (entry: NutritionEstimateReviewEntry): string => {
  const status = normalizedKey(entry.reconciliationStatus);
  if (status === 'within_tolerance') return 'Calories: Within 4-4-9 range';
  if (status === 'calculated_only') return 'Calories: Calculated from macros';
  if (status === 'metabolic_deviation') {
    const reported = toPositiveNumber(entry.caloriesReported);
    const calculated = toPositiveNumber(entry.caloriesCalculated);
    if (reported && calculated) {
      return 'Calories: ' + Math.round(reported) + ' reported / ' + Math.round(calculated) + ' calculated';
    }
  }
  return 'Calories: Reconciliation unavailable';
};

const titleCase = (value: string): string =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');

const sourceLabel = (source: string | null | undefined): string =>
  SOURCE_LABELS[source?.trim().toLowerCase() || ''] || 'Estimate';

export const buildNutritionEstimateReviewRows = (
  clients: NutritionEstimateReviewClient[],
  entries: NutritionEstimateReviewEntry[]
): NutritionEstimateReviewRow[] => {
  const clientNames = new Map<number, string>();
  clients.forEach((client) => {
    const clientId = toPositiveIntegerId(client.id);
    if (clientId !== null) clientNames.set(clientId, client.displayName);
  });

  return entries.flatMap((entry) => {
    const userId = toPositiveIntegerId(entry.userId);
    if (entry.verified || userId === null || !clientNames.has(userId)) return [];

    return [{
      id: entry.id,
      clientName: clientNames.get(userId) || 'Client',
      mealTitle: titleCase(entry.mealType || 'meal'),
      description: entry.description?.trim() || 'Macro estimate',
      macroLine: `${rounded(entry.calories)} cal - ${rounded(entry.protein)}g protein - ${rounded(entry.fiber)}g fiber`,
      sourceLabel: sourceLabel(entry.source),
      reviewReasonLabel: formatMappedLabel('Reason', entry.reviewReason, REVIEW_REASON_LABELS, 'Estimate review'),
      reviewStatusLabel: formatMappedLabel('Status', entry.reviewStatus, REVIEW_STATUS_LABELS, 'Pending review'),
      servingLabel: servingLabel(entry),
      confidenceLabel: confidenceLabel(entry.confidenceScore),
      reconciliationLabel: reconciliationLabel(entry),
    }];
  });
};
