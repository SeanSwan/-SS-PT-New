import type { ClientOption } from './clients-team/ClientSelectorDropdown';

export type ClientHubIntent = 'log_workout' | 'plan_next' | null;

export const getClientHubIntent = (searchParams: URLSearchParams): ClientHubIntent => {
  const intent = searchParams.get('intent');
  return intent === 'log_workout' || intent === 'plan_next' ? intent : null;
};

export const getClientIdFromSearchParams = (searchParams: URLSearchParams): number | null => {
  const rawClientId = searchParams.get('clientId')?.trim();
  if (!rawClientId || !/^[1-9]\d*$/.test(rawClientId)) return null;

  const parsedClientId = Number(rawClientId);
  return Number.isSafeInteger(parsedClientId) ? parsedClientId : null;
};

const clampPercent = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

export const getClientOnboardingPct = (client: ClientOption | null): number | undefined => {
  if (!client) return undefined;
  const explicitPct =
    clampPercent(client.onboardingPct) ??
    clampPercent(client.onboardingCompletionPercentage) ??
    clampPercent(client.completionPercentage);

  if (explicitPct !== undefined) return explicitPct;
  if (client.onboardingComplete || client.isOnboardingComplete) return 100;

  return undefined;
};
