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
}

export interface NutritionEstimateReviewRow {
  id: number | string;
  clientName: string;
  mealTitle: string;
  description: string;
  macroLine: string;
  sourceLabel: string;
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
    }];
  });
};
