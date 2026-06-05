/**
 * longHorizonGoals
 *
 * Purpose: Normalizes client profile goal data for the Swan Coach long-horizon
 * planning workflow without tying parser logic to the render component.
 */

export interface ClientGoals {
  primaryGoal: string;
  secondaryGoals: string[];
  constraints: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const toStringArray = (value: unknown): string[] => (
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
);

const parseMasterPromptJson = (raw: unknown): Record<string, unknown> | null => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  if (isRecord(raw)) return raw;
  return null;
};

const normalizeGoals = (rawGoals: Record<string, unknown>): ClientGoals => {
  const primaryRaw = rawGoals.primary || rawGoals.primaryGoal;
  const secondaryGoalsRaw = rawGoals.secondary || rawGoals.secondaryGoals;

  return {
    primaryGoal: typeof primaryRaw === 'string' && primaryRaw.trim()
      ? primaryRaw
      : 'general_fitness',
    secondaryGoals: toStringArray(secondaryGoalsRaw),
    constraints: toStringArray(rawGoals.constraints),
  };
};

export const getClientGoalsFromDetails = (detailsResp: unknown): ClientGoals | null => {
  const root = isRecord(detailsResp) ? detailsResp : {};
  const data = isRecord(root.data) ? root.data : {};
  const client = isRecord(data.client) ? data.client : isRecord(root.client) ? root.client : null;
  const masterPrompt = parseMasterPromptJson(client?.masterPromptJson);
  const masterClient = isRecord(masterPrompt?.client) ? masterPrompt.client : null;
  const goals = isRecord(masterClient?.goals)
    ? masterClient.goals
    : isRecord(masterPrompt?.goals)
      ? masterPrompt.goals
      : null;
  if (!goals) return null;
  return normalizeGoals(goals);
};
