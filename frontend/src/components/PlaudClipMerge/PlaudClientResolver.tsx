/**
 * PlaudClientResolver.tsx
 * =======================
 *
 * WHAT THIS FILE DOES:
 * Provides the reviewed client-selection lane for PLAUD merge intake. It
 * replaces the old raw numeric Client ID input with active-client search,
 * selected-client context, and the existing new-client creation flow.
 *
 * HOW IT FITS IN THE APP:
 * PlaudClipMergePanel owns merge submission, but this resolver owns the
 * human-confirmed client choice passed into that submission. Client pages can
 * seed an initial client, while the canonical PLAUD workspace can start empty.
 *
 * KEY DECISION:
 * This is deterministic UI selection only. It does not let Swan Coach or any
 * transcript parser choose the database client row without trainer review.
 */
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAdminClientService,
  type AdminClient,
  type CreateClientRequest,
} from '../../services/adminClientService';
import { normalizeClientSource } from '../../utils/clientSource';
import {
  ResolverActions,
  ResolverButton,
  ResolverHeader,
  ResolverStatus,
  ResolverSub,
  ResolverTitle,
  ResolverWrap,
  ResultButton,
  ResultList,
  ResultMeta,
  ResultName,
  SearchInput,
  SearchStack,
  SelectedClientCard,
  SelectedLabel,
  SelectedMeta,
  SelectedName,
} from './PlaudClientResolver.styles';

const CreateClientModal = React.lazy(
  () => import('../DashBoard/Pages/admin-clients/CreateClientModal'),
);

export interface PlaudResolvedClient {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName: string;
  email?: string;
  clientSource?: string;
}

export interface PlaudClientResolverProps {
  initialClientId?: number;
  initialClientName?: string;
  disabled?: boolean;
  locked?: boolean;
  onClientResolved: (client: PlaudResolvedClient | null) => void;
}

function clientName(client: Partial<AdminClient> & { name?: string; fullName?: string; id?: number }): string {
  const full = client.fullName || [client.firstName, client.lastName].filter(Boolean).join(' ');
  return full || client.name || (client.id ? `Client #${client.id}` : 'Unknown client');
}

