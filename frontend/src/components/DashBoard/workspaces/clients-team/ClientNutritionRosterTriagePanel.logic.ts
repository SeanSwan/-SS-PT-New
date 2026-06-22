export const MAX_ROSTER_TRIAGE_CLIENTS = 12;

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

export const selectRosterClientIds = (clients: NutritionRosterClient[]): number[] =>
  clients
    .map((client) => Number(client.id))
    .filter((id) => Number.isSafeInteger(id) && id > 0)
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
  const byUserId = new Map(records.map((record) => [Number(record.userId), record]));

  return clients.map((client) => {
    const record = byUserId.get(client.id);
    const mealCount = toNonNegativeNumber(record?.mealCountToday);
    const weeklyLoggedDays = toNonNegativeNumber(record?.weeklyLoggedDays);
    const protein = Math.round(toNonNegativeNumber(record?.totalProtein));
    const flags = buildFlagLabels(record?.flags);

    return {
      clientId: client.id,
      clientName: client.displayName,
      statusLabel: record ? formatMeals(mealCount) : 'No nutrition data',
      weeklyLabel: `${Math.max(0, weeklyLoggedDays)}/7 days`,
      proteinLabel: `${Math.max(0, protein)}g protein`,
      flags,
      attentionScore: attentionScoreFor(flags),
    };
  }).sort((a, b) => b.attentionScore - a.attentionScore || a.clientName.localeCompare(b.clientName));
};
