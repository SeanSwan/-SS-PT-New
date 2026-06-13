import type { ClientOption } from './clients-team/ClientSelectorDropdown';

export type ClientHubIntent = 'log_workout' | 'plan_next' | null;
export type ClientDetailTab = 'training' | 'progress' | 'biometrics' | 'overview' | 'settings';
export type ClientTrainingSection = 'architect' | 'plans' | 'logger' | 'import' | 'plaud' | 'copilot' | 'history';
export type ClientDetailSearchParams = {
  clientId: string;
  tab: ClientDetailTab;
  trainingSection?: string;
  loadPlan?: 'today';
};

interface ClipboardWriter {
  writeText: (value: string) => Promise<void>;
}

export interface ClientScheduleWorkoutLoggerContext {
  scheduledSessionCreditHint: number | null;
  scheduledSessionDate: string | null;
  scheduledSessionId: string;
}

const CLIENT_DETAIL_TABS = new Set<ClientDetailTab>([
  'training',
  'progress',
  'biometrics',
  'overview',
  'settings',
]);

const CLIENT_TRAINING_SECTIONS = new Set<ClientTrainingSection>([
  'architect',
  'plans',
  'logger',
  'import',
  'plaud',
  'copilot',
  'history',
]);

export const getClientHubIntent = (searchParams: URLSearchParams): ClientHubIntent => {
  const intent = searchParams.get('intent');
  return intent === 'log_workout' || intent === 'plan_next' ? intent : null;
};

export const getClientDetailTabFromSearchParams = (
  searchParams: URLSearchParams,
): ClientDetailTab | null => {
  const tab = searchParams.get('tab');
  return CLIENT_DETAIL_TABS.has(tab as ClientDetailTab) ? tab as ClientDetailTab : null;
};

export const getClientTrainingSectionFromSearchParams = (
  searchParams: URLSearchParams,
): ClientTrainingSection | null => {
  if (searchParams.get('tab') !== 'training') return null;

  const section = searchParams.get('trainingSection');
  return CLIENT_TRAINING_SECTIONS.has(section as ClientTrainingSection)
    ? section as ClientTrainingSection
    : null;
};

export const getClientIdFromSearchParams = (searchParams: URLSearchParams): number | null => {
  const rawClientId = searchParams.get('clientId')?.trim();
  if (!rawClientId || !/^[1-9]\d*$/.test(rawClientId)) return null;

  const parsedClientId = Number(rawClientId);
  return Number.isSafeInteger(parsedClientId) ? parsedClientId : null;
};

const isPositiveIntegerString = (value: string | null): value is string =>
  Boolean(value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)));

const parseNonNegativeIntegerString = (value: string | null): number | null => {
  const trimmed = value?.trim();
  if (!trimmed || !/^(0|[1-9]\d*)$/.test(trimmed)) return null;

  const parsedValue = Number(trimmed);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
};

const safeRouteText = (value: string | null): string | null => {
  const trimmed = value?.trim();
  if (!trimmed || /[\r\n\t\\]/.test(trimmed)) return null;
  return trimmed;
};

const safeRouteDateText = (value: string | null): string | null => {
  const safeText = safeRouteText(value);
  if (!safeText || Number.isNaN(new Date(safeText).getTime())) return null;
  return safeText;
};

export const getClientScheduleWorkoutLoggerContextFromSearchParams = (
  searchParams: URLSearchParams,
): ClientScheduleWorkoutLoggerContext | null => {
  if (getClientTrainingSectionFromSearchParams(searchParams) !== 'logger') return null;

  const scheduledSessionId = searchParams.get('sessionId');
  if (!isPositiveIntegerString(scheduledSessionId)) return null;

  return {
    scheduledSessionId,
    scheduledSessionDate: safeRouteDateText(searchParams.get('sessionDate')),
    scheduledSessionCreditHint: parseNonNegativeIntegerString(searchParams.get('sessionCredits')),
  };
};

const trainingSectionParam = (
  tab: ClientDetailTab,
  trainingSection?: string,
): Partial<ClientDetailSearchParams> => (
  tab === 'training' && trainingSection ? { trainingSection } : {}
);

const loggerLoadPlanParam = (
  tab: ClientDetailTab,
  trainingSection?: string,
): Partial<ClientDetailSearchParams> => (
  tab === 'training' && trainingSection === 'logger' ? { loadPlan: 'today' } : {}
);

export const buildClientDetailSearchParams = (
  client: Pick<ClientOption, 'id'>,
  tab: ClientDetailTab,
  trainingSection?: string,
): ClientDetailSearchParams => ({
  clientId: String(client.id),
  tab,
  ...trainingSectionParam(tab, trainingSection),
  ...loggerLoadPlanParam(tab, trainingSection),
});

export const getBrowserClipboard = (): ClipboardWriter | null => {
  if (typeof navigator === 'undefined') return null;
  return navigator.clipboard || null;
};

export const copyTextToClipboard = async (
  clipboard: ClipboardWriter | null,
  value: string,
): Promise<boolean> => {
  if (!clipboard?.writeText) return false;

  try {
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};

export const buildCreationHandoffCopyToast = (
  label: string,
  copied: boolean,
): { title: string; description: string; variant: 'default' | 'destructive' } => ({
  title: copied ? `${label} copied` : `${label} not copied`,
  description: copied
    ? 'Send it through your normal client handoff channel.'
    : 'Select the text and copy it manually.',
  variant: copied ? 'default' : 'destructive',
});

const clampPercent = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const explicitOnboardingPct = (client: ClientOption): number | undefined => (
  [
    clampPercent(client.onboardingPct),
    clampPercent(client.onboardingCompletionPercentage),
    clampPercent(client.completionPercentage),
  ].find((value) => value !== undefined)
);

const completedOnboardingPct = (client: ClientOption): number | undefined => {
  if (client.onboardingComplete) return 100;
  if (client.isOnboardingComplete) return 100;
  return undefined;
};

export const getClientOnboardingPct = (client: ClientOption | null): number | undefined => {
  if (!client) return undefined;
  return explicitOnboardingPct(client) ?? completedOnboardingPct(client);
};
