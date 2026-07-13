/**
 * HOOK: useClientHubRoster
 * PARENT: ClientsWorkspace (extracted per Rule 4 — the container sits at
 * its 300-line cap).
 * PURPOSE: Owns the Client Hub roster state and its HONEST failure
 * contract: a failed fetch sets loadError (rendered as a role=alert
 * banner) and logs the cause — it never masquerades as "no clients".
 */
import { useCallback, useState } from 'react';
import { fetchClientHubClientsStrict } from './ClientsWorkspace.data';
import type { ClientHubAudience } from './clients-team/clientHubAudience';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';

type HubAxios = Parameters<typeof fetchClientHubClientsStrict>[0];

export function useClientHubRoster(
  authAxios: HubAxios,
  audience: ClientHubAudience,
  userId: Parameters<typeof fetchClientHubClientsStrict>[2],
) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadClients = useCallback(async (): Promise<ClientOption[]> => {
    setLoading(true);
    try {
      const mapped = await fetchClientHubClientsStrict(authAxios, audience, userId);
      setClients(mapped);
      setLoadError(false);
      return mapped;
    } catch (error) {
      console.error('[ClientHub] roster load failed', error);
      setLoadError(true);
      return [];
    } finally {
      setLoading(false);
    }
  }, [audience, authAxios, userId]);

  return { clients, setClients, loading, loadError, loadClients };
}

export default useClientHubRoster;
