export const MAX_ROSTER_TRIAGE_CLIENTS = 12;

/** Phase 4A: default visible rows; "Show all N" expands (HY3 §0.4 truncation fix). */
export const ROSTER_TRIAGE_COLLAPSED_COUNT = 4;

export interface NutritionRosterClient {
  id: number;
  displayName: string;
}

export interface RosterTriageFlags {
  noMealsToday?: boolean;
  sodiumAttention?: boolean;
  sugarAttention?: boolean;
  sparseWeekly?: boolean;
}

export interface RosterTriageRecord {
  userId: number;
  mealCountToday: number;
  weeklyLoggedDays: number;
  totalProtein: number;
  flags?: RosterTriageFlags;
}

export interface NutritionRosterRow {
  clientId: number;
  clientName: string;
  statusLabel: string;
  weeklyLabel: string;
  proteinLabel: string;
  flags: string[];
  attentionScore: number;
}

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

export const selectRosterClientIds = (clients: NutritionRosterClient[]): number[] =>
  clients
    .map((client) => toPositiveIntegerId(client.id))
    .filter((id): id is number => id !== null)
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .slice(0, MAX_ROSTER_TRIAGE_CLIENTS);

const decimalNumberPattern = /^\d+(?:\.\d+)?$/;

const toNonNegativeNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!decimalNumberPattern.test(trimmed)) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const toWholeCount = (value: unknown, max = Number.MAX_SAFE_INTEGER): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return 0;
  return Math.min(value, max);
};

const formatMeals = (mealCount: number): string => {
  if (mealCount <= 0) return 'No meals today';
  if (mealCount === 1) return '1 meal today';
  return `${mealCount} meals today`;
};

const buildFlagLabels = (flags?: RosterTriageFlags): string[] => {
  if (!flags) return ['No nutrition data'];
  const labels: string[] = [];
  if (flags.noMealsToday) labels.push('No meals today');
  if (flags.sodiumAttention) labels.push('Sodium attention');
  if (flags.sugarAttention) labels.push('Sugar attention');
  if (flags.sparseWeekly) labels.push('Sparse weekly logging');
  return labels.length > 0 ? labels : ['No attention flags'];
};

const attentionScoreFor = (labels: string[]): number =>
  labels.filter((label) => label !== 'No attention flags').length;

export const buildNutritionRosterRows = (
  clients: NutritionRosterClient[],
  records: RosterTriageRecord[]
): NutritionRosterRow[] => {
  const byUserId = new Map<number, RosterTriageRecord>();
  records.forEach((record) => {
    const userId = toPositiveIntegerId(record.userId);
    if (userId !== null) byUserId.set(userId, record);
  });

  return clients.flatMap((client) => {
    const clientId = toPositiveIntegerId(client.id);
    if (clientId === null) return [];

    const record = byUserId.get(clientId);
    const mealCount = toWholeCount(record?.mealCountToday);
    const weeklyLoggedDays = toWholeCount(record?.weeklyLoggedDays, 7);
    const protein = Math.round(toNonNegativeNumber(record?.totalProtein));
    const flags = buildFlagLabels(record?.flags);

    return [{
      clientId,
      clientName: client.displayName,
      statusLabel: record ? formatMeals(mealCount) : 'No nutrition data',
      weeklyLabel: `${weeklyLoggedDays}/7 days`,
      proteinLabel: `${Math.max(0, protein)}g protein`,
      flags,
      attentionScore: attentionScoreFor(flags),
    }];
  }).sort((a, b) => b.attentionScore - a.attentionScore || a.clientName.localeCompare(b.clientName));
};

/** Visible slice for the panel: 4 rows collapsed, everything when expanded. */
export const selectVisibleRosterRows = (
  rows: NutritionRosterRow[],
  expanded: boolean,
): NutritionRosterRow[] => (expanded ? rows : rows.slice(0, ROSTER_TRIAGE_COLLAPSED_COUNT));
