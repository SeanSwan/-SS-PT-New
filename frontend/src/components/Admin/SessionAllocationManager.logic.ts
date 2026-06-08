import { getClientSessionSignal, isNonDeductingClientSource } from '../DashBoard/workspaces/clients-team/clientSessionSignal';
import type {
  Client,
  SessionAllocationStats,
  SessionBadgeTone,
  SessionClientResponse,
  SessionSummary,
} from './SessionAllocationManager.types';

export const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const MANUAL_SESSION_ALLOCATION_MIN = 1;
export const MANUAL_SESSION_ALLOCATION_MAX = 50;
const FREE_TRACKING_SESSION_ALLOCATION_BLOCK_REASON =
  'Manual paid-session allocation is disabled for free-tracking clients.';

export const normalizeManualSessionCount = (value: number | string | null | undefined): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return MANUAL_SESSION_ALLOCATION_MIN;

  const integerValue = Math.floor(parsed);
  return Math.min(
    MANUAL_SESSION_ALLOCATION_MAX,
    Math.max(MANUAL_SESSION_ALLOCATION_MIN, integerValue),
  );
};

const numberOrZero = (value: number | null | undefined): number =>
  Number.isFinite(value) ? Number(value) : 0;

const textOrFallback = (value: string | null | undefined, fallback: string): string =>
  value || fallback;

const getCurrentIsoTimestamp = (): string => new Date().toISOString();

const escapeCsvCell = (value: string | number | undefined): string => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const emptySummary = (clientId: number): SessionSummary => ({
  userId: clientId,
  available: 0,
  scheduled: 0,
  completed: 0,
  cancelled: 0,
  total: 0,
});

const resolveSummary = (
  clientId: number,
  summary: SessionSummary | null | undefined,
): SessionSummary => summary ?? emptySummary(clientId);

export const buildClientWithSessionSummary = (
  client: SessionClientResponse,
  summary: SessionSummary | null | undefined,
): Client => {
  const resolvedSummary = resolveSummary(client.id, summary);

  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    availableSessions: numberOrZero(client.availableSessions),
    clientSource: textOrFallback(client.clientSource, 'swanstudios'),
    totalSessionsPurchased: numberOrZero(resolvedSummary.total),
    sessionsUsed: numberOrZero(resolvedSummary.completed),
    lastSessionDate: undefined,
    createdAt: textOrFallback(client.createdAt, getCurrentIsoTimestamp()),
  };
};

export interface ManualSessionAllocationRequest {
  userId: number;
  sessionCount: number;
  reason: string;
  clientDisplayName: string;
}

export interface ManualSessionAllocationDecision {
  blockedReason: string | null;
  request: ManualSessionAllocationRequest | null;
}

export const getManualSessionAllocationBlockReason = (
  client: Pick<Client, 'clientSource'> | null | undefined,
): string | null => (
  client && isNonDeductingClientSource(client.clientSource)
    ? FREE_TRACKING_SESSION_ALLOCATION_BLOCK_REASON
    : null
);

export const buildManualSessionAllocationRequest = (
  client: Client | null,
  sessionCount: number,
  reason: string,
): ManualSessionAllocationDecision => {
  const blockedReason = getManualSessionAllocationBlockReason(client);
  const request = client && !blockedReason
    ? {
      userId: client.id,
      sessionCount: normalizeManualSessionCount(sessionCount),
      reason: textOrFallback(reason, 'Admin added sessions'),
      clientDisplayName: `${client.firstName} ${client.lastName}`,
    }
    : null;

  return { blockedReason, request };
};

export const filterSessionClients = (clients: Client[], searchQuery: string): Client[] => {
  const searchTerm = searchQuery.toLowerCase();
  return clients.filter((client) => (
    client.firstName.toLowerCase().includes(searchTerm) ||
    client.lastName.toLowerCase().includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm)
  ));
};

export const getSessionBadgeType = (client: Client): SessionBadgeTone => {
  if (isNonDeductingClientSource(client.clientSource)) return 'neutral';
  if (client.availableSessions === 0) return 'none';
  if (client.availableSessions <= 3) return 'low';
  return 'good';
};

export const getSessionBadgeLabel = (client: Client): string => {
  if (isNonDeductingClientSource(client.clientSource)) return 'tracked';
  if (client.availableSessions === 0) return 'No Sessions';
  if (client.availableSessions <= 3) return 'Low';
  return 'Good';
};

export const calculateSessionAllocationStats = (clients: Client[]): SessionAllocationStats => ({
  totalClients: clients.length,
  totalAvailableSessions: clients.reduce(
    (sum, client) => sum + (isNonDeductingClientSource(client.clientSource) ? 0 : client.availableSessions),
    0,
  ),
  totalCompletedSessions: clients.reduce((sum, client) => sum + client.sessionsUsed, 0),
  clientsNeedingSessions: clients.filter(
    (client) => !isNonDeductingClientSource(client.clientSource) && client.availableSessions === 0,
  ).length,
});

export const buildSessionAllocationCsv = (clients: Client[]): string => {
  const header = ['Client', 'Email', 'Available', 'Total Purchased', 'Completed', 'Status'];
  const rows = clients.map((client) => {
    const sessionSignal = getClientSessionSignal(client);
    return [
      `${client.firstName} ${client.lastName}`,
      client.email,
      sessionSignal.label,
      client.totalSessionsPurchased,
      client.sessionsUsed,
      getSessionBadgeLabel(client),
    ];
  });

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n');
};
