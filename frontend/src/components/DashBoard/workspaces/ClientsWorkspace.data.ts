/**
 * PURPOSE: Data helpers for the canonical Client Hub workspace.
 * Keeps API response normalization and URL-selected-client resolution out of
 * the route component so Client Hub rendering stays focused on workflow state.
 */

import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import type { ClientHubAudience } from './clients-team/clientHubAudience';
import { mapAdminClientToClientOption } from './clients-team/clientOptionMappers';
import type { ClientDetailTab } from './ClientsWorkspace.logic';

interface ClientHubAxios {
  get: (url: string, config?: unknown) => Promise<{ data?: unknown }>;
}

type ClientDetailLoader = (clientId: number) => Promise<ClientOption | null>;

export interface InitialClientSelection {
  client: ClientOption;
  detailTab: ClientDetailTab;
}

interface InitialClientSelectionInput {
  mappedClients: ClientOption[];
  urlClientId: number | null;
  urlDetailTab: ClientDetailTab | null;
  loadClientById: ClientDetailLoader;
}

interface AdminClientsListResponse {
  success?: boolean;
  data?: {
    clients?: unknown;
  };
}

interface AdminClientDetailResponse {
  success?: boolean;
  data?: {
    client?: unknown;
  };
}

const warnClientHubFetch = (message: string, error: unknown): void => {
  console.warn(message, error);
};

const isClientOption = (client: ClientOption | null): client is ClientOption =>
  client !== null;

const isSuccessfulClientsList = (
  response: AdminClientsListResponse | null | undefined
): response is AdminClientsListResponse =>
  response?.success === true;

const getAdminClientRows = (data: unknown): unknown[] => {
  const response = data as AdminClientsListResponse | null | undefined;
  if (!isSuccessfulClientsList(response)) return [];

  return Array.isArray(response.data?.clients) ? response.data.clients : [];
};

const mapAdminClientsListResponse = (data: unknown): ClientOption[] =>
  getAdminClientRows(data)
    .map(mapAdminClientToClientOption)
    .filter(isClientOption);

const mapAdminClientDetailResponse = (data: unknown): ClientOption | null => {
  const response = data as AdminClientDetailResponse | null | undefined;
  return response?.success
    ? mapAdminClientToClientOption(response.data?.client)
    : null;
};

export const fetchClientHubAdminClients = async (
  authAxios: ClientHubAxios | null | undefined
): Promise<ClientOption[]> => {
  if (!authAxios) return [];

  try {
    const response = await authAxios.get('/api/admin/clients', {
      params: { limit: 100 },
    });
    return mapAdminClientsListResponse(response.data);
  } catch (error) {
    warnClientHubFetch('Failed to fetch clients:', error);
    return [];
  }
};

const getTrainerAssignmentRows = (data: unknown): unknown[] => {
  const response = data as {
    assignments?: unknown;
    data?: { assignments?: unknown } | unknown;
  } | null | undefined;
  if (Array.isArray(response?.assignments)) return response.assignments;
  if (Array.isArray(response?.data)) return response.data;
  const nested = (response?.data as { assignments?: unknown } | undefined)?.assignments;
  return Array.isArray(nested) ? nested : [];
};

const isInactiveAssignment = (row: unknown): boolean => {
  const status = (row as { status?: unknown } | null | undefined)?.status;
  return typeof status === 'string' && status !== 'active';
};

const mapTrainerAssignmentsResponse = (data: unknown): ClientOption[] =>
  getTrainerAssignmentRows(data)
    .filter((row) => !isInactiveAssignment(row))
    .map((row) => {
      const assignment = row as { client?: unknown; Client?: unknown } | null | undefined;
      return mapAdminClientToClientOption(assignment?.client ?? assignment?.Client ?? row);
    })
    .filter(isClientOption);

