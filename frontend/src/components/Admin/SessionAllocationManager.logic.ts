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

export const escapeCsvCell = (value: string | number | undefined): string => {
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

export const buildClientWithSessionSummary = (
  client: SessionClientResponse,
  summary: SessionSummary | null | undefined = emptySummary(client.id),
): Client => ({
  id: client.id,
  firstName: client.firstName,
  lastName: client.lastName,
  email: client.email,
  availableSessions: client.availableSessions || 0,
  clientSource: client.clientSource || 'swanstudios',
  totalSessionsPurchased: summary?.total ?? 0,
  sessionsUsed: summary?.completed ?? 0,
  lastSessionDate: undefined,
  createdAt: client.createdAt || new Date().toISOString(),
});

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
