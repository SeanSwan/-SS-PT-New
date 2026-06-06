const UNSAFE_RETURN_TO_CHARACTERS = /[\r\n\t\\]/;
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

const isSafeDashboardReturnTo = (value: string): boolean =>
  [
    value.startsWith('/dashboard/'),
    !value.startsWith('//'),
    !UNSAFE_RETURN_TO_CHARACTERS.test(value),
  ].every(Boolean);

export const normalizeDashboardReturnTo = (raw: string | null): string | null =>
  raw && isSafeDashboardReturnTo(raw) ? raw : null;

const buildClientHubWorkoutCompleteReturnPath = (returnPath: string): string => {
  const [pathAndQuery, hash = ''] = returnPath.split('#');
  const [pathname, query = ''] = pathAndQuery.split('?');

  if (pathname !== '/dashboard/admin/client-management') return returnPath;

  const params = new URLSearchParams(query);
  params.set('tab', 'training');
  params.set('trainingSection', 'history');

  const search = params.toString();
  return `${pathname}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`;
};

const buildClientHubEmbeddedLoggerPath = (clientId: number): string => {
  const params = new URLSearchParams({
    clientId: String(clientId),
    tab: 'training',
    trainingSection: 'logger',
    loadPlan: 'today',
  });

  return `/dashboard/admin/client-management?${params.toString()}`;
};

const ADMIN_CLIENT_HUB_PATH = '/dashboard/admin/client-management';
const TRAINER_CLIENTS_PATH = '/dashboard/trainer/clients';
const SOURCE_RETURN_LABELS: Record<string, string> = {
  'clients-team': 'Back to Client Hub',
  'master-schedule': 'Back to Schedule',
};

const getDefaultBackLabel = (isAdmin: boolean): string =>
  isAdmin ? 'Back to Client Hub' : 'Back to My Clients';

const getNoClientSelectedMessage = (isAdmin: boolean): string =>
  isAdmin
    ? 'Please select a client from Client Hub.'
    : 'Please select a client from My Clients view.';

const getBackToClientsPath = (isAdmin: boolean): string =>
  isAdmin ? ADMIN_CLIENT_HUB_PATH : TRAINER_CLIENTS_PATH;

const getSourceReturnLabel = (
  requestedReturnTo: string | null,
  source: string | null
): string | undefined =>
  requestedReturnTo ? SOURCE_RETURN_LABELS[source ?? ''] : undefined;

const isClientHubRedirectSource = (source: string | null): boolean =>
  source === null || source === 'clients-team';

const resolveClientHubRedirectPath = (
  isAdmin: boolean,
  shouldUseClientHubLogger: boolean,
  routeClientId: number | null,
  scheduledSessionId: string | null
): string | null => {
  const shouldRedirect = [
    isAdmin,
    shouldUseClientHubLogger,
    Boolean(routeClientId),
    !scheduledSessionId,
  ].every(Boolean);

  return shouldRedirect && routeClientId
    ? buildClientHubEmbeddedLoggerPath(routeClientId)
    : null;
};

export interface LoggerRouteContextInput {
  requestedReturnTo: string | null;
  routeClientId: number | null;
  scheduledSessionId: string | null;
  source: string | null;
  userRole: string | undefined;
}

export interface LoggerRouteContext {
  backToClientsLabel: string;
  backToClientsPath: string;
  clientHubRedirectPath: string | null;
  isClientHubOrigin: boolean;
  noClientSelectedMessage: string;
  workflowReturnPath: string;
}

export const buildLoggerRouteContext = ({
  requestedReturnTo,
  routeClientId,
  scheduledSessionId,
  source,
  userRole,
}: LoggerRouteContextInput): LoggerRouteContext => {
  const isAdmin = userRole === 'admin';
  const isClientHubOrigin = source === 'clients-team';
  const backToClientsPath = getBackToClientsPath(isAdmin);

  return {
    backToClientsLabel: getSourceReturnLabel(requestedReturnTo, source) ?? getDefaultBackLabel(isAdmin),
    backToClientsPath,
    clientHubRedirectPath: resolveClientHubRedirectPath(
      isAdmin,
      isClientHubRedirectSource(source),
      routeClientId,
      scheduledSessionId
    ),
    isClientHubOrigin,
    noClientSelectedMessage: getNoClientSelectedMessage(isAdmin),
    workflowReturnPath: requestedReturnTo ?? backToClientsPath,
  };
};