/** Assigned-clients-only roster for the trainer audience. */
export const fetchClientHubTrainerClients = async (
  authAxios: ClientHubAxios | null | undefined,
  trainerUserId: number | string | null | undefined
): Promise<ClientOption[]> => {
  if (!authAxios || !trainerUserId) return [];

  try {
    const response = await authAxios.get(
      `/api/client-trainer-assignments/trainer/${trainerUserId}`
    );
    return mapTrainerAssignmentsResponse(response.data);
  } catch (error) {
    warnClientHubFetch('Failed to fetch assigned clients:', error);
    return [];
  }
};

export const fetchClientHubClients = (
  authAxios: ClientHubAxios | null | undefined,
  audience: ClientHubAudience,
  trainerUserId?: number | string | null
): Promise<ClientOption[]> => (
  audience === 'trainer'
    ? fetchClientHubTrainerClients(authAxios, trainerUserId)
    : fetchClientHubAdminClients(authAxios)
);

/**
 * THROWING roster fetch for callers with a real error UI (useClientHubRoster).
 * The legacy fetchers above swallow failures into [] for fire-and-forget
 * consumers — which silently renders outages as "no clients"; this variant
 * lets the Client Hub banner tell the truth.
 */
export const fetchClientHubClientsStrict = async (
  authAxios: ClientHubAxios | null | undefined,
  audience: ClientHubAudience,
  trainerUserId?: number | string | null
): Promise<ClientOption[]> => {
  if (!authAxios || (audience === 'trainer' && !trainerUserId)) return [];
  if (audience === 'trainer') {
    const response = await authAxios.get(`/api/client-trainer-assignments/trainer/${trainerUserId}`);
    return mapTrainerAssignmentsResponse(response.data);
  }
  const response = await authAxios.get('/api/admin/clients', { params: { limit: 100 } });
  return mapAdminClientsListResponse(response.data);
};

/**
 * Trainer URL-selection loader: resolves ONLY within the assigned roster so a
 * deep link to an unassigned clientId lands nowhere instead of leaking data.
 */
export const fetchTrainerClientById = async (
  authAxios: ClientHubAxios | null | undefined,
  trainerUserId: number | string | null | undefined,
  clientId: number
): Promise<ClientOption | null> => {
  const roster = await fetchClientHubTrainerClients(authAxios, trainerUserId);
  return roster.find((candidate) => candidate.id === clientId) ?? null;
};

export const fetchAdminClientById = async (
  authAxios: ClientHubAxios | null | undefined,
  clientId: number
): Promise<ClientOption | null> => {
  if (!authAxios) return null;

  try {
    const response = await authAxios.get(`/api/admin/clients/${clientId}`);
    return mapAdminClientDetailResponse(response.data);
  } catch (error) {
    warnClientHubFetch('Failed to fetch client details:', error);
    return null;
  }
};

const findMappedClientById = (
  mappedClients: ClientOption[],
  clientId: number
): ClientOption | null =>
  mappedClients.find((candidate) => candidate.id === clientId) ?? null;

const getInitialSelectionClient = async ({
  mappedClients,
  urlClientId,
  loadClientById,
}: InitialClientSelectionInput): Promise<ClientOption | null> => {
  if (!urlClientId) return null;

  return findMappedClientById(mappedClients, urlClientId)
    ?? await loadClientById(urlClientId);
};

const toInitialClientSelection = (
  client: ClientOption | null,
  urlDetailTab: ClientDetailTab | null
): InitialClientSelection | null =>
  client ? { client, detailTab: urlDetailTab ?? 'training' } : null;

export const resolveInitialClientSelection = async ({
  mappedClients,
  urlClientId,
  urlDetailTab,
  loadClientById,
}: InitialClientSelectionInput): Promise<InitialClientSelection | null> => {
  const client = await getInitialSelectionClient({
    mappedClients,
    urlClientId,
    urlDetailTab,
    loadClientById,
  });
  return toInitialClientSelection(client, urlDetailTab);
};
