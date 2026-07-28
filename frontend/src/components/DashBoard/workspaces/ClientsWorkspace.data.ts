/**
 * PURPOSE: Data helpers for the canonical Client Hub workspace.
 * Keeps API response normalization and URL-selected-client resolution out of
 * the route component so Client Hub rendering stays focused on workflow state.
 */

import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import type { AxiosRequestConfig } from 'axios';
import { mapAdminClientToClientOption } from './clients-team/clientOptionMappers';
import type { ClientDetailTab } from './ClientsWorkspace.logic';

interface ClientHubAxios {
  get: (url: string, config?: AxiosRequestConfig) => Promise<{ data?: unknown }>;
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