function normalizeClient(client: Partial<AdminClient> & { id?: number | string; name?: string; fullName?: string }): PlaudResolvedClient | null {
  const id = Number(client.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return {
    id,
    firstName: client.firstName,
    lastName: client.lastName,
    fullName: clientName({ ...client, id }),
    email: client.email,
    clientSource: client.clientSource,
  };
}

export function PlaudClientResolver({
  initialClientId,
  initialClientName,
  disabled = false,
  locked = false,
  onClientResolved,
}: PlaudClientResolverProps): JSX.Element {
  const adminClient = useMemo(() => createAdminClientService(), []);
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<PlaudResolvedClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<PlaudResolvedClient | null>(() => (
    initialClientId
      ? { id: initialClientId, fullName: initialClientName || `Client #${initialClientId}` }
      : null
  ));
  const [isChanging, setIsChanging] = useState(!initialClientId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const next = initialClientId
      ? { id: initialClientId, fullName: initialClientName || `Client #${initialClientId}` }
      : null;
    setSelectedClient((prev) => {
      if (prev?.id === next?.id && prev?.fullName === next?.fullName) return prev;
      return next;
    });
    setIsChanging(!next);
  }, [initialClientId, initialClientName]);

  useEffect(() => {
    onClientResolved(selectedClient);
  }, [onClientResolved, selectedClient]);

  const loadClients = useCallback(async (search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminClient.getClients({
        page: 1,
        limit: 25,
        status: 'active',
        search: search.trim() || undefined,
      });
      const normalized = (result.clients || [])
        .map((client: AdminClient) => normalizeClient(client))
        .filter(Boolean) as PlaudResolvedClient[];
      setClients(normalized);
      if (selectedClient && selectedClient.fullName.startsWith('Client #')) {
        const match = normalized.find((client) => client.id === selectedClient.id);
        if (match) setSelectedClient(match);
      }
    } catch {
      setError('Client list unavailable. Retry or create a client first.');
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  }, [adminClient, selectedClient]);

  useEffect(() => {
    if (!isChanging || disabled) return undefined;
    const timer = window.setTimeout(() => {
      loadClients(query);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [disabled, isChanging, loadClients, query]);

  const selectClient = useCallback((client: PlaudResolvedClient) => {
    setSelectedClient(client);
    setIsChanging(false);
    setQuery('');
  }, []);

  const handleCreateClient = useCallback(async (data: CreateClientRequest) => {
    const normalizedClientSource = normalizeClientSource(data.clientSource);
    const normalizedData = {
      ...data,
      clientSource: normalizedClientSource,
    };
    const isExternal = normalizedClientSource !== 'swanstudios';
    const response = isExternal
      ? await adminClient.createExternalClient(normalizedData)
      : await adminClient.createClient(normalizedData);
    if (!response?.success) {
      throw new Error(response?.message || 'Failed to create client');
    }
    const createdFromResponse = normalizeClient(response.data?.client || response.client || {});
    if (createdFromResponse) {
      selectClient(createdFromResponse);
      setIsCreateOpen(false);
      return;
    }
    const refreshed = await adminClient.getClients({
      page: 1,
      limit: 10,
      search: data.email || `${data.firstName} ${data.lastName}`,
    });
    const created = (refreshed.clients || [])
      .map((client: AdminClient) => normalizeClient(client))
      .find(Boolean) as PlaudResolvedClient | undefined;
    if (created) selectClient(created);
    setIsCreateOpen(false);
  }, [adminClient, selectClient]);

  return (
    <ResolverWrap data-testid="plaud-client-resolver">
      <ResolverHeader>
        <ResolverTitle>Client resolver</ResolverTitle>
        <ResolverSub>
          Pick the client before merging. The current client is preselected when available,
          but you can change it before Swan Coach logs the workout.
        </ResolverSub>
      </ResolverHeader>

      {selectedClient ? (
        <SelectedClientCard data-testid="plaud-resolved-client">
          <div>
            <SelectedLabel>Resolved client</SelectedLabel>
            <SelectedName>{selectedClient.fullName}</SelectedName>
            <SelectedMeta>Client #{selectedClient.id}</SelectedMeta>
          </div>
          <ResolverActions>
            <ResolverButton
              type="button"
              onClick={() => setIsChanging(true)}
              disabled={disabled || locked}
            >
              Change client
            </ResolverButton>
          </ResolverActions>
        </SelectedClientCard>
      ) : null}

      {isChanging ? (
        <SearchStack>
          <SearchInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search active clients by name or email"
            aria-label="Search clients"
            disabled={disabled}
          />
          <ResolverActions>
            <ResolverButton type="button" $primary onClick={() => setIsCreateOpen(true)} disabled={disabled}>
              New client
            </ResolverButton>
            {selectedClient ? (
              <ResolverButton type="button" onClick={() => setIsChanging(false)} disabled={disabled}>
                Keep selected
              </ResolverButton>
            ) : null}
          </ResolverActions>
          {isLoading ? <ResolverStatus>Loading clients...</ResolverStatus> : null}
          {error ? <ResolverStatus $error role="alert">{error}</ResolverStatus> : null}
          {!isLoading && !error && clients.length === 0 ? (
            <ResolverStatus>No matching active clients. Create a new client or adjust the search.</ResolverStatus>
          ) : null}
          <ResultList>
            {clients.map((client) => (
              <ResultButton key={client.id} type="button" onClick={() => selectClient(client)} disabled={disabled}>
                <ResultName>{client.fullName}</ResultName>
                <ResultMeta>
                  Client #{client.id}{client.clientSource ? ` - ${client.clientSource}` : ''}
                </ResultMeta>
              </ResultButton>
            ))}
          </ResultList>
        </SearchStack>
      ) : null}

      {isCreateOpen ? (
        <Suspense fallback={<ResolverStatus>Loading client form...</ResolverStatus>}>
          <CreateClientModal
            open={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onSubmit={handleCreateClient}
          />
        </Suspense>
      ) : null}
    </ResolverWrap>
  );
}

export default PlaudClientResolver;