const parsePositiveLoggerNumber = (value: number): number | null =>
  Number.isSafeInteger(value) && value > 0 ? value : null;

const parsePositiveLoggerString = (value: string | null | undefined): number | null => {
  const trimmedValue = value?.trim();
  if (!trimmedValue || !POSITIVE_INTEGER_PATTERN.test(trimmedValue)) {
    return null;
  }

  return parsePositiveLoggerNumber(Number(trimmedValue));
};

export const parseLoggerClientId = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number') {
    return parsePositiveLoggerNumber(value);
  }

  return parsePositiveLoggerString(value);
};

export const parseLoggerSessionId = (value: string | null | undefined): string | null => {
  const parsedValue = parseLoggerClientId(value);
  return parsedValue ? String(parsedValue) : null;
};

export interface LoggerClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  availableSessions: number;
  totalSessionsCompleted: number;
  lastSessionDate?: string;
  membershipLevel: 'basic' | 'premium' | 'elite';
}

interface LoggerCompletionInput {
  client: Pick<LoggerClient, 'firstName' | 'lastName'> | null | undefined;
  isClientHubOrigin: boolean;
  workflowReturnPath: string;
}

export interface LoggerCompletionResult {
  returnPath: string;
  navigationState: {
    workoutCompleted: true;
    clientName: string;
  };
  toast: {
    title: string;
    description: string;
    variant: 'default';
  };
}

const buildLoggerCompletionClientName = (
  client: LoggerCompletionInput['client']
): string => {
  const clientName = [
    client?.firstName.trim(),
    client?.lastName.trim(),
  ].filter(Boolean).join(' ');

  return clientName || 'Client';
};

export const buildLoggerCompletionResult = ({
  client,
  isClientHubOrigin,
  workflowReturnPath,
}: LoggerCompletionInput): LoggerCompletionResult => {
  const clientName = buildLoggerCompletionClientName(client);

  return {
    returnPath: isClientHubOrigin
      ? buildClientHubWorkoutCompleteReturnPath(workflowReturnPath)
      : workflowReturnPath,
    navigationState: {
      workoutCompleted: true,
      clientName,
    },
    toast: {
      title: 'Workout Completed!',
      description: `Workout logged for ${clientName}. Workout saved and progress updated.`,
      variant: 'default',
    },
  };
};

interface LoggerInfoClientPayload {
  id: string | number | null | undefined;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  availableSessions?: number | null;
}

interface LoggerInfoResponseData {
  success?: boolean;
  client?: LoggerInfoClientPayload | null;
}

const textOrFallback = (value: string | null | undefined, fallback: string): string =>
  value || fallback;

const optionalText = (value: string | null | undefined): string | undefined =>
  value || undefined;

const numberOrZero = (value: number | null | undefined): number =>
  value ?? 0;

const buildLoggerClient = (client: LoggerInfoClientPayload, responseClientId: number): LoggerClient => ({
  id: responseClientId,
  firstName: textOrFallback(client.firstName, 'Client'),
  lastName: textOrFallback(client.lastName, ''),
  email: textOrFallback(client.email, ''),
  phone: optionalText(client.phone),
  availableSessions: numberOrZero(client.availableSessions),
  totalSessionsCompleted: 0,
  lastSessionDate: undefined,
  membershipLevel: 'basic',
});

const getLoggerInfoClient = (
  data: LoggerInfoResponseData | null | undefined
): LoggerInfoClientPayload => {
  if (!data?.success || !data.client) {
    throw new Error('Client not found or not accessible');
  }

  return data.client;
};

const getExpectedResponseClientId = (
  client: LoggerInfoClientPayload,
  expectedClientId: number
): number => {
  const responseClientId = parseLoggerClientId(client.id);
  if (responseClientId !== expectedClientId) {
    throw new Error('Client identity mismatch');
  }

  return responseClientId;
};

export const toLoggerClientFromInfoResponse = (
  data: LoggerInfoResponseData | null | undefined,
  expectedClientId: number
): LoggerClient => {
  const client = getLoggerInfoClient(data);
  return buildLoggerClient(client, getExpectedResponseClientId(client, expectedClientId));
};
